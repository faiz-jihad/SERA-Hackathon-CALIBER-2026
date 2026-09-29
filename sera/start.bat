@echo off
REM ============================================================
REM SERA - System for Equipment Reliability Assessment
REM Quick Start Script (Windows)
REM ============================================================
echo.
echo =============================================
echo   SERA - Detect. Investigate. Decide.
echo   CALIBER 2026 Case 2
echo =============================================
echo.

cd /d "%~dp0"

if exist "%~dp0..\.venv\Scripts\python.exe" (
    set PYTHON_CMD="%~dp0..\.venv\Scripts\python.exe"
) else if exist "%~dp0.venv\Scripts\python.exe" (
    set PYTHON_CMD="%~dp0.venv\Scripts\python.exe"
) else (
    set PYTHON_CMD=python
    py -3.13 --version >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        set PYTHON_CMD=py -3.13
    ) else (
        py --version >nul 2>&1
        if %ERRORLEVEL% equ 0 (
            set PYTHON_CMD=py
        ) else (
            if exist "C:\laragon\bin\python\python-3.10\python.exe" (
                set PYTHON_CMD="C:\laragon\bin\python\python-3.10\python.exe"
            )
        )
    )
)
echo Using Python: %PYTHON_CMD%

echo [1/4] Checking backend dependencies...
cd backend
%PYTHON_CMD% -m pip install -r requirements.txt --quiet 2>nul
cd ..

echo [2/4] Ingesting Official CALIBER Case 2 Data...
%PYTHON_CMD% "%~dp0scripts\ingest_official_caliber_data.py"

echo [3/4] Starting Backend (port 8000)...
start "SERA Backend" cmd /c "cd backend && %PYTHON_CMD% -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 3 >nul

echo [4/4] Starting Frontend (port 5173)...
start "SERA Frontend" cmd /c "cd frontend && npm run dev"

timeout /t 3 >nul

echo.
echo =============================================
echo   SERA is ready!
echo   Open: http://localhost:5173
echo.
echo   Login: lead.engineer (any password)
echo =============================================
echo.

start http://localhost:5173

pause
