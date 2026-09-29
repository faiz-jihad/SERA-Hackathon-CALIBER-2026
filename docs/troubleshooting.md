# SERA — Troubleshooting Guide

---

## 1. Common Diagnostics & Quick Fixes

### 1.1 Backend: Port 8000 Already in Use
- **Symptom**: `ERROR: [Errno 10048] error while attempting to bind on address ('0.0.0.0', 8000)`.
- **Cause**: A previous instance of Uvicorn or another local service is holding port 8000.
- **Fix**:
  - **Windows (PowerShell)**:
    ```powershell
    Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess | Stop-Process -Force
    ```
  - **Linux / macOS**:
    ```bash
    fuser -k 8000/tcp
    ```

---

### 1.2 Database Lock (`sqlite3.OperationalError: database is locked`)
- **Symptom**: Fast concurrent writes to SQLite report database locked.
- **Fix**:
  - The SQLite driver in `connection.py` is configured with `timeout=30.0` and WAL mode (`journal_mode=WAL`). If needed, delete `sera.db` and re-run initial ingestion:
    ```powershell
    python ..\scripts\ingest_official_caliber_data.py
    ```

---

### 1.3 Frontend: CORS Errors when Calling Backend
- **Symptom**: `Access to XMLHttpRequest at 'http://localhost:8000/api/...' has been blocked by CORS policy`.
- **Fix**:
  - Verify that `CORS_ORIGINS` in `sera/backend/.env` contains your frontend development URL (`http://localhost:5173`).
  - Or use the Vite proxy defined in `vite.config.ts`.

---

### 1.4 AI Agent Timeout / Disconnected Internet
- **Symptom**: `Warning: AI Agent timed out after 8.0s`.
- **Resolution**:
  - This is expected behavior in offline environments. SERA automatically falls back to its **Deterministic Rule-Based Synthesis Engine** to generate 100% accurate RCAs and action plans without interrupting the user.
