"""
Dashboard API — Plant overview, KPIs, summary metrics
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta, date

from database.connection import get_db
from models.db_models import Equipment, EquipmentCondition, DowntimeRecord, Incident, DetectedProblem

router = APIRouter()


@router.get("/overview")
def get_dashboard_overview(db: Session = Depends(get_db)):
    """
    Returns plant-level KPIs for main dashboard.
    """
    # Equipment counts
    total_equipment = db.query(Equipment).count()
    status_counts = {}
    for status in ["NORMAL", "WARNING", "ALARM", "CRITICAL", "TRIP"]:
        status_counts[status.lower()] = db.query(Equipment).filter(Equipment.status == status).count()

    # Active problems
    active_problems = db.query(DetectedProblem).filter(DetectedProblem.status == "OPEN").count()

    # Total fleet downtime across all records
    total_downtime = (
        db.query(func.coalesce(func.sum(DowntimeRecord.duration_hours), 0.0)).scalar()
    ) or 0.0

    # Total production loss
    total_prod_loss = (
        db.query(func.coalesce(func.sum(DowntimeRecord.production_loss), 0.0)).scalar()
    ) or 0.0

    # Total financial loss
    total_fin_loss = (
        db.query(func.coalesce(func.sum(DowntimeRecord.financial_loss), 0.0)).scalar()
    ) or 0.0

    # Total incident metrics from 380 records
    total_incidents = db.query(func.count(Incident.id)).scalar() or 0
    total_incident_loss = (
        db.query(func.coalesce(func.sum(Incident.financial_loss), 0.0)).scalar()
    ) or 0.0
    total_incident_downtime = (
        db.query(func.coalesce(func.sum(Incident.downtime_hours), 0.0)).scalar()
    ) or 0.0

    # Equipment list with latest status
    equipments = db.query(Equipment).order_by(Equipment.equipment_id).all()
    equipment_list = [
        {
            "equipment_id": e.equipment_id,
            "name": e.name,
            "type": e.equipment_type,
            "location": e.location,
            "unit": e.unit,
            "status": e.status,
        }
        for e in equipments
    ]

    return {
        "total_equipment": total_equipment,
        "status_summary": {
            "normal": status_counts.get("normal", 0),
            "warning": status_counts.get("warning", 0),
            "alarm": status_counts.get("alarm", 0),
            "critical": status_counts.get("critical", 0),
            "trip": status_counts.get("trip", 0),
        },
        "active_problems": active_problems,
        "downtime_hours_30d": round(float(total_downtime), 1),
        "production_loss_30d": round(float(total_prod_loss), 1),
        "financial_loss_30d": round(float(total_fin_loss), 2),
        "recent_incidents_90d": int(total_incidents),
        "total_incidents": int(total_incidents),
        "total_incident_loss": round(float(total_incident_loss), 2),
        "total_incident_downtime": round(float(total_incident_downtime), 1),
        "equipment": equipment_list,
    }
