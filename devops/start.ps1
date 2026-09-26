<#
.SYNOPSIS
    Starts the full OpenSource Assist platform (Database migration, FastAPI backend, and Vite frontend).
.DESCRIPTION
    Checks prerequisites, applies database migrations, launches the FastAPI backend and Vite frontend in dedicated terminal windows, and checks health.
#>

[CmdletBinding()]
param (
    [switch]$NoBrowser,
    [switch]$InitDemoData
)

$ErrorActionPreference = "Stop"
$ScriptDir = $PSScriptRoot
$RepoRoot = (Get-Item $ScriptDir).Parent.FullName

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
        Write-Host "Could not auto-start PostgreSQL service. Ensure database is running on port 5432." -ForegroundColor Yellow
    }
}

try {
    Push-Location $RepoRoot
    uv run alembic upgrade head | Out-Null
    Pop-Location
    Write-Host "[OK] Database migrations up to date." -ForegroundColor Green
} catch {
    Write-Host "Notice: Alembic migration skipped or up to date." -ForegroundColor Gray
}

# Seed demo data if requested or on first startup
if ($InitDemoData) {
    Write-Host "Seeding demo user and mock repositories..." -ForegroundColor Yellow
    Push-Location $RepoRoot
    uv run python devops/init_demo_data.py
    Pop-Location
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
        Write-Host "Notice: Port $port is active (PID: $($conn.OwningProcess | Select-Object -Unique -First 1))." -ForegroundColor DarkYellow
        $conflict = $true
    }
}

# 5. Launch Backend and Frontend if not already active
Write-Host "[5/5] Launching Backend and Frontend services..." -ForegroundColor Yellow

$backendConn = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if (-not $backendConn) {
    Start-Process "cmd.exe" -ArgumentList "/c start `"OpenSource Assist - Backend (Port 8000)`" cmd /k `"cd /d `"$RepoRoot`" && uv run uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload`""
} else {
    Write-Host "Backend service is already running on port 8000." -ForegroundColor Green
}

$frontendConn = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
if (-not $frontendConn) {
    Start-Process "cmd.exe" -ArgumentList "/c start `"OpenSource Assist - Frontend (Port 5173)`" cmd /k `"cd /d `"$RepoRoot\frontend`" && npm run dev`""
} else {
    Write-Host "Frontend service is already running on port 5173." -ForegroundColor Green
}

Write-Host ""
Write-Host "Waiting for backend service to become ready..." -ForegroundColor Gray
$maxRetries = 15
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
Write-Host "Demo Login Credentials:" -ForegroundColor Yellow
Write-Host "  Email:    demo@opensourceassist.dev" -ForegroundColor White
Write-Host "  Password: Password123!" -ForegroundColor White
Write-Host ""
Write-Host "To stop services, close the terminal windows or run: devops/stop.ps1" -ForegroundColor Gray
Write-Host ""

if (-not $NoBrowser) {
    Start-Process "http://localhost:5173"
}
