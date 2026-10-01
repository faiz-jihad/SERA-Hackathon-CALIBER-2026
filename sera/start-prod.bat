@echo off
REM ===================================================================
REM SERA - System for Equipment Reliability Assessment
REM Production Deployment Launcher (Docker & Native)
REM ===================================================================

echo.
echo ============================================================
echo   SERA - PRODUCTION DEPLOYMENT INITIALIZER
echo   System for Equipment Reliability Assessment
echo ============================================================
echo.

cd /d "%~dp0"

REM Check if Docker is installed and running
docker info >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [INFO] Docker detected. Launching full production stack (PostgreSQL + Backend + Nginx Frontend)...
    echo.
    docker compose up -d --build
    echo.
    echo [INFO] Deployment completed!
    echo   - Web Console:   http://localhost (or http://localhost:3000)
    echo   - Backend API:   http://localhost:8000
    echo   - API Health:    http://localhost:8000/health
    echo.
    echo To view logs: docker compose logs -f
    pause
    exit /b 0
)

echo [WARNING] Docker not running or not found.
echo Falling back to Native Production Mode (Uvicorn 4-workers + Local DB)...
echo.

if exist "%~dp0..\.venv\Scripts\python.exe" (
    set PYTHON_CMD="%~dp0..\.venv\Scripts\python.exe"
) else if exist "%~dp0.venv\Scripts\python.exe" (
    set PYTHON_CMD="%~dp0.venv\Scripts\python.exe"
) else (
    set PYTHON_CMD=python
)

echo [1/3] Verifying dependencies...
cd backend
%PYTHON_CMD% -m pip install -r requirements.txt --quiet
cd ..

echo [2/3] Building Optimized Frontend Bundle...
cd frontend
call npm install --silent
call npm run build
cd ..

echo [3/3] Starting Production Backend Service (4 workers)...
start "SERA Production API" cmd /c "cd backend && %PYTHON_CMD% -m uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4"

echo.
echo ============================================================
echo   SERA Production Backend running on http://localhost:8000
echo   Open Frontend via your industrial web server or Vite preview.
echo ============================================================
echo.
pause
