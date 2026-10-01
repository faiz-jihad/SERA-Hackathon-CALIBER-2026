"""
Analysis API — detect problems, run RCA on demand
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import uuid

from database.connection import get_db
from models.db_models import Equipment, EquipmentCondition, Incident, RCAResult, DetectedProblem
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
    Run detection engine entirely on database measurements.
    Detection is deterministic and traceable.
    Returns: equipment, timestamp, parameter, observed_value, threshold, rule_source, status, severity, rule_id, explanation.
    """
    from analytics.rule_engine import default_rule_engine
    from models.db_models import log_audit

    eq_id = equipment_id.upper()
    equip = db.query(Equipment).filter(Equipment.equipment_id == eq_id).first()
    if not equip:
        raise HTTPException(status_code=404, detail=f"Equipment {eq_id} not found")

    conditions = (
        db.query(EquipmentCondition)
        .filter(EquipmentCondition.equipment_id == eq_id)
        .order_by(EquipmentCondition.timestamp)
        .all()
    )

    if not conditions:
        return {
            "equipment": eq_id,
            "equipment_id": eq_id,
            "detections": [],
            "detected": [],
            "message": "No condition data available"
        }

    condition_dicts = [_condition_to_dict(c) for c in conditions]

    # Target condition: evaluate critical condition from canonical condition context
    from services.condition_context import get_condition_context
    ctx = get_condition_context(eq_id, db)
    target_c = ctx.get("critical") or ctx.get("current") or condition_dicts[-1]

    latest_ts = str(target_c.get("timestamp") or datetime.utcnow().isoformat())

    # Evaluate deterministic rule engine on target condition
    rule_eval = default_rule_engine.evaluate_condition_record(
        eq_id,
        target_c,
        equipment_class=str(equip.equipment_type) if equip.equipment_type is not None else None
    )

    # Detailed per-parameter detection list meeting Requirement 5 exactly:
    detections = []
    for r in rule_eval.get("rules_triggered", []):
        detections.append({
            "equipment": eq_id,
            "equipment_id": eq_id,
            "timestamp": latest_ts,
            "parameter": r.get("parameter"),
            "observed_value": r.get("observed_value"),
            "threshold": r.get("threshold"),
            "condition": r.get("condition"),
            "threshold_source": r.get("source_reference"),
            "rule_source": r.get("source_reference"),
            "status": r.get("severity"),
            "severity": r.get("severity"),
            "rule_id": r.get("rule_id"),
            "explanation": f"Observed {r.get('parameter')} ({r.get('observed_value')} {r.get('unit')}) {r.get('condition')} threshold {r.get('threshold')} {r.get('unit')} ({r.get('source_reference')}).",
        })

    # High-level problem grouping for backwards compatibility
    detected = detect_problems(condition_dicts)

    # Persist detected problems to DB
    saved_ids = []
    for prob in detected:
        dp = DetectedProblem(
            equipment_id=eq_id,
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

    # Traceable audit trail
    log_audit(
        db,
        action="DETECTION",
        entity="Equipment",
        entity_id=eq_id,
        user_actor="DETECTION_ENGINE",
        details={
            "rules_triggered": len(detections),
            "problems_detected": len(detected),
            "status": rule_eval.get("status", "NORMAL")
        }
    )

    return {
        "equipment": eq_id,
        "equipment_id": eq_id,
        "timestamp": latest_ts,
        "status": rule_eval.get("status", "NORMAL"),
        "detections": detections,
        "detected": detected,
        "saved_problem_ids": saved_ids,
        "total_detections": len(detections),
        "total": len(detected),
    }


@router.post("/rca")
def run_rca_analysis(
    equipment_id: str,
    problem_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Run RCA for an equipment asset.
    Uses actual database measurements + real historical incident similarity.
    Distinguishes: OBSERVED FACT vs ENGINEERING INTERPRETATION vs POSSIBLE CAUSE.
    Supports 5-Why, 4P, and 4M+1E structured investigations.
    """
    from analytics.rca import build_five_why_and_conclusions
    from models.db_models import log_audit

    eq_id = equipment_id.upper()
    equip = db.query(Equipment).filter(Equipment.equipment_id == eq_id).first()
    if not equip:
        raise HTTPException(status_code=404, detail=f"Equipment {eq_id} not found")

    conditions = (
        db.query(EquipmentCondition)
        .filter(EquipmentCondition.equipment_id == eq_id)
        .order_by(EquipmentCondition.timestamp)
        .all()
    )
    condition_dicts = [_condition_to_dict(c) for c in conditions]

    detected = detect_problems(condition_dicts)
    problem_types = [d["problem_type"] for d in detected]
    parameters = {}
    evidence_list = []
    for d in detected:
        parameters.update(d.get("parameters", {}))
        evidence_list.extend(d.get("evidence", []))

    # Ground parameters directly in canonical critical condition
    from services.condition_context import get_condition_context
    ctx = get_condition_context(eq_id, db)
    crit_c = ctx.get("critical") or ctx.get("current") or {}
    for k in ["vibration", "harmonic_2x", "coupling_offset", "bearing_temperature", "motor_temperature"]:
        if crit_c.get(k) is not None:
            parameters[k] = crit_c[k]

    all_incidents = db.query(Incident).all()
    all_incident_dicts = [_incident_to_dict(i) for i in all_incidents]

    # Real TF-IDF & Cosine Similarity matching
    similar = find_similar_incidents(problem_types, eq_id, all_incident_dicts, max_results=5, current_evidence=evidence_list)

    rca_result = run_rca(problem_types, parameters, similar)

    # Dynamic RCA derived directly from canonical evidence and engineering rules
    primary_root_cause = rca_result.get("primary_root_cause", "Investigating mechanical anomaly")
    rca_result["primary_root_cause"] = primary_root_cause

    # Structured 5-Why and Fact / Interpretation / Possible Cause breakdown (Section 12)
    five_why_bundle = build_five_why_and_conclusions(
        eq_id,
        ", ".join(problem_types) if problem_types else f"Condition abnormality on {eq_id}",
        evidence_list,
        primary_root_cause,
        parameters
    )

    # Retrieve official 4P and 4M+1E verification if existing in database
    official_rcas = db.query(RCAResult).filter(RCAResult.equipment_id == eq_id).all()
    four_p = []
    four_m = []
    for r in official_rcas:
        ev = r.evidence or {}
        if ev.get("four_p_verification") and not four_p:
            four_p = ev.get("four_p_verification")
        if ev.get("four_m_one_e_verification") and not four_m:
            four_m = ev.get("four_m_one_e_verification")

    prob_uuid = None
    if problem_id:
        try:
            prob_uuid = uuid.UUID(problem_id)
        except ValueError:
            pass

    rca_record = RCAResult(
        problem_id=prob_uuid,
        equipment_id=eq_id,
        possible_root_causes=rca_result.get("all_candidates", []),
        primary_root_cause=primary_root_cause,
        confidence_level=rca_result.get("confidence_level", "HIGH"),
        evidence={
            "evidence_list": evidence_list,
            "five_why": five_why_bundle.get("five_why"),
            "observed_facts": five_why_bundle.get("observed_facts"),
            "engineering_interpretations": five_why_bundle.get("engineering_interpretations"),
            "possible_causes": five_why_bundle.get("possible_causes"),
            "four_p_verification": four_p,
            "four_m_one_e": four_m,
        },
        similar_incidents=similar,
    )
    db.add(rca_record)
    db.commit()
    db.refresh(rca_record)

    log_audit(
        db,
        action="INVESTIGATION",
        entity="RCAResult",
        entity_id=str(rca_record.id),
        user_actor="RCA_ENGINE",
        details={"equipment": eq_id, "primary_root_cause": primary_root_cause}
    )

    return {
        "equipment": eq_id,
        "equipment_id": eq_id,
        "rca_id": str(rca_record.id),
        "problem_types": problem_types,
        "primary_root_cause": primary_root_cause,
        "confidence_level": rca_record.confidence_level,
        "rca": rca_result,
        "five_why": five_why_bundle.get("five_why"),
        "observed_facts": five_why_bundle.get("observed_facts"),
        "engineering_interpretations": five_why_bundle.get("engineering_interpretations"),
        "possible_causes": five_why_bundle.get("possible_causes"),
        "four_p_verification": four_p,
        "four_m_one_e": four_m,
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

