param(
    [switch]$SkipFrontend
)

# Builds the production artifacts for the single-port prod flow:
#   1) frontend  -> frontend/dist
#   2) fat jar   -> backend/target/kitchen-ledger-*.jar  (dist is packaged into it as /static)
# Run this after changing frontend or backend code. The dev flow is unaffected.

$ErrorActionPreference = 'Stop'
$RepoRoot = $PSScriptRoot
. "$RepoRoot\scripts\_env.ps1"

$backendDir = Join-Path $RepoRoot 'backend'
$frontendDir = Join-Path $RepoRoot 'frontend'
$distDir = Join-Path $frontendDir 'dist'
if (-not (Test-Path $backendDir)) { throw "Backend directory not found: $backendDir" }
if (-not (Test-Path $frontendDir)) { throw "Frontend directory not found: $frontendDir" }

if ($SkipFrontend) {
    Write-Host "Skipping frontend build (-SkipFrontend)."
}
else {
    Write-Host "Building frontend..."
    Push-Location $frontendDir
    try {
        if (-not (Test-Path 'node_modules')) {
            & npm.cmd install
            if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
        }
        & npm.cmd run build
        if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }
    }
    finally {
        Pop-Location
    }
}

# The jar is only useful in prod if the SPA made it into frontend/dist first.
if (-not (Test-Path (Join-Path $distDir 'index.html'))) {
    throw "frontend/dist/index.html not found. Run build-prod without -SkipFrontend."
}

Write-Host "Packaging backend fat jar..."
Push-Location $backendDir
try {
    & mvn.cmd -B -DskipTests clean package
    if ($LASTEXITCODE -ne 0) { throw "Backend package failed" }
}
finally {
    Pop-Location
}

$jar = Get-ChildItem (Join-Path $backendDir 'target') -Filter 'kitchen-ledger-*.jar' -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notlike '*.original' } |
    Select-Object -First 1
if (-not $jar) { throw "Jar not found under backend/target" }

if (-not (Test-Path (Join-Path $backendDir 'target\classes\static\index.html'))) {
    throw "SPA was not packaged into the jar; check the <resources> block in backend/pom.xml."
}

Write-Host ""
Write-Host "==============================================="
Write-Host " Production artifacts ready"
Write-Host "   Jar : $($jar.FullName)"
Write-Host " Launch with .\start-prod.cmd"
Write-Host "==============================================="
