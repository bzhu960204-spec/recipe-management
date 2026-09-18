param(
    [int]$Port = 8088,
    [switch]$Rebuild,
    [switch]$NoBrowser,
    [switch]$NoLogFile
)

# Prod flow: one Spring Boot process serves the API and the packaged SPA on a single free port.
# Logs stream to this console and, by default, to logs/prod-<timestamp>.log.

$ErrorActionPreference = 'Stop'
$RepoRoot = $PSScriptRoot
. "$RepoRoot\scripts\_env.ps1"
. "$RepoRoot\scripts\_ports.ps1"

$backendDir = Join-Path $RepoRoot 'backend'
if (-not (Test-Path $backendDir)) { throw "Backend directory not found: $backendDir" }

function Get-AppJar {
    Get-ChildItem (Join-Path $backendDir 'target') -Filter 'kitchen-ledger-*.jar' -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -notlike '*.original' } |
        Select-Object -First 1
}

$jar = Get-AppJar
if ($Rebuild -or -not $jar) {
    Write-Host "Building production artifacts..."
    & (Join-Path $RepoRoot 'build-prod.ps1')
    $jar = Get-AppJar
}
if (-not $jar) { throw "Jar not found; build failed." }

$requestedPort = $Port
$Port = Get-FreePort -StartPort $Port
if ($Port -ne $requestedPort) { Write-Host "Port $requestedPort is in use, falling back to $Port" }

if (-not $env:KL_JWT_SECRET -or -not $env:KL_ADMIN_PASSWORD) {
    Write-Host "[warn] KL_JWT_SECRET / KL_ADMIN_PASSWORD not set - running with built-in dev credentials." -ForegroundColor Yellow
}

$stateFile = Join-Path $RepoRoot '.kl-prod-state.json'
@{
    port      = $Port
    startedAt = (Get-Date).ToString('o')
} | ConvertTo-Json | Set-Content -Path $stateFile -Encoding UTF8

$logFile = $null
if (-not $NoLogFile) {
    $logsDir = Join-Path $RepoRoot 'logs'
    if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir | Out-Null }
    $logFile = Join-Path $logsDir "prod-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
}

if (-not $NoBrowser) {
    Start-Job -Name 'kl-prod-open' -ScriptBlock {
        param([int]$Port)
        for ($i = 0; $i -lt 180; $i++) {
            if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
                Start-Process "http://localhost:$Port"
                break
            }
            Start-Sleep -Seconds 1
        }
    } -ArgumentList $Port | Out-Null
}

Write-Host ""
Write-Host "==============================================="
Write-Host " Kitchen Ledger (prod) starting"
Write-Host "   URL : http://localhost:$Port"
Write-Host "   Jar : $($jar.FullName)"
if ($logFile) { Write-Host "   Log : $logFile" }
Write-Host " Press Ctrl+C to stop."
Write-Host "==============================================="
Write-Host ""

# cwd = backend so the H2 file (./data/kitchenledger) and uploads (./data/uploads) match dev.
Push-Location $backendDir
try {
    $javaExe = Join-Path $env:JAVA_HOME 'bin\java.exe'
    $jarArgs = @('-jar', $jar.FullName, "--server.port=$Port")
    if ($logFile) { & $javaExe @jarArgs 2>&1 | Tee-Object -FilePath $logFile }
    else { & $javaExe @jarArgs 2>&1 }
}
finally {
    Pop-Location
    Get-Job -Name 'kl-prod-open' -ErrorAction SilentlyContinue | Remove-Job -Force -ErrorAction SilentlyContinue
    if (Test-Path $stateFile) { Remove-Item $stateFile -ErrorAction SilentlyContinue }
}
