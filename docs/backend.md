# SERA — Backend Architecture & Service Layer Documentation

---

## 1. Backend Architecture & Structure

The SERA backend is powered by **FastAPI** (Python 3.10+) utilizing asynchronous endpoints, SQLAlchemy ORM, Pydantic v2 data validation schemas, and modular domain service layers.

```
sera/backend/
├── main.py                     # FastAPI application factory, CORS, router mounting
├── database/
│   ├── connection.py           # SQLAlchemy engine, session maker, SQLite/PostgreSQL init
│   └── schema.sql              # Database DDL schema
├── models/
│   └── db_models.py            # SQLAlchemy ORM declarative models (Equipment, Condition, etc.)
├── analytics/                  # Analytical calculation & rule engines
│   ├── features.py             # Feature engineering & slope calculator
│   ├── detection.py            # Deterministic anomaly detection engine
│   ├── rca.py                  # Root cause analysis & TF-IDF similarity matcher
│   ├── rule_engine.py          # Deterministic ISO rule provenance engine
│   └── evidence_engine.py      # Structured evidence & 'What Changed?' engine
├── api/                        # REST route controllers
│   ├── dashboard.py            # /api/dashboard/*
│   ├── equipment.py            # /api/equipment/*
│   ├── incidents.py            # /api/incidents/*
│   ├── analysis.py             # /api/analysis/*
│   ├── recommendations.py      # /api/recommendation/*
│   ├── follow_up.py            # /api/follow-up/*
│   └── ingestion.py            # /api/ingestion/*
├── services/
│   └── ai_recommendation.py    # AI recommendation layer with resilient fallback
└── ingestion/
    └── excel_ingestion.py      # Excel workbook parser and normalization engine
```

---

## 2. Core Service Modules

### 2.1 `services/rule_engine.py` (Deterministic Rule Provenance)
- Evaluates telemetry parameters against rule definitions stored in `threshold_rules`.
- Ensures rule provenance: Every rule breach returns the citation standard (e.g. `ISO 10816-3 (Class III/IV Rigid)`), exact threshold boundary, unit of measure, and engineering rationale.

### 2.2 `services/analytics.py` (Engineering Analytics)
- Implements linear regression algorithms (`scipy.stats.linregress` / `numpy.polyfit`) to calculate trend derivatives across 4-week, 8-week, and 12-week windows.
- Computes harmonic ratios:
  $$R_{2X} = \frac{\text{Harmonic}_{2X}}{\text{Vibration}_{\text{RMS}}}$$

### 2.3 `services/historical_search.py` (TF-IDF Similarity Search)
- Maintains TF-IDF vectorizer over historical incident descriptions.
- Queries symptom vectors using cosine similarity to return the highest-scoring matching past plant incidents with proven corrective turnarounds.

### 2.4 `services/investigation_agent.py` (AI Investigation Agent)
- Constructs prompt containing the structured **Evidence Layer**, **What Changed? Table**, **Triggered Rules**, and **Top Matched Historical Incidents**.
- Requests structured reasoning from Gemini/OpenAI API.
- **Resilient Fallback Mode**: If the external LLM is offline or timed out, the system automatically uses deterministic rule-based synthesis to produce identical, verified engineering outputs without breaking the application.

---

## 3. Error Handling & Resilience
- **Global Exception Middleware**: Intercepts unhandled errors and maps them to standardized RFC 7807 problem details JSON payloads.
- **Zero-Crash Ingestion**: Excel parsers validate schema integrity before committing to database, rolling back transactions on validation errors.
- **Deterministic Fallbacks**: All analytical and AI endpoints guarantee valid response payloads even in offline or disconnected plant environments.
