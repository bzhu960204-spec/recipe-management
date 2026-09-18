$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_env.ps1"

Push-Location "$RepoRoot\frontend"
try {
    if (-not (Test-Path 'node_modules')) {
        npm.cmd install
    }
    # --host exposes the dev server to other devices on the LAN (phone testing).
    npm.cmd run dev -- --host
}
finally {
    Pop-Location
}
