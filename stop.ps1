<#
.SYNOPSIS
    Stops running OpenSource Assist backend (port 8000) and frontend (port 5173).
#>

Write-Host "Stopping OpenSource Assist services..." -ForegroundColor Yellow

$ports = @(8000, 5173)
$found = $false
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($procId in $pids) {
            if ($procId -eq 0) { continue }
            try {
                $p = Get-Process -Id $procId -ErrorAction SilentlyContinue
                $procName = if ($p) { $p.ProcessName } else { "Unknown" }
                Write-Host "Stopping process tree for $procName (PID: $procId) on port $port..." -ForegroundColor Gray
                # Use taskkill /T /F to terminate process and any spawned child processes cleanly
                & taskkill.exe /PID $procId /T /F 2>$null | Out-Null
                Write-Host "[OK] Terminated PID $procId and child processes." -ForegroundColor Green
                $found = $true
            } catch {
                Write-Host "Could not stop PID $procId : $_" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "[OK] Port $port is already free." -ForegroundColor Gray
    }
}

if ($found) {
    Write-Host "Services stopped successfully." -ForegroundColor Green
} else {
    Write-Host "No active OpenSource Assist services were found on ports 8000/5173." -ForegroundColor Yellow
}
