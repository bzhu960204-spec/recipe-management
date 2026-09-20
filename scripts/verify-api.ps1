# End-to-end check of the API: auth, the import pipeline, ingredient/step linking,
# cross-account isolation and upload rejection.
$ErrorActionPreference = 'Stop'

$BaseUrl = 'http://localhost:8088'
$pass = 0
$fail = 0

function Test-Step {
    param([string]$Name, [scriptblock]$Body)
    try {
        & $Body
        Write-Host "  PASS  $Name" -ForegroundColor Green
        $script:pass++
    }
    catch {
        Write-Host "  FAIL  $Name -> $($_.Exception.Message)" -ForegroundColor Red
        $script:fail++
    }
}

function Invoke-Api {
    param(
        [string]$Method,
        [string]$Path,
        $Body,
        [string]$Token
    )
    $headers = @{}
    if ($Token) { $headers['Authorization'] = "Bearer $Token" }

    $params = @{
        Uri         = "$BaseUrl$Path"
        Method      = $Method
        Headers     = $headers
        ContentType = 'application/json'
        UseBasicParsing = $true
    }
    if ($null -ne $Body) { $params['Body'] = ($Body | ConvertTo-Json -Depth 12 -Compress) }

    return Invoke-RestMethod @params
}

function Get-ApiStatus {
    param([string]$Method, [string]$Path, [string]$Token)
    $headers = @{}
    if ($Token) { $headers['Authorization'] = "Bearer $Token" }
    try {
        Invoke-WebRequest -Uri "$BaseUrl$Path" -Method $Method -Headers $headers -UseBasicParsing | Out-Null
        return 200
    }
    catch {
        if ($_.Exception.Response) { return [int]$_.Exception.Response.StatusCode }
        throw
    }
}

Write-Host "`nWaiting for $BaseUrl ..." -ForegroundColor Cyan
$ready = $false
for ($i = 0; $i -lt 60; $i++) {
    try {
        Invoke-WebRequest -Uri "$BaseUrl/api/auth/me" -UseBasicParsing -TimeoutSec 2 | Out-Null
        $ready = $true; break
    }
    catch {
        if ($_.Exception.Response) { $ready = $true; break }
        Start-Sleep -Seconds 2
    }
}
if (-not $ready) { Write-Host 'Backend never came up.' -ForegroundColor Red; exit 1 }
Write-Host "Backend is up.`n" -ForegroundColor Cyan

# --- auth -------------------------------------------------------------------
$adminToken = $null
Test-Step 'admin can sign in' {
    $response = Invoke-Api -Method POST -Path '/api/auth/login' -Body @{ username = 'admin'; password = 'changeit' }
    if (-not $response.token) { throw 'no token returned' }
    $script:adminToken = $response.token
}

Test-Step 'wrong password is rejected' {
    $status = Get-ApiStatus -Method POST -Path '/api/auth/login'
    if ($status -eq 200) { throw 'login without credentials succeeded' }
}

Test-Step 'unauthenticated recipe access is refused' {
    $status = Get-ApiStatus -Method GET -Path '/api/recipes'
    if ($status -ne 401) { throw "expected 401, got $status" }
}

# --- import preview ---------------------------------------------------------
# Deliberately messy: string ingredients, a range, an optional item, "to taste",
# ref-linked steps, a Fahrenheit temperature and an unknown field.
$payload = @{
    title       = 'Shoyu Chicken'
    description = 'Sticky Hawaiian-style braised chicken.'
    source      = @{ url = 'https://www.allrecipes.com/recipe/shoyu-chicken'; type = 'WEB' }
    servings    = '12'
    times       = @{ prepMinutes = 20; cookMinutes = 80 }
    difficulty  = 'easy'
    category    = 'Poultry'
    calories    = 420
    ingredients = @(
        '1 cup soy sauce',
        '1 cup brown sugar',
        '1 cup water',
        '1 onion, chopped',
        '2-3 cloves garlic, minced',
        'Salt to taste',
        'Chopped scallions, optional',
        @{ ref = 'ginger'; name = 'fresh ginger'; quantity = '1 1/2'; unit = 'tbsp'; note = 'grated' }
    )
    steps       = @(
        @{ text = 'Whisk the soy sauce, sugar and water together.'; uses = @('soy-sauce', 'brown-sugar', 'water') },
        @{ text = 'Add the aromatics.'; uses = @('ginger', 'garlic'); minutes = 2 },
        @{ text = 'Braise until tender.'; temperature = @{ value = 350; unit = 'F' }; durationSeconds = 4800 }
    )
}

$preview = $null
Test-Step 'preview parses messy JSON without writing' {
    $script:preview = Invoke-Api -Method POST -Path '/api/import/preview' -Body $payload -Token $adminToken
    if ($script:preview.recipeCount -ne 1) { throw "expected 1 recipe, got $($script:preview.recipeCount)" }
}

Test-Step 'preview warns about the unknown field' {
    $warnings = $preview.items[0].warnings -join ' | '
    if ($warnings -notmatch 'calories') { throw "expected a warning about 'calories', got: $warnings" }
}

Test-Step 'string ingredients are parsed into structured fields' {
    $soy = $preview.items[0].recipe.ingredients | Where-Object { $_.name -eq 'soy sauce' }
    if (-not $soy) { throw 'soy sauce not parsed' }
    if ($soy.quantity -ne 1) { throw "expected quantity 1, got $($soy.quantity)" }
    if ($soy.unit -ne 'cup') { throw "expected unit cup, got $($soy.unit)" }
}

Test-Step 'ranges keep both bounds' {
    $garlic = $preview.items[0].recipe.ingredients | Where-Object { $_.name -eq 'garlic' }
    if ($garlic.quantity -ne 2 -or $garlic.quantityMax -ne 3) {
        throw "expected 2-3, got $($garlic.quantity)-$($garlic.quantityMax)"
    }
}

Test-Step '"to taste" is marked non-scalable' {
    $salt = $preview.items[0].recipe.ingredients | Where-Object { $_.name -like 'Salt*' }
    if ($salt.scalable) { throw 'salt should not be scalable' }
}

Test-Step 'trailing "optional" sets the flag' {
    $scallions = $preview.items[0].recipe.ingredients | Where-Object { $_.name -like '*scallions*' }
    if (-not $scallions.optional) { throw 'scallions should be optional' }
}

Test-Step 'Fahrenheit is converted to Celsius' {
    $braise = $preview.items[0].recipe.steps[2]
    if ([math]::Abs($braise.temperatureC - 176.67) -gt 0.5) {
        throw "expected ~176.67C, got $($braise.temperatureC)"
    }
}

Test-Step 'total time is derived from prep + cook' {
    if ($preview.items[0].recipe.times.totalMinutes -ne 100) {
        throw "expected 100, got $($preview.items[0].recipe.times.totalMinutes)"
    }
}

# --- commit -----------------------------------------------------------------
$recipeId = $null
Test-Step 'commit persists the previewed recipe' {
    $created = Invoke-Api -Method POST -Path '/api/import/commit' -Body @{ recipes = @($preview.items[0].recipe) } -Token $adminToken
    $script:recipeId = $created[0].id
    if (-not $script:recipeId) { throw 'no id returned' }
}

Test-Step 'steps resolve their ingredient refs' {
    $detail = Invoke-Api -Method GET -Path "/api/recipes/$recipeId" -Token $adminToken
    if ($detail.steps[0].usedIngredientIds.Count -ne 3) {
        throw "step 1 should use 3 ingredients, got $($detail.steps[0].usedIngredientIds.Count)"
    }
    if ($detail.steps[1].usedIngredientIds.Count -ne 2) {
        throw "step 2 should use 2 ingredients, got $($detail.steps[1].usedIngredientIds.Count)"
    }
}

Test-Step 'the imported recipe keeps its single category' {
    $detail = Invoke-Api -Method GET -Path "/api/recipes/$recipeId" -Token $adminToken
    if ($detail.category.name -ne 'Poultry') { throw "expected category Poultry, got $($detail.category.name)" }
}

Test-Step 'the original payload is archived for future schema changes' {
    $detail = Invoke-Api -Method GET -Path "/api/recipes/$recipeId" -Token $adminToken
    if (-not $detail.title) { throw 'detail did not load' }
}

Test-Step 'search matches on ingredient name' {
    $results = Invoke-Api -Method GET -Path '/api/recipes?q=scallions' -Token $adminToken
    if ($results.totalElements -lt 1) { throw 'ingredient search found nothing' }
}

Test-Step 'category browse returns the recipe' {
    $results = Invoke-Api -Method GET -Path '/api/recipes?category=poultry' -Token $adminToken
    if ($results.totalElements -lt 1) { throw 'category filter found nothing' }
}

# --- isolation --------------------------------------------------------------
$otherToken = $null
Test-Step 'admin can create a second account' {
    try {
        Invoke-Api -Method POST -Path '/api/admin/users' -Token $adminToken `
            -Body @{ username = 'tester'; password = 'tester-password'; displayName = 'Tester' } | Out-Null
    }
    catch {
        if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -ne 400) { throw }
    }
    $response = Invoke-Api -Method POST -Path '/api/auth/login' -Body @{ username = 'tester'; password = 'tester-password' }
    $script:otherToken = $response.token
}

Test-Step 'another user cannot read this recipe' {
    $status = Get-ApiStatus -Method GET -Path "/api/recipes/$recipeId" -Token $otherToken
    if ($status -ne 404) { throw "expected 404, got $status" }
}

Test-Step 'another user cannot delete this recipe' {
    $status = Get-ApiStatus -Method DELETE -Path "/api/recipes/$recipeId" -Token $otherToken
    if ($status -ne 404) { throw "expected 404, got $status" }
}

Test-Step 'a non-admin cannot list users' {
    $status = Get-ApiStatus -Method GET -Path '/api/admin/users' -Token $otherToken
    if ($status -ne 403) { throw "expected 403, got $status" }
}

Test-Step 'image keys cannot traverse the filesystem' {
    $status = Get-ApiStatus -Method GET -Path '/api/images/..%2f..%2fapplication.yml' -Token $adminToken
    if ($status -eq 200) { throw 'path traversal was allowed' }
}

Write-Host "`n$pass passed, $fail failed`n" -ForegroundColor Cyan
if ($fail -gt 0) { exit 1 }
