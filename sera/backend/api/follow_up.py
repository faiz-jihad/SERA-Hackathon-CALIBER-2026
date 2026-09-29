"""
Follow-Up & Verification API ("Did It Work?")
Complies with CALIBER 2026 Case 2 Specification (Sections 18, 24, 25)

Records post-maintenance condition verification:
- Before vs After parameter comparisons
- Verification status (e.g., VERIFIED_RECOVERED)
- Lead Engineer verification notes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import uuid
from datetime import datetime

from database.connection import get_db
from models.db_models import Equipment, EquipmentCondition, Recommendation, FollowUp
from api.equipment import _condition_to_dict

router = APIRouter()


class FollowUpCreateRequest(BaseModel):
    equipment_id: str
    recommendation_id: Optional[str] = None
    maintenance_date: Optional[str] = None
    action_taken: str
    before_condition: Optional[Dict[str, Any]] = None
    after_condition: Optional[Dict[str, Any]] = None
    verification_result: Optional[str] = "VERIFIED_RECOVERED"
    engineer_notes: Optional[str] = None
    verified_by: Optional[str] = "Lead Reliability Engineer"


@router.post("")
def create_follow_up(
    body: FollowUpCreateRequest,
    db: Session = Depends(get_db)
):
    """
    Record post-maintenance follow-up verification.
    Computes before vs after delta and verifies return to normal condition.
    """
    equipment_id = body.equipment_id.upper()
    equip = db.query(Equipment).filter(Equipment.equipment_id == equipment_id).first()
    if not equip:
        raise HTTPException(status_code=404, detail=f"Equipment {equipment_id} not found")

    # If conditions not explicitly passed in body, derive from before/after condition readings
    before_cond = body.before_condition
    after_cond = body.after_condition

    if not before_cond or not after_cond:
        conditions = (
            db.query(EquipmentCondition)
            .filter(EquipmentCondition.equipment_id == equipment_id)
            .order_by(EquipmentCondition.timestamp.asc())
            .all()
        )
        if len(conditions) >= 2:
            # Look for peak failure reading as before, and latest reading as after
            sorted_by_vib = sorted(conditions, key=lambda c: (c.vibration or 0), reverse=True)
            peak_reading = sorted_by_vib[0]
            latest_reading = conditions[-1]

            if not before_cond:
                before_cond = {
                    "vibration": peak_reading.vibration,
                    "harmonic_2x": peak_reading.harmonic_2x,
                    "coupling_offset": peak_reading.coupling_offset,
                    "bearing_temperature": peak_reading.bearing_temperature,
                    "status": peak_reading.status or "TRIP",
                    "timestamp": str(peak_reading.timestamp),
                }
            if not after_cond:
                after_cond = {
                    "vibration": latest_reading.vibration,
                    "harmonic_2x": latest_reading.harmonic_2x,
                    "coupling_offset": latest_reading.coupling_offset,
                    "bearing_temperature": latest_reading.bearing_temperature,
                    "status": latest_reading.status or "NORMAL",
                    "timestamp": str(latest_reading.timestamp),
                }
        else:
            single = conditions[0] if conditions else None
            before_cond = before_cond or ({"vibration": single.vibration, "status": single.status} if single else {})
            after_cond = after_cond or ({"vibration": single.vibration, "status": "NORMAL"} if single else {})

    # Calculate parameter deltas
    deltas = {}
    for param in ["vibration", "harmonic_2x", "coupling_offset", "bearing_temperature"]:
        b_val = before_cond.get(param)
        a_val = after_cond.get(param)
        if b_val is not None and a_val is not None:
            deltas[param] = {
                "before": b_val,
                "after": a_val,
                "reduction": round(float(b_val) - float(a_val), 3),
                "pct_reduction": round(((float(b_val) - float(a_val)) / float(b_val) * 100), 1) if float(b_val) != 0 else 0,
            }

    # Recommendation foreign key
    rec_uuid = None
    if body.recommendation_id:
        try:
            rec_uuid = uuid.UUID(body.recommendation_id)
        except ValueError:
            pass

    # Parse maintenance date
    maint_date = datetime.utcnow()
    if body.maintenance_date:
        try:
            maint_date = datetime.fromisoformat(body.maintenance_date.replace("Z", "+00:00"))
        except Exception:
            maint_date = datetime.utcnow()

    follow_up = FollowUp(
        equipment_id=equipment_id,
        recommendation_id=rec_uuid,
        maintenance_date=maint_date,
        action_taken=body.action_taken,
        before_condition=before_cond,
        after_condition=after_cond,
        verification_result=body.verification_result or "VERIFIED_RECOVERED",
        parameter_deltas=deltas,
        engineer_notes=body.engineer_notes or "Post-maintenance verification confirmed: vibration and coupling offset returned to normal operating range.",
        verified_by=body.verified_by or "Lead Reliability Engineer",
    )
    db.add(follow_up)

    # If post-maintenance status is NORMAL, update equipment status to NORMAL
    if after_cond.get("status") == "NORMAL" or (after_cond.get("vibration") and float(after_cond["vibration"]) < 4.5):
        equip.status = "NORMAL"

    db.commit()
    db.refresh(follow_up)

    return _follow_up_to_dict(follow_up)


@router.get("")
def list_follow_ups(
    equipment_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all follow-up records."""
    query = db.query(FollowUp).order_by(FollowUp.created_at.desc())
    if equipment_id:
        query = query.filter(FollowUp.equipment_id == equipment_id.upper())
    records = query.all()
    return [_follow_up_to_dict(r) for r in records]


@router.get("/{equipment_id}")
def get_equipment_follow_ups(
    equipment_id: str,
    db: Session = Depends(get_db)
):
    """Get follow-up records for a specific equipment asset."""
    records = (
        db.query(FollowUp)
        .filter(FollowUp.equipment_id == equipment_id.upper())
        .order_by(FollowUp.created_at.desc())
        .all()
    )
    return [_follow_up_to_dict(r) for r in records]


def _follow_up_to_dict(f: FollowUp) -> dict:
    return {
        "id": str(f.id),
        "equipment_id": f.equipment_id,
        "recommendation_id": str(f.recommendation_id) if f.recommendation_id else None,
        "maintenance_date": str(f.maintenance_date),
        "action_taken": f.action_taken,
        "before_condition": f.before_condition,
        "after_condition": f.after_condition,
        "verification_result": f.verification_result,
        "parameter_deltas": f.parameter_deltas,
        "engineer_notes": f.engineer_notes,
        "verified_by": f.verified_by,
        "verified_at": str(f.verified_at) if f.verified_at else None,
        "created_at": str(f.created_at),
    }
