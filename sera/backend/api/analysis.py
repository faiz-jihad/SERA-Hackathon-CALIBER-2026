"""
Analysis API — detect problems, run RCA on demand
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime

from database.connection import get_db
from models.db_models import (
    Equipment, EquipmentCondition, Incident,
    DetectedProblem, RCAResult
)
from analytics.detection import detect_problems
from analytics.rca import run_rca, find_similar_incidents
from api.equipment import _condition_to_dict, _incident_to_dict

router = APIRouter()


@router.post("/detect")
def detect_equipment_problems(
    equipment_id: str,
    db: Session = Depends(get_db)
):
    """
    Run detection engine on latest equipment data.
    Saves results to detected_problems table.
    """
    equip = db.query(Equipment).filter(Equipment.equipment_id == equipment_id).first()
    if not equip:
        raise HTTPException(status_code=404, detail=f"Equipment {equipment_id} not found")

    conditions = (
        db.query(EquipmentCondition)
        .filter(EquipmentCondition.equipment_id == equipment_id)
        .order_by(EquipmentCondition.timestamp)
        .all()
    )

    if not conditions:
        return {"equipment_id": equipment_id, "detected": [], "message": "No condition data available"}

    condition_dicts = [_condition_to_dict(c) for c in conditions]
    detected = detect_problems(condition_dicts)

    # Save to DB
    saved_ids = []
    for prob in detected:
        dp = DetectedProblem(
            equipment_id=equipment_id,
            problem_type=prob["problem_type"],
            severity=prob["severity"],
            evidence=prob["evidence"],
            parameters=prob["parameters"],
            status="OPEN",
        )
        db.add(dp)
        db.flush()
        saved_ids.append(str(dp.id))

    db.commit()

    return {
        "equipment_id": equipment_id,
        "detected": detected,
        "saved_problem_ids": saved_ids,
        "total": len(detected),
    }


@router.post("/rca")
def run_rca_analysis(
    equipment_id: str,
    problem_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Run RCA for an equipment.
    Uses current data + historical incidents.
    """
    equip = db.query(Equipment).filter(Equipment.equipment_id == equipment_id).first()
    if not equip:
        raise HTTPException(status_code=404, detail=f"Equipment {equipment_id} not found")

    # Get conditions
    conditions = (
        db.query(EquipmentCondition)
        .filter(EquipmentCondition.equipment_id == equipment_id)
        .order_by(EquipmentCondition.timestamp)
        .all()
    )
    condition_dicts = [_condition_to_dict(c) for c in conditions]

    # Get detected problems
    detected = detect_problems(condition_dicts)
    problem_types = [d["problem_type"] for d in detected]
    parameters = {}
    for d in detected:
        parameters.update(d.get("parameters", {}))

    # Get all incidents
    all_incidents = db.query(Incident).all()
    all_incident_dicts = [_incident_to_dict(i) for i in all_incidents]

    # Find similar incidents
    similar = find_similar_incidents(problem_types, equipment_id, all_incident_dicts)

    # Run RCA
    rca_result = run_rca(problem_types, parameters, similar)

    # Save RCA result
    prob_uuid = None
    if problem_id:
        try:
            prob_uuid = uuid.UUID(problem_id)
        except ValueError:
            pass

    rca_record = RCAResult(
        problem_id=prob_uuid,
        equipment_id=equipment_id,
        possible_root_causes=rca_result.get("all_candidates", []),
        primary_root_cause=rca_result.get("primary_root_cause"),
        confidence_level=rca_result.get("confidence_level"),
        evidence=rca_result.get("evidence"),
        similar_incidents=similar,
    )
    db.add(rca_record)
    db.commit()
    db.refresh(rca_record)

    return {
        "equipment_id": equipment_id,
        "rca_id": str(rca_record.id),
        "problem_types": problem_types,
        "rca": rca_result,
        "similar_incidents": similar,
    }


@router.post("/investigate")
def run_investigation_endpoint(
    equipment_id: str,
    db: Session = Depends(get_db)
):
    """
    Run the SERA Investigation Agent (LangGraph) for an equipment asset.
    Orchestrates: Detect -> Evidence -> Trend -> Production -> Downtime -> Incident Match -> RCA -> Recommendations -> Review.
    """
    from agent.investigation_agent import run_sera_investigation
    try:
        agent_result = run_sera_investigation(equipment_id.upper())
        return {
            "status": "success",
            "equipment_id": equipment_id.upper(),
            "investigation": agent_result,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Investigation agent error: {str(e)}")

