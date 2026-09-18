param(
    [int[]]$Ports = @()
)

# Stops whatever start-dev.ps1 left running, using the ports it recorded.

$ErrorActionPreference = 'Continue'
$RepoRoot = $PSScriptRoot
. "$RepoRoot\scripts\_ports.ps1"

$stateFile = Join-Path $RepoRoot '.kl-dev-state.json'
if ($Ports.Count -eq 0 -and (Test-Path $stateFile)) {
    try {
        $state = Get-Content $stateFile -Raw | ConvertFrom-Json
        if ($state.frontendPort -and $state.backendPort) { $Ports = @([int]$state.frontendPort, [int]$state.backendPort) }
    }
    catch {
        Write-Host "Failed to read ${stateFile}: $($_.Exception.Message)"
    }
}
if ($Ports.Count -eq 0) { $Ports = @(5173, 8088) }

foreach ($port in $Ports) { Stop-ProcessOnPort -Port $port }

Get-Job -Name 'kl-backend', 'kl-frontend' -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Job $_ -ErrorAction SilentlyContinue
    Remove-Job $_ -Force -ErrorAction SilentlyContinue
}

if (Test-Path $stateFile) { Remove-Item $stateFile -ErrorAction SilentlyContinue }
