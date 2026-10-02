# SERA — Production Deployment Guide
> Industrial-Grade Manufacturing Reliability Platform (CALIBER 2026 Case 2)

---

## 1. Quick Start: 1-Command Production Launch

SERA provides production orchestrators for both Linux/Cloud VPS and Windows industrial environments:

### Linux VPS / Production Server
```bash
cd sera
chmod +x start-prod.sh
./start-prod.sh
```

### Windows Production Workstation
```cmd
cd sera
start-prod.bat
```

The script automatically detects Docker. If Docker is running, it builds and spins up the multi-container stack. If Docker is not installed, it gracefully falls back to native Python serving.

---

## 2. Containerized Stack (`docker-compose.yml`)

The production stack orchestrates 3 isolated, resilient containers:
1. **Database (`sera_db`)**: PostgreSQL 16 Alpine with persistent data volume and healthcheck probe.
2. **Backend API (`sera_backend`)**: FastAPI + Python 3.11 with 4 Uvicorn workers and curl health probe.
3. **Frontend UI (`sera_frontend`)**: Nginx Alpine reverse-proxy serving production React SPA assets on ports `80` and `3000`.

### 2.1 Complete `docker-compose.yml`
```yaml
version: "3.9"

services:
  db:
    image: postgres:16-alpine
    container_name: sera_db
    environment:
      POSTGRES_USER: sera_user
      POSTGRES_PASSWORD: sera_pass
      POSTGRES_DB: sera_db
    ports:
      - "5432:5432"
    volumes:
      - sera_postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sera_user -d sera_db"]
      interval: 5s
      timeout: 5s
      retries: 10
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: sera_backend
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://sera_user:sera_pass@db:5432/sera_db
      SERA_ENV: production
      ALLOWED_ORIGINS: "*"
      OLLAMA_BASE_URL: http://host.docker.internal:11434
      OLLAMA_MODEL: llama3
    volumes:
      - ./data:/app/data
      - ../data:/data:ro
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 15s
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: sera_frontend
    ports:
      - "80:80"
      - "3000:80"
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped

volumes:
  sera_postgres_data:
```

### 2.2 Starting the Stack Manually
```bash
cd sera
docker compose up -d --build
```

### 2.3 Seeding Baseline Official CALIBER Data
After initial startup, populate the PostgreSQL database with the Case 2 baseline data (equipment history, sensor telemetry, incident history):
```bash
docker compose exec backend python scripts/ingest_official_caliber_data.py
```

---

## 3. Standalone Native Deployment (Without Docker)

When running on an edge industrial PC without container runtime:

1. **Build Frontend**:
   ```bash
   cd sera/frontend
   npm install
   npm run build
   ```
   *(Compiled bundle will be saved to `sera/frontend/dist`)*

2. **Run Backend Service**:
   ```bash
   cd sera/backend
   pip install -r requirements.txt
   uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
   ```
   FastAPI will automatically detect `frontend/dist` and serve the full React application at `http://localhost:8000` with SPA routing and API protection.

---

## 4. Production Service Verification & Probes

| Checkpoint | Endpoint / Command | Expected Result |
| :--- | :--- | :--- |
| **Liveness Probe** | `GET http://<host>:8000/health` | `{"status":"healthy","database":"connected"}` |
| **Readiness Probe** | `GET http://<host>:8000/ready` | `{"status":"ready","database":"connected","initialized":true}` |
| **Web UI** | `GET http://<host>:80` or `:3000` | 200 OK (SERA Cockpit with `PRODUCTION` badge) |
| **API Docs** | `GET http://<host>:8000/docs` | OpenAPI Swagger Documentation |
| **Test Suite** | `pytest sera/backend/tests` | `33 passed` (100%) |
| **E2E Acceptance** | `python sera/backend/tests/run_e2e_acceptance.py` | `18 / 18 STAGES PASSED` (100%) |

