# Port probing shared by start-dev.ps1 and start-prod.ps1.
$ErrorActionPreference = 'Stop'

function Test-PortFree {
    param([int]$Port)

    # Free means nothing is listening AND a fresh bind succeeds.
    if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) { return $false }
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
        $listener.Start()
        $listener.Stop()
        return $true
    }
    catch {
        return $false
    }
}

function Get-FreePort {
    param([int]$StartPort, [int[]]$Reserved = @(), [int]$MaxTries = 50)

    for ($i = 0; $i -lt $MaxTries; $i++) {
        $candidate = $StartPort + $i
        if ($Reserved -contains $candidate) { continue }
        if (Test-PortFree -Port $candidate) { return $candidate }
    }
    throw "No free port found in range $StartPort..$($StartPort + $MaxTries - 1)"
}

function Stop-ProcessOnPort {
    param([int]$Port)

    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if (-not $connections) {
        Write-Host "No listening process on port $Port"
        return
    }
    foreach ($processId in ($connections | Select-Object -ExpandProperty OwningProcess -Unique)) {
        try {
            Stop-Process -Id $processId -Force -ErrorAction Stop
            Write-Host "Stopped process $processId on port $Port"
        }
        catch {
            Write-Host "Failed to stop process $processId on port ${Port}: $($_.Exception.Message)"
        }
    }
}
