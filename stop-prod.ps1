param(
    [int]$Port = 0
)

# Stops the single-port prod process started by start-prod.ps1.

$ErrorActionPreference = 'Continue'
$RepoRoot = $PSScriptRoot
. "$RepoRoot\scripts\_ports.ps1"

$stateFile = Join-Path $RepoRoot '.kl-prod-state.json'
if ($Port -le 0 -and (Test-Path $stateFile)) {
    try {
        $state = Get-Content $stateFile -Raw | ConvertFrom-Json
        if ($state.port) { $Port = [int]$state.port }
    }
    catch {
        Write-Host "Failed to read ${stateFile}: $($_.Exception.Message)"
    }
}
if ($Port -le 0) { $Port = 8088 }

Stop-ProcessOnPort -Port $Port

if (Test-Path $stateFile) { Remove-Item $stateFile -ErrorAction SilentlyContinue }
