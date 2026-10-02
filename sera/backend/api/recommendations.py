"""
Recommendations API — generate, list, and review recommendations
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import uuid
import re
from datetime import datetime, timezone

from database.connection import get_db
from models.db_models import (
    Equipment, EquipmentCondition, Incident, Recommendation,
    WorkOrderRecommendation, log_audit
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
    for d in detected:
        parameters.update(d.get("parameters", {}))

    # Ground parameters and evidence in canonical condition context
    from services.condition_context import get_condition_context
    ctx = get_condition_context(equipment_id, db)
    crit_c = ctx.get("critical") or ctx.get("current") or {}
    for k in ["vibration", "harmonic_2x", "coupling_offset", "bearing_temperature", "motor_temperature"]:
        if crit_c.get(k) is not None:
            parameters[k] = crit_c[k]

    from analytics.evidence_engine import build_evidence_layer
    evidence_items = build_evidence_layer(condition_dicts, equipment_id)
    evidence_list = [f"[{e['evidence_id']}] {e['parameter']}: observed {e['observed_value']} {e['unit']} ({e['severity']}) - {e['interpretation']}" for e in evidence_items]

    # Historical incidents
    all_incidents = db.query(Incident).all()
    all_incident_dicts = [_incident_to_dict(i) for i in all_incidents]
    similar = find_similar_incidents(problem_types, equipment_id, all_incident_dicts, current_evidence=evidence_list)

    # Dynamic RCA derived directly from canonical evidence and engineering rules
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

    from models.db_models import log_audit
    log_audit(
        db,
        action="RECOMMENDATION",
        entity="Recommendation",
        entity_id=str(rec.id),
        user_actor="RECOMMENDATION_ENGINE",
        details={
            "equipment": equipment_id,
            "confidence": rec.confidence_level,
            "ai_source": ai_rec.get("source", "rule_based")
        }
    )

    observed_cond = str(equip.status) if (equip and equip.status is not None) else "NORMAL"
    priority_level = "CRITICAL" if observed_cond in ("TRIP", "CRITICAL") else ("HIGH" if observed_cond in ("ALARM", "WARNING") else "MEDIUM")

    return {
        "recommendation_id": str(rec.id),
        "id": str(rec.id),
        "equipment_id": equipment_id,
        "equipment": equipment_id,
        "observed_condition": observed_cond,
        "problem_summary": rec.problem_summary,
        "root_cause_explanation": rec.root_cause_explanation,
        "recommended_action": rec.corrective_action,
        "corrective_action": rec.corrective_action,
        "preventive_action": rec.preventive_action,
        "risk_priority": priority_level,
        "priority": priority_level,
        "inspection_rationale": "Verify coupling alignment tolerances (< 0.05 mm) and soft-foot (< 0.05 mm) to halt vibration degradation.",
        "supporting_historical_evidence": [
            {
                "incident_id": inc.get("incident_id") or str(inc.get("id", "")),
                "similarity_score": inc.get("similarity_score") or inc.get("similarity", 0.0),
                "historical_event": inc.get("historical_event") or inc.get("incident_title", ""),
                "historical_action": inc.get("historical_action") or inc.get("corrective_action", "")
            }
            for inc in similar[:3]
        ],
        "engineer_review_requirement": "Mandatory Lead Reliability Engineer sign-off required prior to work order release.",
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
    Traceable: Records reviewer, decision, final action, engineer notes, and timestamp.
    The AI never silently becomes the final authority.
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

    prev_status = rec.review_status
    prev_notes = rec.engineer_notes

    setattr(rec, "review_status", status)
    setattr(rec, "engineer_notes", body.engineer_notes)
    setattr(rec, "reviewed_by", body.reviewed_by or "Lead Reliability Engineer")
    setattr(rec, "reviewed_at", datetime.now(timezone.utc))
    final_act = body.final_action if status == "MODIFIED" else (rec.corrective_action if status == "ACCEPTED" else None)
    setattr(rec, "final_action", final_act)

    # Persist or update WorkOrderRecommendation draft
    wo_ref = f"WO-REC-{rec.equipment_id}-{str(rec.id)[:8].upper()}"
    existing_wo = db.query(WorkOrderRecommendation).filter(WorkOrderRecommendation.recommendation_id == rec.id).first()

    eq = db.query(Equipment).filter(Equipment.equipment_id == rec.equipment_id).first()
    wo_priority = "CRITICAL" if eq and eq.status in ("TRIP", "CRITICAL") else "HIGH"

    approval_status = "APPROVED" if status == "ACCEPTED" else ("MODIFIED" if status == "MODIFIED" else "REJECTED")

    if not existing_wo and status in ("ACCEPTED", "MODIFIED"):
        wo_obj = WorkOrderRecommendation(
            work_order_reference=wo_ref,
            recommendation_id=rec.id,
            equipment=rec.equipment_id,
            priority=wo_priority,
            recommended_action=rec.final_action or rec.corrective_action or "Execute reliability repair plan",
            reason=rec.root_cause_explanation or rec.problem_summary or "Corrective action resulting from RCA",
            required_inspection="Laser alignment verification (< 0.05 mm), baseplate soft-foot measurement (< 0.05 mm), and coupling element inspection.",
            requested_timing="Immediate turnaround (< 24 hours)" if status == "ACCEPTED" else "Next planned opportunity",
            engineer_approval_status=approval_status,
            operations=[
                {"operation_number": "0010", "work_center": "MECH-01", "task": "Laser shaft realignment to < 0.05 mm", "pic": "ROT-01"},
                {"operation_number": "0020", "work_center": "MECH-01", "task": "Baseplate soft-foot check and 304SS shimming", "pic": "ROT-01"},
                {"operation_number": "0030", "work_center": "REL-05", "task": "Vibration baseline post-repair verification", "pic": "REL-05"}
            ],
            required_parts=[
                {"part_number": "CPL-SPIDER-OEM-57", "description": "Flexible Coupling Elastomer Spider Insert", "qty": 1, "unit": "EA"},
                {"part_number": "SHIM-SS304-005", "description": "Precision Pre-cut Shims SS304 set", "qty": 1, "unit": "SET"}
            ]
        )
        db.add(wo_obj)
    elif existing_wo:
        setattr(existing_wo, "engineer_approval_status", approval_status)
        if status in ("ACCEPTED", "MODIFIED"):
            setattr(existing_wo, "recommended_action", rec.final_action or rec.corrective_action)

    db.commit()
    db.refresh(rec)

    # Full audit log
    log_audit(
        db,
        action=f"REVIEW_{status}",
        entity="Recommendation",
        entity_id=str(rec.id),
        user_actor=str(rec.reviewed_by or "Lead Reliability Engineer"),
        previous_state={"review_status": prev_status, "notes": prev_notes},
        new_state={"review_status": rec.review_status, "final_action": rec.final_action, "notes": rec.engineer_notes},
        details={"equipment": rec.equipment_id, "work_order_reference": wo_ref}
    )

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


@router.get("/{rec_id}/work-order")
def get_recommendation_work_order(rec_id: str, db: Session = Depends(get_db)):
    """
    Format recommendation into Work Order Recommendation (Draft).
    Clarification per Requirement 16: Uses 'Work Order Recommendation' or 'Work Order Draft'.
    Does not claim live SAP integration when running in standalone mode.
    Returns: work_order_reference, equipment, priority, recommended action, reason,
    required inspection, requested timing, and engineer approval status.
    """
    try:
        rec_uuid = uuid.UUID(rec_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid recommendation ID")

    rec = db.query(Recommendation).filter(Recommendation.id == rec_uuid).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    eq = db.query(Equipment).filter(Equipment.equipment_id == rec.equipment_id).first()
    eq_digits = "".join(c for c in str(rec.equipment_id or "") if c.isdigit()) or "5702"
    wo_ref = f"WO-REC-{rec.equipment_id}-{str(rec.id)[:8].upper()}"

    operations = []
    lines = (rec.final_action or rec.corrective_action or "").split("\n")
    op_num = 10
    for line in lines:
        cleaned = line.strip()
        if not cleaned:
            continue
        cleaned = re.sub(r"^\d+[\.\)]\s*", "", cleaned)
        pic = "ROT-01 (Mechanical)"
        if "ROT" in cleaned:
            pic = "ROT-01 (Mechanical Turnaround Team)"
        elif "REL" in cleaned:
            pic = "REL-05 (Condition Monitoring Lead)"
        operations.append({
            "operation_number": f"{op_num:04d}",
            "work_center": "MECH-01",
            "task_description": cleaned,
            "assigned_pic": pic,
            "tolerance_spec": "< 0.05 mm" if "alignment" in cleaned.lower() else "OEM genuine spec",
            "duration_hours": 3.5,
            "completed": rec.review_status == "ACCEPTED"
        })
        op_num += 10

    priority_val = "P1 - Critical Equipment Emergency" if eq and eq.status in ("TRIP", "CRITICAL") else "P2 - High Priority Maintenance"
    rev_status = str(getattr(rec, "review_status", "") or "")

    return {
        # Structured fields required by Section 16
        "work_order_reference": wo_ref,
        "equipment": rec.equipment_id,
        "equipment_id": rec.equipment_id,
        "equipment_name": eq.name if eq else rec.equipment_id,
        "priority": priority_val,
        "recommended_action": rec.final_action or rec.corrective_action,
        "reason": rec.root_cause_explanation or rec.problem_summary or "Identified during SERA reliability detection",
        "required_inspection": "Precision laser alignment verification (< 0.05 mm), motor foot soft-foot measurement (< 0.05 mm), and coupling spider insert inspection.",
        "requested_timing": "Immediate (< 24 hours turnaround)" if rev_status == "ACCEPTED" else "Next Planned Maintenance Window",
        "engineer_approval_status": "APPROVED" if rev_status == "ACCEPTED" else ("MODIFIED" if rev_status == "MODIFIED" else rev_status),
        # Contextual and UI fields
        "work_order_type": "Work Order Recommendation (Draft)",
        "sap_system_status": "WORK ORDER DRAFT - APPROVED BY ENGINEER" if rev_status == "ACCEPTED" else "WORK ORDER DRAFT - PENDING ENGINEER SIGN-OFF",
        "work_order_number": f"WO-REC-2026-{eq_digits}",
        "notification_number": f"NOTIF-{rec.equipment_id}-01",
        "plant": eq.unit if eq else "OPP",
        "review_status": rec.review_status,
        "reviewed_by": rec.reviewed_by,
        "reviewed_at": str(rec.reviewed_at) if rec.reviewed_at is not None else None,
        "engineer_notes": rec.engineer_notes,
        "operations": operations,
        "required_parts": [
            {"part_number": "CPL-SPIDER-OEM-57", "description": "Flexible Coupling Elastomer Spider Insert", "qty": 1, "unit": "EA"},
            {"part_number": "SHIM-SS304-005", "description": "Precision Pre-cut Shims SS304 (0.05mm - 1.0mm set)", "qty": 1, "unit": "SET"}
        ],
        "sap_integration_note": "Work Order Recommendation generated by SERA Reliability Decision Support. No live SAP connection claimed."
    }


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
        "reviewed_at": str(r.reviewed_at) if r.reviewed_at is not None else None,
        "reviewed_by": r.reviewed_by,
        "final_action": r.final_action,
    }
