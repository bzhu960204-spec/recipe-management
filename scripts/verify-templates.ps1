$ErrorActionPreference = 'Stop'
$base = 'http://localhost:8088'
$pass = 0
$fail = 0

function Check($label, $condition) {
    if ($condition) { $script:pass++; Write-Host "  PASS  $label" -ForegroundColor Green }
    else { $script:fail++; Write-Host "  FAIL  $label" -ForegroundColor Red }
}

<#
  Invoke-RestMethod on PowerShell 5.1 decodes a charset-less JSON response as Latin-1,
  which turns every Chinese character into mojibake. This module exists to carry
  non-English recipes, so the checks below would be worthless through that path.
#>
function Api {
    param([string]$Method, [string]$Path, [string]$Token, [string]$BodyText)

    $request = [System.Net.HttpWebRequest]::Create("$base$Path")
    $request.Method = $Method
    if ($Token) { $request.Headers.Add('Authorization', "Bearer $Token") }

    if ($PSBoundParameters.ContainsKey('BodyText')) {
        $request.ContentType = 'application/json; charset=utf-8'
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($BodyText)
        $request.ContentLength = $bytes.Length
        $stream = $request.GetRequestStream()
        $stream.Write($bytes, 0, $bytes.Length)
        $stream.Close()
    }

    try {
        $response = $request.GetResponse()
    } catch [System.Net.WebException] {
        if ($null -eq $_.Exception.Response) { throw }
        $response = $_.Exception.Response
    }

    $status = [int]$response.StatusCode
    $reader = New-Object System.IO.StreamReader($response.GetResponseStream(), [System.Text.Encoding]::UTF8)
    $text = $reader.ReadToEnd()
    $reader.Close()
    $response.Close()

    $data = $null
    if ($text) { try { $data = $text | ConvertFrom-Json } catch { $data = $null } }
    [pscustomobject]@{ Status = $status; Data = $data; Text = $text }
}

function Json($object) { $object | ConvertTo-Json -Depth 20 -Compress }

Write-Host "`n== auth =="
$login = Api POST '/api/auth/login' $null (Json @{ username = 'admin'; password = 'changeit' })
$token = $login.Data.token
Check 'admin logs in' ($token.Length -gt 20)

Write-Host "`n== the built-in formats are seeded on first list =="
$list = (Api GET '/api/templates' $token).Data
$builtins = @($list | Where-Object { $_.builtin })
Check 'two built-in formats exist' ($builtins.Count -eq 2)
Check 'each starts at v1' (@($builtins | Where-Object { $_.currentVersionNo -ne 1 }).Count -eq 0)
Check 'each has a single version' (@($builtins | Where-Object { $_.versionCount -ne 1 }).Count -eq 0)

$again = (Api GET '/api/templates' $token).Data
Check 'listing twice does not re-seed' (@($again).Count -eq @($list).Count)

Write-Host "`n== detail carries the schema =="
$recipe = $builtins | Where-Object { $_.slug -eq 'recipe-extraction' }
$id = $recipe.id
$detail = (Api GET "/api/templates/$id" $token).Data
Check 'schema present' ($detail.version.schema -match 'recipe-extraction/v1')
Check 'the worked example is stored apart from the schema' ($detail.version.example -match '炸鱼柳')
Check 'history index has one entry' (@($detail.versions).Count -eq 1)
Check 'history index omits the schema' ($null -eq $detail.versions[0].schema)

$flat = $builtins | Where-Object { $_.slug -eq 'ingredient-flat' }
$flatDetail = (Api GET "/api/templates/$($flat.id)" $token).Data
Check 'the flat format schema is stored' ($flatDetail.version.schema -match 'Ingredient quick import')
Check 'Chinese survived storage intact' ($flatDetail.version.schema -match '杯')

Write-Host "`n== versioning =="
# Mutations run on a scratch copy: the built-ins are the user's real working formats.
$scratch = (Api POST '/api/templates' $token (Json @{
    name = "scratch $(Get-Random -Maximum 99999)"; description = 'created by verify-templates'
    schema = $detail.version.schema
})).Data
$scratchId = $scratch.id
Check 'a new template starts at v1' ($scratch.currentVersionNo -eq 1)

$v2 = (Api POST "/api/templates/$scratchId/versions" $token (Json @{
    schema = 'EDITED SCHEMA v2'; changelog = 'tightened the rules'
})).Data
Check 'saving an edit publishes v2' ($v2.currentVersionNo -eq 2)
Check 'v2 schema is the edited text' ($v2.version.schema -eq 'EDITED SCHEMA v2')
Check 'history now has two entries' (@($v2.versions).Count -eq 2)
Check 'the changelog is recorded' ($v2.versions[0].changelog -eq 'tightened the rules')

$old = (Api GET "/api/templates/$scratchId`?version=1" $token).Data
Check 'v1 is still readable verbatim' ($old.version.schema -eq $detail.version.schema)
Check 'reading v1 does not move the pointer' ($old.currentVersionNo -eq 2)

$restored = (Api POST "/api/templates/$scratchId/versions/1/restore" $token '{}').Data
Check 'restore appends v3 rather than rewinding' ($restored.currentVersionNo -eq 3)
Check 'the restored schema matches v1 exactly' ($restored.version.schema -eq $detail.version.schema)
Check 'v2 is still in the history' (@($restored.versions).Count -eq 3)

Write-Host "`n== guard rails =="
Check 'the built-in template cannot be deleted' ((Api DELETE "/api/templates/$id" $token).Status -eq 400)
Check 'an empty schema is rejected' `
    ((Api POST "/api/templates/$scratchId/versions" $token (Json @{ schema = '   ' })).Status -eq 400)
Check 'a nameless template is rejected' `
    ((Api POST '/api/templates' $token (Json @{ name = ''; schema = 'x' })).Status -eq 400)
Check 'an unknown version is a 404' ((Api GET "/api/templates/$scratchId`?version=99" $token).Status -eq 404)
Check 'restoring the current version is refused' `
    ((Api POST "/api/templates/$scratchId/versions/3/restore" $token '{}').Status -eq 400)
Check 'the built-in is untouched by all of the above' `
    ((Api GET "/api/templates/$id" $token).Data.currentVersionNo -eq 1)

Write-Host "`n== create, CJK slugs, delete =="
$mine = (Api POST '/api/templates' $token (Json @{ name = '中文模板'; description = 'cjk'; schema = 'hello' })).Data
$mine2 = (Api POST '/api/templates' $token (Json @{ name = '另一个中文模板'; schema = 'hello' })).Data
Check 'two CJK names get distinct slugs' ($mine.slug -ne $mine2.slug)
Check 'the CJK name is stored intact' ($mine.name -eq '中文模板')
Check 'a user template can be deleted' ((Api DELETE "/api/templates/$($mine.id)" $token).Status -eq 204)

Write-Host "`n== ownership isolation =="
# Reuses the same fixture account as verify-api.ps1 rather than minting another one.
Api POST '/api/admin/users' $token (Json @{
    username = 'tester'; password = 'tester-password'; displayName = 'Tester'
}) | Out-Null
$other = (Api POST '/api/auth/login' $null (Json @{ username = 'tester'; password = 'tester-password' })).Data.token
$otherList = (Api GET '/api/templates' $other).Data
Check 'a new user gets their own seeded built-ins' (@($otherList | Where-Object { $_.builtin }).Count -eq 2)
Check "they are different rows from the admin's" (@($otherList | Where-Object { $_.id -eq $id }).Count -eq 0)
Check "another user's template is not readable" ((Api GET "/api/templates/$id" $other).Status -eq 404)
Check "another user's template is not writable" `
    ((Api POST "/api/templates/$id/versions" $other (Json @{ schema = 'pwned' })).Status -eq 404)
Check "another user's template cannot be deleted" ((Api DELETE "/api/templates/$id" $other).Status -eq 404)
Check 'templates require authentication' ((Api GET '/api/templates' $null).Status -eq 401)

Write-Host "`n== cleanup =="
foreach ($leftover in @($scratchId, $mine2.id)) {
    Api DELETE "/api/templates/$leftover" $token | Out-Null
}
$remaining = (Api GET '/api/templates' $token).Data
Check 'only the built-in formats are left behind' (@($remaining).Count -eq 2)
Check 'and they are still pristine v1' (@($remaining | Where-Object { $_.currentVersionNo -ne 1 }).Count -eq 0)

Write-Host "`n-----------------------------"
Write-Host " $pass passed, $fail failed" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })
Write-Host "-----------------------------`n"
exit $fail
