"""
Incidents API — historical incident database
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from database.connection import get_db
from models.db_models import Incident

router = APIRouter()


@router.get("")
def list_incidents(
    equipment_id: Optional[str] = None,
    problem: Optional[str] = None,
    limit: int = 400,
    db: Session = Depends(get_db)
):
    """List incidents with optional filters."""
    query = db.query(Incident).order_by(Incident.incident_date.desc())

    if equipment_id:
        query = query.filter(Incident.equipment_id == equipment_id.upper())

    if problem:
        query = query.filter(Incident.problem.ilike(f"%{problem}%"))

    incidents = query.limit(limit).all()

    return [_to_dict(i) for i in incidents]


@router.get("/similar")
def get_similar_incidents(
    equipment_id: str,
    problem_types: Optional[str] = Query(None, description="Comma-separated problem types"),
    limit: int = 5,
    db: Session = Depends(get_db)
):
    """Find similar historical incidents for RCA."""
    from analytics.rca import find_similar_incidents
    from analytics.detection import detect_problems
    from models.db_models import EquipmentCondition
    from api.equipment import _condition_to_dict

    if problem_types:
        types = [p.strip() for p in problem_types.split(",") if p.strip()]
    else:
        conditions = (
            db.query(EquipmentCondition)
            .filter(EquipmentCondition.equipment_id == equipment_id.upper())
            .order_by(EquipmentCondition.timestamp)
            .all()
        )
        cond_dicts = [_condition_to_dict(c) for c in conditions]
        detected = detect_problems(cond_dicts)
        types = [d["problem_type"] for d in detected]
        if not types:
            from analytics.equipment_thresholds import get_equipment_config
            cfg = get_equipment_config(equipment_id.upper())
            types = [cfg["dominant_failure_mode"]] if (cfg and cfg.get("dominant_failure_mode")) else []

    all_incidents = db.query(Incident).all()
    all_dicts = [_to_dict(i) for i in all_incidents]

    similar = find_similar_incidents(types, equipment_id.upper(), all_dicts, max_results=limit)
    return similar



@router.get("/{incident_id}")
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    """Get incident detail by ID."""
    from fastapi import HTTPException
    import uuid
    try:
        inc = db.query(Incident).filter(Incident.id == uuid.UUID(incident_id)).first()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid incident ID")
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    return _to_dict(inc)


def _to_dict(i: Incident) -> dict:
    return {
        "id": str(i.id),
        "equipment_id": i.equipment_id,
        "incident_date": str(i.incident_date),
        "incident_title": i.incident_title,
        "problem": i.problem,
        "root_cause": i.root_cause,
        "root_cause_category": i.root_cause_category,
        "downtime_hours": i.downtime_hours,
        "production_loss": i.production_loss,
        "financial_loss": i.financial_loss,
        "corrective_action": i.corrective_action,
        "preventive_action": i.preventive_action,
        "severity": i.severity,
        "status": i.status,
    }
