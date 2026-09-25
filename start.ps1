<#
.SYNOPSIS
    Starts the full OpenSource Assist development environment (PostgreSQL check, Alembic migrations, FastAPI backend, and Vite frontend).
.DESCRIPTION
    Checks prerequisites, applies database migrations, launches the FastAPI backend and Vite frontend in dedicated terminal windows, and checks health.
#>

[CmdletBinding()]
param (
    [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
$RepoRoot = $PSScriptRoot

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "         Starting OpenSource Assist Platform              " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check prerequisites
Write-Host "[1/5] Checking tools and environment..." -ForegroundColor Yellow

if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
    Write-Host "Error: 'uv' package manager is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install uv: https://docs.astral.sh/uv/getting-started/installation/" -ForegroundColor Yellow
    exit 1
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "Error: 'npm' is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Node.js: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check .env
$EnvFile = Join-Path $RepoRoot ".env"
$EnvExample = Join-Path $RepoRoot ".env.example"
if (-not (Test-Path $EnvFile)) {
    if (Test-Path $EnvExample) {
        Write-Host "Creating .env from .env.example..." -ForegroundColor Gray
        Copy-Item $EnvExample $EnvFile
    } else {
        Write-Host "Warning: .env file not found." -ForegroundColor Yellow
    }
}

# 2. Check Database and Run Migrations
Write-Host "[2/5] Checking database and applying migrations..." -ForegroundColor Yellow
$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($pgService -and $pgService.Status -ne "Running") {
    Write-Host "Starting PostgreSQL service ($($pgService.Name))..." -ForegroundColor Gray
    try {
        Start-Service -Name $pgService.Name
    } catch {
        Write-Host "Could not auto-start PostgreSQL service. Ensure PostgreSQL is running on port 5432." -ForegroundColor Yellow
    }
}

try {
    Push-Location $RepoRoot
    uv run alembic upgrade head | Out-Null
    Pop-Location
    Write-Host "[OK] Database migrations up to date." -ForegroundColor Green
} catch {
    Write-Host "Warning: Database migration failed. Ensure PostgreSQL is running and credentials in .env are correct." -ForegroundColor Yellow
}

# 3. Check Frontend Dependencies
Write-Host "[3/5] Checking frontend dependencies..." -ForegroundColor Yellow
$FrontendNodeModules = Join-Path $RepoRoot "frontend\node_modules"
if (-not (Test-Path $FrontendNodeModules)) {
    Write-Host "node_modules not found in frontend. Running npm install..." -ForegroundColor Gray
    Push-Location (Join-Path $RepoRoot "frontend")
    npm install
    Pop-Location
}
Write-Host "[OK] Frontend dependencies ready." -ForegroundColor Green

# 4. Check Ports
Write-Host "[4/5] Checking port availability..." -ForegroundColor Yellow
$conflict = $false
foreach ($port in @(8000, 5173)) {
    $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conn) {
        Write-Host "Warning: Port $port is already in use by PID $($conn.OwningProcess | Select-Object -Unique -First 1)." -ForegroundColor Yellow
        $conflict = $true
    }
}
if ($conflict) {
    Write-Host "Tip: Run .\stop.ps1 or stop.bat to terminate existing backend/frontend instances if needed." -ForegroundColor DarkYellow
}

# 5. Launch Backend and Frontend
Write-Host "[5/5] Launching Backend and Frontend services..." -ForegroundColor Yellow

# Use cmd.exe /c start to spawn independent detached console windows reliably on Windows
Start-Process "cmd.exe" -ArgumentList "/c start `"OpenSource Assist - Backend (Port 8000)`" cmd /k `"cd /d `"$RepoRoot`" && uv run uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload`""
Start-Process "cmd.exe" -ArgumentList "/c start `"OpenSource Assist - Frontend (Port 5173)`" cmd /k `"cd /d `"$RepoRoot\frontend`" && npm run dev`""

Write-Host ""
Write-Host "Waiting for backend service to become ready..." -ForegroundColor Gray
$maxRetries = 20
$retries = 0
$backendReady = $false

while ($retries -lt $maxRetries) {
    Start-Sleep -Seconds 1
    try {
        $resp = Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -TimeoutSec 2 -ErrorAction Stop
        if ($resp.status -eq "healthy") {
            $backendReady = $true
            break
        }
    } catch {
        $retries++
    }
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "       OpenSource Assist Services Are Up and Running!     " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend UI:   http://localhost:5173" -ForegroundColor Cyan
Write-Host "  Backend API:   http://localhost:8000" -ForegroundColor Cyan
Write-Host "  Swagger Docs:  http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "  Health Check:  http://localhost:8000/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "Separate terminal windows have been opened for Backend and Frontend." -ForegroundColor Gray
Write-Host "To stop services, close the terminal windows or run: .\stop.ps1 (or stop.bat)" -ForegroundColor Gray
Write-Host ""

if (-not $NoBrowser) {
    Start-Process "http://localhost:5173"
}
