"""
SERA FastAPI Application
Main entry point for the backend API.
"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database.connection import init_db, SessionLocal
from models.db_models import Equipment
from api import dashboard, equipment, incidents, ingestion, analysis, recommendations, follow_up, audit


def _ensure_baseline_data():
    """Verify if the database has equipment assets; if completely empty, auto-seed."""
    try:
        db = SessionLocal()
        count = db.query(Equipment).count()
        db.close()
        if count == 0:
            print("[SERA] Empty database detected. Running baseline CALIBER ingestion...")
            scripts_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scripts")
            if scripts_dir not in sys.path:
                sys.path.insert(0, scripts_dir)
            try:
                import importlib
                ingest_mod = importlib.import_module("ingest_official_caliber_data")
                ingest_mod.run_ingestion()
                print("[SERA] Baseline database seeded successfully.")
            except Exception as se:
                print(f"[SERA] Notice: Auto-seeding skipped ({se})")
        else:
            print(f"[SERA] Database operational with {count} active equipment profiles.")
    except Exception as e:
        print(f"[SERA] Baseline check warning: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database and seed baseline data if empty on startup."""
    try:
        init_db()
        print("[SERA] Database initialized.")
        _ensure_baseline_data()
    except Exception as e:
        print(f"[SERA] DB init warning: {e}")
    yield


app = FastAPI(
    title="SERA - System for Equipment Reliability Assessment",
    description="Intelligent Manufacturing Unified Dashboard — CALIBER 2026",
    version="1.0.0",
    lifespan=lifespan,
)

# Production CORS configuration
raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000,*")
allowed_origins = [orig.strip() for orig in raw_origins.split(",") if orig.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if "*" not in allowed_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(equipment.router, prefix="/api/equipment", tags=["Equipment"])
app.include_router(incidents.router, prefix="/api/incidents", tags=["Incidents"])
app.include_router(ingestion.router, prefix="/api/ingestion", tags=["Ingestion"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(recommendations.router, prefix="/api/recommendation", tags=["Recommendations"])
app.include_router(follow_up.router, prefix="/api/follow-up", tags=["FollowUp"])
app.include_router(audit.router, prefix="/api/audit", tags=["Audit"])



@app.get("/")
def root():
    return {
        "system": "SERA",
        "version": "1.0.0",
        "status": "operational",
        "description": "System for Equipment Reliability Assessment — CALIBER 2026"
    }


@app.get("/health")
def health():
    db_connected = False
    try:
        from sqlalchemy import text
        from database.connection import engine
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_connected = True
    except Exception:
        db_connected = False

    return {
        "status": "healthy" if db_connected else "degraded",
        "database": "connected" if db_connected else "disconnected",
        "version": "1.0.0",
        "environment": os.getenv("SERA_ENV", "production"),
    }


@app.get("/ready")
def ready():
    """Readiness probe confirming database connectivity and initialized assets."""
    try:
        from sqlalchemy import text
        from database.connection import engine
        with engine.connect() as conn:
            conn.execute(text("SELECT count(*) FROM equipment"))
        return {
            "status": "ready",
            "database": "connected",
            "initialized": True,
            "version": "1.0.0"
        }
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail=f"Service not ready: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
