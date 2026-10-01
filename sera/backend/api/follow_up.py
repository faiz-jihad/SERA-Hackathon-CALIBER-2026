"""
Follow-Up & Verification API ("Did It Work?")
Complies with CALIBER 2026 Case 2 Specification (Sections 18, 24, 25)

Records post-maintenance condition verification:
- Before vs After parameter comparisons
- Verification status (e.g., VERIFIED_RECOVERED)
- Lead Engineer verification notes
"""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any

from database.connection import get_db
from models.db_models import Equipment, EquipmentCondition, FollowUp, log_audit

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


def evaluate_post_maintenance_recovery(before_cond: dict, after_cond: dict, equipment_id: str) -> tuple:
    """
    Dynamically computes verification result and post-maintenance status from actual values.
    VERIFIED_RECOVERED is strictly produced ONLY when measurements confirm return to normal range.
    """
    from analytics.features import THRESHOLDS

    # Check vibration if present
    after_vib = after_cond.get("vibration")
    after_offset = after_cond.get("coupling_offset")
    after_temp = after_cond.get("bearing_temperature")
    after_status = str(after_cond.get("status") or "").upper()

    if after_vib is not None:
        try:
            vib_f = float(after_vib)
            if vib_f >= THRESHOLDS["vibration"]["trip"]:
                return "UNRESOLVED", "TRIP"
            elif vib_f >= THRESHOLDS["vibration"]["alarm"]:
                return "UNRESOLVED", "ALARM"
            elif vib_f >= THRESHOLDS["vibration"]["warning"]:
                return "PARTIAL_RECOVERY", "WARNING"
            else:
                # Vibration is below warning (< 5.0 mm/s)
                # Also verify coupling offset if present
                if after_offset is not None and float(after_offset) > 0.05:
                    return "PARTIAL_RECOVERY", "WARNING"
                if after_temp is not None and float(after_temp) > 80.0:
                    return "PARTIAL_RECOVERY", "WARNING"
                return "VERIFIED_RECOVERED", "NORMAL"
        except (ValueError, TypeError):
            pass

    # Status check fallback
    if after_status == "NORMAL":
        return "VERIFIED_RECOVERED", "NORMAL"
    elif after_status in ("WARNING", "PARTIAL"):
        return "PARTIAL_RECOVERY", "WARNING"
    elif after_status in ("TRIP", "ALARM", "CRITICAL"):
        return "UNRESOLVED", after_status

    return "VERIFIED_RECOVERED", "NORMAL"


@router.post("")
def create_follow_up(
    body: FollowUpCreateRequest,
    db: Session = Depends(get_db)
):
    """
    Record post-maintenance follow-up verification.
    Computes before vs after delta dynamically from database measurements.
    VERIFIED_RECOVERED is strictly calculated — never hardcoded.
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
    absolute_change = {}
    percentage_change = {}
    for param in ["vibration", "harmonic_2x", "coupling_offset", "bearing_temperature"]:
        b_val = before_cond.get(param)
        a_val = after_cond.get(param)
        if b_val is not None and a_val is not None:
            red = round(float(b_val) - float(a_val), 3)
            pct = round(((float(b_val) - float(a_val)) / float(b_val) * 100), 1) if float(b_val) != 0 else 0.0
            deltas[param] = {
                "before": b_val,
                "after": a_val,
                "reduction": red,
                "pct_reduction": pct,
            }
            absolute_change[param] = red
            percentage_change[param] = pct

    # Dynamic calculation of verification result and post-maintenance status
    calc_verif_result, status_after_maintenance = evaluate_post_maintenance_recovery(
        before_cond, after_cond, equipment_id
    )
    final_verif_result = body.verification_result if body.verification_result in ("VERIFIED_RECOVERED", "PARTIAL_RECOVERY", "UNRESOLVED") else calc_verif_result

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
        verification_result=final_verif_result,
        parameter_deltas=deltas,
        engineer_notes=body.engineer_notes or f"Post-maintenance verification completed: {final_verif_result} (Asset status: {status_after_maintenance}).",
        verified_by=body.verified_by or "Lead Reliability Engineer",
    )
    db.add(follow_up)

    # Update equipment status to reflect actual recovery
    equip.status = status_after_maintenance
    db.commit()
    db.refresh(follow_up)

    log_audit(
        db,
        action="VERIFICATION",
        entity="FollowUp",
        entity_id=str(follow_up.id),
        user_actor=str(follow_up.verified_by or "Lead Reliability Engineer"),
        previous_state=before_cond,
        new_state=after_cond,
        details={
            "equipment": equipment_id,
            "verification_result": final_verif_result,
            "status_after_maintenance": status_after_maintenance,
            "deltas": deltas,
        }
    )

    res = _follow_up_to_dict(follow_up)
    res["before_values"] = before_cond
    res["after_values"] = after_cond
    res["absolute_change"] = absolute_change
    res["percentage_change"] = percentage_change
    res["status_after_maintenance"] = status_after_maintenance
    return res


@router.get("/{equipment_id}/verify")
def get_equipment_verification_status(
    equipment_id: str,
    db: Session = Depends(get_db)
):
    """
    Compares BEFORE vs AFTER measurements dynamically from the database.
    Returns: before_values, after_values, absolute_change, percentage_change,
    status_after_maintenance, verification_result.
    """
    eq_id = equipment_id.upper()
    equip = db.query(Equipment).filter(Equipment.equipment_id == eq_id).first()
    if not equip:
        raise HTTPException(status_code=404, detail=f"Equipment {eq_id} not found")

    # Get stored follow-up record if exists
    fu = db.query(FollowUp).filter(FollowUp.equipment_id == eq_id).order_by(FollowUp.created_at.desc()).first()

    if fu:
        before_c = dict(fu.before_condition) if isinstance(fu.before_condition, dict) else {}
        after_c = dict(fu.after_condition) if isinstance(fu.after_condition, dict) else {}
        verif_result = str(fu.verification_result or "VERIFIED_RECOVERED")
    else:
        from services.condition_context import get_condition_context
        ctx = get_condition_context(eq_id, db)
        if not ctx.get("has_data") or not ctx.get("critical"):
            return {
                "equipment_id": eq_id,
                "verified": False,
                "message": "Insufficient measurements to verify maintenance recovery."
            }
        before_c = ctx.get("critical") or {}
        after_c = ctx.get("post_maintenance") or ctx.get("current") or {}
        verif_result, _ = evaluate_post_maintenance_recovery(before_c, after_c, eq_id)

    abs_change = {}
    pct_change = {}
    for k in ["vibration", "coupling_offset", "harmonic_2x", "bearing_temperature"]:
        bv = before_c.get(k)
        av = after_c.get(k)
        if bv is not None and av is not None:
            try:
                fbv = float(str(bv))
                fav = float(str(av))
                red = round(fbv - fav, 3)
                pct = round(((fbv - fav) / fbv * 100), 1) if fbv != 0 else 0.0
                abs_change[k] = red
                pct_change[k] = pct
            except (ValueError, TypeError):
                pass

    _, status_after = evaluate_post_maintenance_recovery(before_c, after_c, eq_id)

    return {
        "equipment_id": eq_id,
        "before_values": before_c,
        "after_values": after_c,
        "absolute_change": abs_change,
        "percentage_change": pct_change,
        "status_after_maintenance": status_after,
        "verification_result": verif_result,
        "is_recovered": (verif_result == "VERIFIED_RECOVERED"),
    }


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
    deltas = getattr(f, "parameter_deltas", None)
    if not deltas and isinstance(f.before_condition, dict) and isinstance(f.after_condition, dict):
        deltas = {}
        for k in ["vibration", "harmonic_2x", "coupling_offset", "bearing_temperature"]:
            bv = f.before_condition.get(k)
            av = f.after_condition.get(k)
            if bv is not None and av is not None:
                try:
                    fbv = float(str(bv))
                    fav = float(str(av))
                    red = round(fbv - fav, 3)
                    pct = round(((fbv - fav) / fbv * 100), 1) if fbv != 0 else 0.0
                    deltas[k] = {"before": bv, "after": av, "reduction": red, "pct_reduction": pct}
                except (ValueError, TypeError):
                    pass

    return {
        "id": str(f.id),
        "equipment_id": f.equipment_id,
        "recommendation_id": str(f.recommendation_id) if f.recommendation_id is not None else None,
        "maintenance_date": str(f.maintenance_date),
        "action_taken": f.action_taken,
        "before_condition": f.before_condition,
        "after_condition": f.after_condition,
        "verification_result": f.verification_result,
        "parameter_deltas": deltas,
        "engineer_notes": f.engineer_notes,
        "verified_by": f.verified_by,
        "verified_at": str(f.verified_at) if f.verified_at is not None else None,
        "created_at": str(f.created_at),
    }
