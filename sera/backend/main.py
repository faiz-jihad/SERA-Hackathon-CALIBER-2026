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

from database.connection import init_db
from api import dashboard, equipment, incidents, ingestion, analysis, recommendations, follow_up


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    try:
        init_db()
        print("[SERA] Database initialized.")
    except Exception as e:
        print(f"[SERA] DB init warning: {e}")
    yield


app = FastAPI(
    title="SERA - System for Equipment Reliability Assessment",
    description="Intelligent Manufacturing Unified Dashboard — CALIBER 2026",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
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
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
