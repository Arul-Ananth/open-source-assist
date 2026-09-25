@echo off
setlocal
cd /d "%~dp0"

echo ==========================================================
echo           Starting OpenSource Assist Platform             
echo ==========================================================
echo.

echo [1/4] Checking environment...
if not exist .env (
    if exist .env.example (
        echo Creating .env from .env.example...
        copy .env.example .env >nul
    )
)

echo [2/4] Applying database migrations...
call uv run alembic upgrade head
if errorlevel 1 (
    echo [WARNING] Database migrations failed. Ensure PostgreSQL is running on port 5432.
) else (
    echo [OK] Database migrations up to date.
)

echo [3/4] Checking frontend dependencies...
if not exist frontend\node_modules (
    echo Installing frontend dependencies...
    cd frontend && call npm install && cd ..
)
echo [OK] Frontend dependencies ready.

echo [4/4] Launching services...
start "OpenSource Assist - Backend (Port 8000)" cmd /k "cd /d %~dp0 && uv run uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"
start "OpenSource Assist - Frontend (Port 5173)" cmd /k "cd /d %~dp0\frontend && npm run dev"

echo.
echo ==========================================================
echo        OpenSource Assist Services Are Up and Running!     
echo ==========================================================
echo.
echo   Frontend UI:   http://localhost:5173
echo   Backend API:   http://localhost:8000
echo   Swagger Docs:  http://localhost:8000/docs
echo   Health Check:  http://localhost:8000/health
echo.
echo Separate terminal windows have been opened for Backend and Frontend.
echo To stop services, close the terminal windows or run: stop.bat
echo.
start http://localhost:5173
