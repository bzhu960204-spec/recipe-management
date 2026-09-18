param(
    [int]$BackendPort = 8088,
    [int]$FrontendPort = 5173,
    [switch]$StopExisting
)

# Dev flow: resolves free ports, then runs Spring Boot and Vite as background jobs
# whose logs are interleaved into this one window. Use .\stop-dev.ps1 to shut down.

$ErrorActionPreference = 'Stop'
# Captured first: dot-sourcing below can rebind $PSScriptRoot to the sourced file's folder.
$RepoRoot = $PSScriptRoot
. "$RepoRoot\scripts\_env.ps1"
. "$RepoRoot\scripts\_ports.ps1"

$backendDir = Join-Path $RepoRoot 'backend'
$frontendDir = Join-Path $RepoRoot 'frontend'
if (-not (Test-Path $backendDir)) { throw "Backend directory not found: $backendDir" }
if (-not (Test-Path $frontendDir)) { throw "Frontend directory not found: $frontendDir" }

if ($StopExisting) {
    Stop-ProcessOnPort -Port $BackendPort
    Stop-ProcessOnPort -Port $FrontendPort
}

# Resolve both ports before starting anything, so each child gets the final values.
$requestedBackend = $BackendPort
$requestedFrontend = $FrontendPort
$BackendPort = Get-FreePort -StartPort $BackendPort
$FrontendPort = Get-FreePort -StartPort $FrontendPort -Reserved @($BackendPort)

if ($BackendPort -ne $requestedBackend) { Write-Host "Backend port $requestedBackend is in use, falling back to $BackendPort" }
if ($FrontendPort -ne $requestedFrontend) { Write-Host "Frontend port $requestedFrontend is in use, falling back to $FrontendPort" }

$stateFile = Join-Path $RepoRoot '.kl-dev-state.json'
@{
    backendPort  = $BackendPort
    frontendPort = $FrontendPort
    startedAt    = (Get-Date).ToString('o')
} | ConvertTo-Json | Set-Content -Path $stateFile -Encoding UTF8

# The jobs get their own runspaces, so hand them the toolchain PATH that _env.ps1 built.
$toolPath = $env:PATH
$javaHome = $env:JAVA_HOME

$backendJob = Start-Job -Name 'kl-backend' -ScriptBlock {
    param([string]$Dir, [int]$Port, [string]$ToolPath, [string]$JavaHome)

    Set-Location $Dir
    $env:PATH = $ToolPath
    $env:JAVA_HOME = $JavaHome
    # Program args survive the spring-boot:run fork more reliably than env vars.
    & mvn.cmd spring-boot:run "-Dspring-boot.run.arguments=--server.port=$Port" 2>&1 | ForEach-Object { $_.ToString() }
} -ArgumentList $backendDir, $BackendPort, $toolPath, $javaHome

Write-Host "Waiting for backend on port $BackendPort..."
$waited = 0
$ready = $false
while ($waited -lt 180) {
    Receive-Job -Job $backendJob -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "[backend] $_" }

    if ($backendJob.State -in @('Completed', 'Failed', 'Stopped')) {
        Write-Host "Backend job ended before binding (state=$($backendJob.State))."
        break
    }
    if (Get-NetTCPConnection -LocalPort $BackendPort -State Listen -ErrorAction SilentlyContinue) { $ready = $true; break }

    Start-Sleep -Seconds 1
    $waited++
    if ($waited % 10 -eq 0) { Write-Host "  still waiting... ($waited s)" }
}
if ($ready) { Write-Host "Backend ready after ${waited}s." }
else { Write-Host "Backend not ready yet; starting frontend anyway." }

$frontendJob = Start-Job -Name 'kl-frontend' -ScriptBlock {
    param([string]$Dir, [int]$ApiPort, [int]$Port, [string]$ToolPath)

    Set-Location $Dir
    $env:PATH = $ToolPath
    $env:BACKEND_PORT = "$ApiPort"
    $env:FRONTEND_PORT = "$Port"

    if (-not (Test-Path 'node_modules')) { & npm.cmd install }
    # --host exposes the dev server to other devices on the LAN (phone testing).
    & npm.cmd run dev -- --host --port $Port --strictPort 2>&1 | ForEach-Object { $_.ToString() }
} -ArgumentList $frontendDir, $BackendPort, $FrontendPort, $toolPath

Write-Host ""
Write-Host "==============================================="
Write-Host " Kitchen Ledger (dev) running"
Write-Host "   Frontend : http://localhost:$FrontendPort"
Write-Host "   Backend  : http://localhost:$BackendPort"
Write-Host " Ctrl+C stops log streaming; jobs keep running."
Write-Host " Use .\stop-dev.ps1 to shut everything down."
Write-Host "==============================================="
Write-Host ""

try {
    while ($true) {
        $hadOutput = $false

        Receive-Job -Job $backendJob -ErrorAction SilentlyContinue | ForEach-Object {
            $hadOutput = $true
            Write-Host "[backend] $_"
        }
        Receive-Job -Job $frontendJob -ErrorAction SilentlyContinue | ForEach-Object {
            $hadOutput = $true
            Write-Host "[frontend] $_"
        }

        $done = @('Completed', 'Failed', 'Stopped')
        if (($backendJob.State -in $done) -and ($frontendJob.State -in $done)) { break }
        if (-not $hadOutput) { Start-Sleep -Milliseconds 250 }
    }
}
finally {
    Write-Host "`nJob states: backend=$($backendJob.State), frontend=$($frontendJob.State)"
    foreach ($job in @($backendJob, $frontendJob)) {
        if ($job.State -notin @('Completed', 'Failed', 'Stopped')) { Stop-Job -Job $job -Force -ErrorAction SilentlyContinue }
    }
    Remove-Job -Job $backendJob, $frontendJob -Force -ErrorAction SilentlyContinue
    if (Test-Path $stateFile) { Remove-Item $stateFile -ErrorAction SilentlyContinue }
}
