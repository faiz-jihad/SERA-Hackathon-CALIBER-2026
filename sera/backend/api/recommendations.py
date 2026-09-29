"""
Recommendations API — generate, list, and review recommendations
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime

from database.connection import get_db
from models.db_models import (
    Equipment, EquipmentCondition, Incident,
    DetectedProblem, RCAResult, Recommendation
)
from analytics.detection import detect_problems
from analytics.rca import run_rca, find_similar_incidents
from services.ai_recommendation import generate_recommendation
from api.equipment import _condition_to_dict, _incident_to_dict

router = APIRouter()


class ReviewRequest(BaseModel):
    review_status: str  # ACCEPTED, MODIFIED, REJECTED
    engineer_notes: Optional[str] = None
    reviewed_by: Optional[str] = "Engineer"
    final_action: Optional[str] = None


@router.post("")
def create_recommendation(
    equipment_id: str,
    problem_id: Optional[str] = None,
    rca_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Generate AI recommendation for equipment.
    Uses structured evidence from detection + RCA engines.
    """
    equip = db.query(Equipment).filter(Equipment.equipment_id == equipment_id).first()
    if not equip:
        raise HTTPException(status_code=404, detail=f"Equipment {equipment_id} not found")

    # Get condition data
    conditions = (
        db.query(EquipmentCondition)
        .filter(EquipmentCondition.equipment_id == equipment_id)
        .order_by(EquipmentCondition.timestamp)
        .all()
    )
    condition_dicts = [_condition_to_dict(c) for c in conditions]

    # Run detection and RCA
    detected = detect_problems(condition_dicts)
    problem_types = [d["problem_type"] for d in detected]
    parameters = {}
    evidence_list = []
    for d in detected:
        parameters.update(d.get("parameters", {}))
        evidence_list.extend(d.get("evidence", []))

    # Historical incidents
    all_incidents = db.query(Incident).all()
    all_incident_dicts = [_incident_to_dict(i) for i in all_incidents]
    similar = find_similar_incidents(problem_types, equipment_id, all_incident_dicts)

    # RCA
    rca_result = run_rca(problem_types, parameters, similar)

    # Generate AI recommendation
    ai_rec = generate_recommendation(
        equipment_id=equipment_id,
        problem_types=problem_types,
        detection_evidence=evidence_list,
        rca_result=rca_result,
        similar_incidents=similar,
    )

    # Parse IDs
    prob_uuid = None
    rca_uuid = None
    if problem_id:
        try:
            prob_uuid = uuid.UUID(problem_id)
        except ValueError:
            pass
    if rca_id:
        try:
            rca_uuid = uuid.UUID(rca_id)
        except ValueError:
            pass

    # Save to DB
    rec = Recommendation(
        problem_id=prob_uuid,
        rca_id=rca_uuid,
        equipment_id=equipment_id,
        problem_summary=ai_rec.get("problem_summary"),
        root_cause_explanation=rca_result.get("explanation"),
        corrective_action=ai_rec.get("corrective_action"),
        preventive_action=ai_rec.get("preventive_action"),
        evidence={
            "detection_evidence": evidence_list,
            "rca_evidence": rca_result.get("evidence", []),
            "similar_incidents_count": len(similar),
        },
        confidence_level=ai_rec.get("evidence_strength"),
        review_status="PENDING",
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)

    return {
        "recommendation_id": str(rec.id),
        "equipment_id": equipment_id,
        "problem_summary": rec.problem_summary,
        "root_cause_explanation": rec.root_cause_explanation,
        "corrective_action": rec.corrective_action,
        "preventive_action": rec.preventive_action,
        "evidence": rec.evidence,
        "confidence_level": rec.confidence_level,
        "review_status": rec.review_status,
        "ai_source": ai_rec.get("source", "unknown"),
        "notes": ai_rec.get("notes"),
    }


@router.get("")
def list_recommendations(
    equipment_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """List recommendations."""
    query = db.query(Recommendation).order_by(Recommendation.generated_at.desc())

    if equipment_id:
        query = query.filter(Recommendation.equipment_id == equipment_id.upper())
    if status:
        query = query.filter(Recommendation.review_status == status.upper())

    recs = query.limit(limit).all()
    return [_rec_to_dict(r) for r in recs]


@router.post("/{rec_id}/review")
def review_recommendation(
    rec_id: str,
    body: ReviewRequest,
    db: Session = Depends(get_db)
):
    """
    Engineer reviews a recommendation — Accept, Modify, or Reject.
    """
    try:
        rec_uuid = uuid.UUID(rec_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid recommendation ID")

    rec = db.query(Recommendation).filter(Recommendation.id == rec_uuid).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    valid_statuses = {"ACCEPTED", "MODIFIED", "REJECTED"}
    status = body.review_status.upper()
    if status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {valid_statuses}"
        )

    rec.review_status = status
    rec.engineer_notes = body.engineer_notes
    rec.reviewed_by = body.reviewed_by or "Engineer"
    rec.reviewed_at = datetime.utcnow()
    rec.final_action = body.final_action

    db.commit()
    db.refresh(rec)

    return _rec_to_dict(rec)


@router.get("/{rec_id}")
def get_recommendation(rec_id: str, db: Session = Depends(get_db)):
    """Get recommendation by ID."""
    try:
        rec_uuid = uuid.UUID(rec_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid recommendation ID")

    rec = db.query(Recommendation).filter(Recommendation.id == rec_uuid).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    return _rec_to_dict(rec)


def _rec_to_dict(r: Recommendation) -> dict:
    return {
        "id": str(r.id),
        "equipment_id": r.equipment_id,
        "generated_at": str(r.generated_at),
        "problem_summary": r.problem_summary,
        "root_cause_explanation": r.root_cause_explanation,
        "corrective_action": r.corrective_action,
        "preventive_action": r.preventive_action,
        "evidence": r.evidence,
        "confidence_level": r.confidence_level,
        "review_status": r.review_status,
        "engineer_notes": r.engineer_notes,
        "reviewed_at": str(r.reviewed_at) if r.reviewed_at else None,
        "reviewed_by": r.reviewed_by,
        "final_action": r.final_action,
    }
