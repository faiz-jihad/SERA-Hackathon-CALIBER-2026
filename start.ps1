# ============================================================
# SERA — System for Equipment Reliability Assessment
# Root Startup Script (Windows PowerShell)
# ============================================================
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $scriptDir "sera")
.\start.ps1
