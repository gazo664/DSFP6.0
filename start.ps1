# PowerShell Launcher for JobTrack
$ErrorActionPreference = "SilentlyContinue"
Set-Location -Path $PSScriptRoot

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "         JobTrack - Job Tracking Application" -ForegroundColor White
Write-Host "              (Light Blue Edition)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$pythonExe = $null

# Try python in PATH
try {
    $ver = & python --version 2>$null
    if ($LASTEXITCODE -eq 0 -and $ver) {
        $pythonExe = "python"
    }
} catch {}

# Try py launcher
if (-not $pythonExe) {
    try {
        $ver = & py --version 2>$null
        if ($LASTEXITCODE -eq 0 -and $ver) {
            $pythonExe = "py"
        }
    } catch {}
}

# Try QGIS Python 3.12
$qgisPython = "C:\Program Files\QGIS 3.44.0\apps\Python312\python.exe"
if (-not $pythonExe -and (Test-Path $qgisPython)) {
    $pythonExe = $qgisPython
}

if (-not $pythonExe) {
    Write-Host "[ERROR] Could not detect a working Python installation." -ForegroundColor Red
    Write-Host "Please install Python from https://www.python.org" -ForegroundColor Yellow
    Read-Host "Press Enter to exit..."
    exit 1
}

Write-Host "[INFO] Detected Python runtime: $pythonExe" -ForegroundColor Green
Write-Host "[INFO] Launching JobTrack on http://127.0.0.1:8000 ..." -ForegroundColor Cyan

# Launch browser after a brief delay
Start-Process "http://127.0.0.1:8000"

# Start the web server
& $pythonExe app.py

