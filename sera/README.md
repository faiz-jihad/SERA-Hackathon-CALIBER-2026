# SERA — System for Equipment Reliability Assessment
### CALIBER 2026 | Case 2: Intelligent Manufacturing Unified Dashboard
> **Tagline**: *Detect. Investigate. Decide.*

---

## 📚 Complete Technical Documentation Library

Full comprehensive documentation for all 30 architectural topics is available in the [`docs/`](../docs/) directory:
- 📖 [**System Overview**](../docs/system-overview.md) • [**Architecture**](../docs/architecture.md) • [**Data Flow**](../docs/data-flow.md)
- 🗄️ [**Database Schema**](../docs/database.md) • [**API Reference**](../docs/api.md) • [**Frontend Guide**](../docs/frontend.md)
- ⚙️ [**Rule Engine**](../docs/rule-engine.md) • [**Analytics**](../docs/analytics.md) • [**Evidence System**](../docs/evidence-system.md)
- 🔍 [**Historical Analysis**](../docs/historical-analysis.md) • [**AI Investigation Agent**](../docs/ai-agent.md) • [**5-Why RCA**](../docs/rca.md)
- 📋 [**Recommendations**](../docs/recommendation.md) • [**Engineer Review**](../docs/engineer-review.md) • [**Follow-Up**](../docs/follow-up.md)
- 🛡️ [**Security & RBAC**](../docs/security.md) • [**Testing Suite**](../docs/testing.md) • [**Demo Guide**](../docs/demo-guide.md)

---

## Core Principle

> **Engineering data is the evidence. AI is the reasoning layer. Engineers remain the decision makers.**

**Workflow:** `DETECT → INVESTIGATE → DECIDE`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Tailwind CSS (TailAdmin Light) + Montserrat |
| Backend | Python 3.10+ + FastAPI |
| Database | SQLite (Dev/Demo) / PostgreSQL (Production) |
| Data Processing | Pandas + OpenPyXL + NumPy + Scipy |
| AI Layer | SERA AI Agent (Gemini/OpenAI) + Deterministic Fallback Engine |
| Deployment | Docker + Docker Compose |

---

## Project Structure

```
sera/
├── backend/
│   ├── main.py                   # FastAPI application entry
│   ├── api/
│   │   ├── dashboard.py          # GET /api/dashboard/overview
│   │   ├── equipment.py          # Equipment CRUD + trend + analysis
│   │   ├── incidents.py          # Historical incident database
│   │   ├── ingestion.py          # POST /api/ingestion/upload
│   │   ├── analysis.py           # POST /api/analysis/detect|rca
│   │   └── recommendations.py   # Recommendation + review
│   ├── analytics/
│   │   ├── features.py           # Feature engineering + thresholds
│   │   ├── detection.py          # Problem detection engine
│   │   └── rca.py                # Root cause analysis engine
│   ├── services/
│   │   └── ai_recommendation.py  # Ollama AI recommendation layer
│   ├── ingestion/
│   │   └── excel_ingestion.py    # Excel data ingestion pipeline
│   ├── database/
│   │   ├── connection.py         # SQLAlchemy session + init
│   │   └── schema.sql            # PostgreSQL schema
│   ├── models/
│   │   └── db_models.py          # SQLAlchemy ORM models
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx               # Router + layout
│   │   ├── api/client.ts         # Typed API client
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── EquipmentListPage.tsx
│   │   │   ├── EquipmentDetailPage.tsx  # Main investigation UI
│   │   │   ├── IncidentsPage.tsx
│   │   │   ├── AnalysisPage.tsx
│   │   │   ├── RecommendationsPage.tsx
│   │   │   └── IngestionPage.tsx
│   │   └── components/
│   │       ├── Sidebar.tsx
│   │       ├── TrendChart.tsx     # ECharts with threshold lines
│   │       ├── EvidenceCard.tsx
│   │       └── StatusBadge.tsx
│   └── package.json
├── data/
│   ├── raw/                      # Place Excel Supporting Data here
│   └── processed/
├── scripts/
│   ├── ingest_official_caliber_data.py  # Ingestion pipeline for official CALIBER Case 2 datasets
│   └── seed_demo_data.py                # Legacy test utility
└── docker-compose.yml
```

---

## Quick Start

### Option A — One-Click Launch Script (Recommended)

From the project root:
```powershell
.\start.ps1
```
This automatically starts:
- Ingestion of official CALIBER Case 2 data into `sera/backend/sera.db`
- FastAPI backend API server at `http://localhost:8000`
- Vite React frontend server at `http://localhost:5173`

### Option B — Local Manual Development

**Prerequisites:** Python 3.10+, Node 18+

#### 1. Ingest Official Data & Start Backend
```bash
cd sera
# Activate virtual environment
.venv\Scripts\activate    # Windows
# or source .venv/bin/activate  # Linux/macOS

pip install -r backend/requirements.txt

# Ingest all official CALIBER Case 2 datasets into sera.db:
python scripts/ingest_official_caliber_data.py

# Start FastAPI Server:
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
# → API available at http://localhost:8000 (Docs: http://localhost:8000/docs)
```

#### 2. Start Frontend
```bash
cd sera/frontend
npm install
npm run dev
# → UI available at http://localhost:5173
```

---

## Data Ingestion

### Upload Excel Files
1. Go to **Data Ingestion** page in the UI
2. Select Equipment ID (e.g., `BL-5702`)
3. Select data category (or let auto-detect work)
4. Upload your Excel file
5. The system will:
   - Detect sheet names and auto-categorize
   - Normalize column names
   - Parse timestamps
   - Validate numeric values
   - Store cleaned records in PostgreSQL

### Supported Data Categories
| Category | Key Columns |
|----------|------------|
| `equipment` | vibration, harmonic_2x, coupling_offset, bearing_temperature, status |
| `production` | production_rate, pressure, feed, run_status |
| `downtime` | start_time, end_time, duration_hours, production_loss, financial_loss |
| `incidents` | incident_date, problem, root_cause, corrective_action, preventive_action |

### Place Raw Files
Drop Excel files in `sera/data/raw/` then use the ingestion API or UI.

---

## Demo Scenario (BL-5702)

1. Open Dashboard → equipment list loads
2. Click **BL-5702** → shows ALARM status
3. View **Overview & Trends** → 26-week deterioration visible
4. View **Problem Investigation** → High Vibration + Coupling Misalignment detected
5. See **RCA Evidence** → coupling offset + 2X harmonic signature
6. View **Historical Cases** → similar incidents from 2022, 2021, etc.
7. Click **Generate Recommendation** → AI produces corrective + preventive actions
8. Engineer reviews: **Accept / Modify / Reject**

---

## AI Layer (Ollama)

Install Ollama and pull a model:
```bash
# Install: https://ollama.ai
ollama pull llama3
```

Configure via environment variable:
```
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
```

If Ollama is unavailable, the system falls back to a rule-based recommendation engine using historical incident data.

---

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboard/overview` | GET | Plant KPIs + equipment list |
| `/api/equipment` | GET | List all equipment |
| `/api/equipment/{id}` | GET | Equipment detail + condition summary |
| `/api/equipment/{id}/trend` | GET | Trend data for charts |
| `/api/equipment/{id}/analysis` | GET | Full analysis (detection + RCA) |
| `/api/incidents` | GET | Historical incident list |
| `/api/incidents/similar` | GET | Find similar incidents |
| `/api/ingestion/upload` | POST | Upload Excel file |
| `/api/analysis/detect` | POST | Run detection engine |
| `/api/analysis/rca` | POST | Run RCA engine |
| `/api/recommendation` | POST | Generate AI recommendation |
| `/api/recommendation/{id}/review` | POST | Engineer review |

Interactive docs: http://localhost:8000/docs

---

## Detection Thresholds

| Parameter | Warning | Alarm | Trip |
|-----------|---------|-------|------|
| Vibration (mm/s) | 7.1 | 11.0 | 18.0 |
| 2X Harmonic | 3.0 | 5.0 | 8.0 |
| Bearing Temp. (°C) | 75 | 85 | 95 |
| Coupling Offset (mm) | 0.05 | 0.10 | 0.15 |

> Thresholds are configurable in `backend/analytics/features.py`

---

## System Positioning

SERA is:
> *"A unified manufacturing reliability decision-support system that connects equipment, production, downtime, and incident data into one investigation workflow."*

SERA is **NOT**:
- A generic AI chatbot
- A predictive maintenance app making fake accuracy claims
- A system that overrides engineering evidence with AI guesses
