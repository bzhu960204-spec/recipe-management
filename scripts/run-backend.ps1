$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_env.ps1"

Push-Location "$RepoRoot\backend"
try {
    mvn.cmd spring-boot:run
}
finally {
    Pop-Location
}
