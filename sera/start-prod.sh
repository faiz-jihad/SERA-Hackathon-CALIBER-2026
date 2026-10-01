#!/usr/bin/env bash
# ===================================================================
# SERA - System for Equipment Reliability Assessment
# Production Deployment Launcher (Linux / Industrial Server)
# ===================================================================

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

echo "============================================================"
echo "  SERA - PRODUCTION DEPLOYMENT INITIALIZER"
echo "  System for Equipment Reliability Assessment"
echo "============================================================"

if command -v docker &> /dev/null && docker info &> /dev/null; then
    echo "[INFO] Docker detected. Starting industrial stack (PostgreSQL + FastAPI + Nginx)..."
    docker compose up -d --build
    echo ""
    echo "============================================================"
    echo "  SERA Production Stack is Online!"
    echo "  Web UI:      http://localhost (or port 3000)"
    echo "  API Backend: http://localhost:8000"
    echo "  API Docs:    http://localhost:8000/docs"
    echo "  Healthcheck: http://localhost:8000/health"
    echo "============================================================"
    exit 0
fi

echo "[WARNING] Docker not available. Launching native Python service..."
python3 -m pip install -r backend/requirements.txt
cd backend
exec uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
