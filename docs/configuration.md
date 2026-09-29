# SERA — Configuration Guide

---

## 1. Environment Variables Overview

SERA uses standard environment variables to configure database connections, AI model keys, server ports, and industrial plant metadata.

Create a `.env` file in `sera/backend/.env` (a template is provided in `sera/backend/.env.example`):

```bash
# ──────────────────────────────────────────
# SERA BACKEND CONFIGURATION
# ──────────────────────────────────────────

# Application Mode
APP_ENV=production                       # "development" or "production"
DEBUG=false                              # Enable verbose debug logs
SECRET_KEY=sera-caliber-2026-secret-key  # Secret for session signatures

# Server Network Settings
HOST=0.0.0.0                             # Bind host address
PORT=8000                                # API listening port
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173

# Database Persistence
DATABASE_URL=sqlite:///./sera.db         # For SQLite (default)
# DATABASE_URL=postgresql://sera:password@localhost:5432/sera_db # For PostgreSQL

# Raw Data Ingestion Directory
DATA_RAW_DIR=../data                     # Path to folder containing raw Excel sheets

# AI Reasoning Agent Configuration (Optional - Deterministic fallback always active)
GEMINI_API_KEY=                          # Optional Google Gemini API Key
OPENAI_API_KEY=                          # Optional OpenAI API Key
AI_MODEL_NAME=gemini-2.0-flash           # Default AI model for reasoning synthesis
AI_TIMEOUT_SECONDS=8                     # Maximum latency before deterministic fallback
```

---

## 2. Frontend Configuration

Frontend environment variables can be set in `sera/frontend/.env`:

```bash
# Frontend Vite API Gateway Target
VITE_API_BASE_URL=http://localhost:8000/api
VITE_DEFAULT_LANGUAGE=en                 # "en" for English, "id" for Bahasa Indonesia
VITE_DEFAULT_PLANT_LOCATION=Cilegon Petrochemical Complex — Unit 05
```

---

## 3. Threshold Configuration Table

Engineering thresholds can be modified directly in the database table `threshold_rules` or in the supporting Excel master file `data/supporting_data_reference.xlsx` (Sheet: `Thresholds`). Reloading or uploading the file will immediately update the deterministic rule evaluation logic without restarting the server.
