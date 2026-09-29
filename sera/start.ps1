# ============================================================
# SERA — System for Equipment Reliability Assessment
# Complete Startup Script (Windows PowerShell)
# ============================================================
# Usage:
#   cd sera/
#   .\start.ps1
# ============================================================

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  SERA — System for Equipment Reliability"    -ForegroundColor Cyan
Write-Host "         Assessment (CALIBER 2026)"           -ForegroundColor Cyan
Write-Host "  Detect. Investigate. Decide."               -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
$BACKEND = Join-Path $ROOT "backend"
$FRONTEND = Join-Path $ROOT "frontend"
$SCRIPTS = Join-Path $ROOT "scripts"

# ── Step 0: Detect Python Executable ──
$PYTHON = "python"
if (Get-Command "py" -ErrorAction SilentlyContinue) {
    $ver = & py -3.13 --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        $PYTHON = "py -3.13"
    } else {
        $PYTHON = "py"
    }
} elseif (-not (Get-Command "python" -ErrorAction SilentlyContinue)) {
    if (Test-Path "C:\laragon\bin\python\python-3.10\python.exe") {
        $PYTHON = "C:\laragon\bin\python\python-3.10\python.exe"
    }
}
Write-Host "Using Python: $PYTHON" -ForegroundColor DarkCyan

# ── Step 1: Install Backend Dependencies ──
Write-Host "[1/5] Installing backend dependencies..." -ForegroundColor Yellow
Push-Location $BACKEND
Invoke-Expression "$PYTHON -m pip install -r requirements.txt --quiet" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  WARNING: Some packages may have failed. Continuing..." -ForegroundColor DarkYellow
}
Pop-Location
Write-Host "  Done." -ForegroundColor Green

# ── Step 2: Install Frontend Dependencies ──
Write-Host "[2/5] Checking frontend dependencies..." -ForegroundColor Yellow
Push-Location $FRONTEND
if (-not (Test-Path "node_modules")) {
    Write-Host "  Installing npm packages..."
    npm install --silent 2>$null
}
Pop-Location
Write-Host "  Done." -ForegroundColor Green

# ── Step 3: Ingest Official CALIBER Case 2 Data ──
Write-Host "[3/5] Ingesting Official CALIBER Case 2 Supporting Data..." -ForegroundColor Yellow
Push-Location $ROOT
Invoke-Expression "$PYTHON `"$SCRIPTS\ingest_official_caliber_data.py`"" 2>&1 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
Pop-Location
Write-Host "  Done." -ForegroundColor Green

# ── Step 4: Start Backend (FastAPI) ──
Write-Host "[4/5] Starting backend API server (port 8000)..." -ForegroundColor Yellow
$backendJob = Start-Job -ScriptBlock {
    param($backendPath, $pyCmd)
    Set-Location $backendPath
    Invoke-Expression "$pyCmd -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
} -ArgumentList $BACKEND, $PYTHON
Start-Sleep -Seconds 2
Write-Host "  Backend running at http://localhost:8000" -ForegroundColor Green

# ── Step 5: Start Frontend (Vite) ──
Write-Host "[5/5] Starting frontend dev server (port 5173)..." -ForegroundColor Yellow
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:FRONTEND
    npm run dev
}
Start-Sleep -Seconds 2
Write-Host "  Frontend running at http://localhost:5173" -ForegroundColor Green

# ── Ready ──
Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "  SERA is ready!" -ForegroundColor Green
Write-Host "  Open: http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "  Login credentials:" -ForegroundColor White
Write-Host "    Lead Engineer:    lead.engineer"  -ForegroundColor DarkCyan
Write-Host "    Technician:       tech.surya"     -ForegroundColor DarkCyan
Write-Host "    Plant Manager:    mgr.hartono"    -ForegroundColor DarkCyan
Write-Host "    Data Engineer:    data.admin"     -ForegroundColor DarkCyan
Write-Host "  (any password works for demo)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Press Ctrl+C to stop all servers" -ForegroundColor DarkGray
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""

# Keep running until Ctrl+C
try {
    while ($true) {
        Receive-Job $backendJob -ErrorAction SilentlyContinue
        Receive-Job $frontendJob -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 5
    }
} finally {
    Write-Host "`nShutting down SERA..." -ForegroundColor Yellow
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Stop-Job $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -Force -ErrorAction SilentlyContinue
    Remove-Job $frontendJob -Force -ErrorAction SilentlyContinue
    Write-Host "SERA stopped." -ForegroundColor Red
}
