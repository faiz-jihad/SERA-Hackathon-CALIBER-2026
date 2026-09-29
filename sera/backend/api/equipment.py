"""
Equipment API — equipment list, detail, trend, and analysis
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional

from database.connection import get_db
from models.db_models import Equipment, EquipmentCondition, ProductionRecord, DowntimeRecord, Incident
from analytics.features import compute_features, get_latest_condition_summary, THRESHOLDS
from analytics.equipment_thresholds import get_equipment_config, get_equipment_summary, EQUIPMENT_PARAMETERS
from analytics.multi_equipment_analytics import (
    summarize_equipment_condition,
    detect_multi_indicator_change,
)


router = APIRouter()


@router.get("")
def list_equipment(db: Session = Depends(get_db)):
    """List all equipment with current status."""
    equipments = db.query(Equipment).order_by(Equipment.equipment_id).all()
    result = []
    for e in equipments:
        # Get latest condition
        latest = (
            db.query(EquipmentCondition)
            .filter(EquipmentCondition.equipment_id == e.equipment_id)
            .order_by(EquipmentCondition.timestamp.desc())
            .first()
        )
        cond = {}
        if latest:
            cond = {
                "vibration": latest.vibration,
                "bearing_temperature": latest.bearing_temperature,
                "coupling_offset": latest.coupling_offset,
                "harmonic_2x": latest.harmonic_2x,
                "status": latest.status,
                "last_reading": str(latest.timestamp),
            }
        result.append({
            "equipment_id": e.equipment_id,
            "name": e.name,
            "type": e.equipment_type,
            "location": e.location,
            "unit": e.unit,
            "status": e.status,
            "latest_condition": cond,
        })
    return result


@router.get("/overview")
def get_equipment_overview(db: Session = Depends(get_db)):
    """Get dynamic overview of all equipment from database for dashboard."""
    equipments = db.query(Equipment).order_by(Equipment.equipment_id).all()
    summaries = []
    for e in equipments:
        # compute KPIs from downtime and conditions in DB
        downtime_records = db.query(DowntimeRecord).filter(DowntimeRecord.equipment_id == e.equipment_id).all()
        total_dt = sum(d.duration_hours or 0.0 for d in downtime_records)
        total_prod = sum(d.production_loss or 0.0 for d in downtime_records)
        total_fin = sum(d.financial_loss or 0.0 for d in downtime_records)

        # Latest condition
        latest = (
            db.query(EquipmentCondition)
            .filter(EquipmentCondition.equipment_id == e.equipment_id)
            .order_by(EquipmentCondition.timestamp.desc())
            .first()
        )

        # Count alarm and trip weeks dynamically from conditions in DB
        conds = db.query(EquipmentCondition).filter(EquipmentCondition.equipment_id == e.equipment_id).all()
        alarm_weeks = sum(1 for c in conds if c.status in ("ALARM", "WARNING"))
        trip_weeks = sum(1 for c in conds if c.status in ("TRIP", "CRITICAL"))

        # Availability pct
        total_hours = 24 * 7 * max(len(conds), 1)
        avail = round(max(0.0, min(100.0, 100.0 - (total_dt / total_hours * 100.0))), 2) if total_hours > 0 else 100.0

        config = get_equipment_config(e.equipment_id)
        summaries.append({
            "equipment_id": e.equipment_id,
            "name": e.name,
            "equipment_type": e.equipment_type,
            "plant": getattr(e, "unit", "") or (config.get("plant") if config else ""),
            "location": e.location or (config.get("location") if config else ""),
            "discipline": config.get("discipline", "ROT") if config else "ROT",
            "criticality": config.get("criticality", "Medium") if config else "Medium",
            "equipment_class": getattr(e, "unit", "") or (config.get("equipment_class", "B") if config else "B"),
            "ar_number": config.get("ar_number", "") if config else "",
            "failure_date": config.get("failure_date", "") if config else "",
            "dominant_failure_mode": config.get("dominant_failure_mode", "") if config else "",
            "parameters": list(config.get("parameters", {}).keys()) if config else ["vibration"],
            "kpis": {
                "downtime_hours": round(total_dt, 1),
                "availability_pct": avail,
                "alarm_weeks": alarm_weeks,
                "trip_weeks": trip_weeks,
                "production_loss_ton": round(total_prod, 1),
                "estimated_loss_kusd": round(total_fin, 2),
            },
            "status": e.status,
            "latest_reading": str(latest.timestamp) if latest else None,
        })
    return {"equipment": summaries}


@router.get("/{equipment_id}")
def get_equipment_detail(equipment_id: str, db: Session = Depends(get_db)):
    """Get full equipment detail with current condition summary."""
    equip = db.query(Equipment).filter(Equipment.equipment_id == equipment_id).first()
    if not equip:
        raise HTTPException(status_code=404, detail=f"Equipment {equipment_id} not found")

    # Get all condition records
    conditions = (
        db.query(EquipmentCondition)
        .filter(EquipmentCondition.equipment_id == equipment_id)
        .order_by(EquipmentCondition.timestamp)
        .all()
    )
    condition_dicts = [_condition_to_dict(c) for c in conditions]

    # Feature summary from latest readings
    condition_summary = get_latest_condition_summary(condition_dicts)

    # Downtime summary
    downtime_total = (
        db.query(DowntimeRecord)
        .filter(DowntimeRecord.equipment_id == equipment_id)
        .all()
    )
    total_downtime_hours = sum(d.duration_hours or 0 for d in downtime_total)
    total_prod_loss = sum(d.production_loss or 0 for d in downtime_total)
    total_fin_loss = sum(d.financial_loss or 0 for d in downtime_total)

    # Incident count
    incident_count = db.query(Incident).filter(Incident.equipment_id == equipment_id).count()

    return {
        "equipment_id": equip.equipment_id,
        "name": equip.name,
        "type": equip.equipment_type,
        "location": equip.location,
        "unit": equip.unit,
        "status": equip.status,
        "condition_summary": condition_summary,
        "thresholds": THRESHOLDS,
        "total_readings": len(conditions),
        "total_downtime_hours": round(total_downtime_hours, 2),
        "total_production_loss": round(total_prod_loss, 2),
        "total_financial_loss": round(total_fin_loss, 2),
        "total_incidents": incident_count,
    }


@router.get("/{equipment_id}/trend")
def get_equipment_trend(
    equipment_id: str,
    limit: int = 52,
    db: Session = Depends(get_db)
):
    """Get trend data for charts."""
    equip = db.query(Equipment).filter(Equipment.equipment_id == equipment_id).first()
    if not equip:
        raise HTTPException(status_code=404, detail=f"Equipment {equipment_id} not found")

    conditions = (
        db.query(EquipmentCondition)
        .filter(EquipmentCondition.equipment_id == equipment_id)
        .order_by(EquipmentCondition.timestamp)
        .limit(limit)
        .all()
    )

    if not conditions:
        return {"equipment_id": equipment_id, "trend": [], "features": []}

    condition_dicts = [_condition_to_dict(c) for c in conditions]
    features_df = compute_features(condition_dicts)

    # Convert to list of dicts for JSON
    trend_data = features_df.to_dict(orient="records")

    # Clean NaN
    import math
    def clean(v):
        if isinstance(v, float) and math.isnan(v):
            return None
        return v

    trend_data = [{k: clean(v) for k, v in row.items()} for row in trend_data]

    return {
        "equipment_id": equipment_id,
        "trend": trend_data,
        "thresholds": THRESHOLDS,
    }


@router.get("/{equipment_id}/analysis")
def get_equipment_analysis(equipment_id: str, db: Session = Depends(get_db)):
    """
    Full analysis: detection + RCA + historical + recommendation + structured evidence + what changed.
    """
    from analytics.detection import detect_problems
    from analytics.rca import run_rca, find_similar_incidents
    from analytics.evidence_engine import build_evidence_layer, compute_what_changed
    from analytics.rule_engine import default_rule_engine
    from models.db_models import DetectedProblem, RCAResult, Recommendation

    equip = db.query(Equipment).filter(Equipment.equipment_id == equipment_id.upper()).first()
    if not equip:
        raise HTTPException(status_code=404, detail=f"Equipment {equipment_id} not found")

    # Get condition records
    conditions = (
        db.query(EquipmentCondition)
        .filter(EquipmentCondition.equipment_id == equipment_id.upper())
        .order_by(EquipmentCondition.timestamp)
        .all()
    )
    condition_dicts = [_condition_to_dict(c) for c in conditions]

    # Detection
    detected = detect_problems(condition_dicts)

    # Get all incidents for RCA + historical matching
    all_incidents = db.query(Incident).all()
    all_incident_dicts = [_incident_to_dict(i) for i in all_incidents]

    problem_types = [d["problem_type"] for d in detected]
    parameters = {}
    evidence_list = []
    for d in detected:
        parameters.update(d.get("parameters", {}))
        evidence_list.extend(d.get("evidence", []))

    # RCA — Prefer stored official RCA (AR-2026-OPP-0203) if available
    stored_rca = (
        db.query(RCAResult)
        .filter(RCAResult.equipment_id == equipment_id.upper())
        .order_by(RCAResult.rca_timestamp.desc())
        .first()
    )
    if stored_rca:
        similar = stored_rca.similar_incidents or find_similar_incidents(problem_types, equipment_id.upper(), all_incident_dicts)
        rca = {
            "primary_root_cause": stored_rca.primary_root_cause,
            "confidence_level": stored_rca.confidence_level,
            "explanation": stored_rca.primary_root_cause,
            "evidence": (stored_rca.evidence or {}).get("four_p_verification", []),
            "four_m_one_e": (stored_rca.evidence or {}).get("four_m_one_e_verification", []),
            "ar_number": (stored_rca.evidence or {}).get("ar_number", ""),
            "similar_incidents": similar,
            "all_candidates": [
                {"root_cause": c, "category": "MECHANICAL", "score": 0.95, "confidence": "HIGH", "explanation": c, "evidence": []}
                for c in (stored_rca.possible_root_causes or [stored_rca.primary_root_cause])
            ]
        }
    else:
        similar = find_similar_incidents(problem_types, equipment_id.upper(), all_incident_dicts)
        rca = run_rca(problem_types, parameters, similar)

    # Structured Evidence Layer (Section 10)
    structured_evidence = build_evidence_layer(condition_dicts, equipment_id.upper())

    # "What Changed?" Feature (Section 11)
    what_changed = compute_what_changed(condition_dicts, equipment_id.upper())

    # Deterministic Rule Trace (Section 5, 22)
    latest_condition_map = parameters or (condition_dicts[-1] if condition_dicts else {})
    rule_evaluation = default_rule_engine.evaluate_condition_record(
        equipment_id.upper(),
        latest_condition_map,
        equipment_class=equip.equipment_type
    )

    # Latest recommendation (if any)
    latest_rec = (
        db.query(Recommendation)
        .filter(Recommendation.equipment_id == equipment_id.upper())
        .order_by(Recommendation.generated_at.desc())
        .first()
    )

    return {
        "equipment_id": equipment_id.upper(),
        "equipment_status": equip.status,
        "detected_problems": detected,
        "rca": rca,
        "similar_incidents": similar[:5],
        "evidence_layer": structured_evidence,
        "what_changed": what_changed,
        "rule_trace": rule_evaluation,
        "recommendation": _rec_to_dict(latest_rec) if latest_rec else None,
        "total_conditions": len(conditions),
    }


@router.get("/{equipment_id}/what-changed")
def get_equipment_what_changed(equipment_id: str, db: Session = Depends(get_db)):
    """Get comparative 'What Changed?' analysis."""
    from analytics.evidence_engine import compute_what_changed

    conditions = (
        db.query(EquipmentCondition)
        .filter(EquipmentCondition.equipment_id == equipment_id.upper())
        .order_by(EquipmentCondition.timestamp)
        .all()
    )
    if not conditions:
        raise HTTPException(status_code=404, detail=f"No condition data for equipment {equipment_id}")

    condition_dicts = [_condition_to_dict(c) for c in conditions]
    return compute_what_changed(condition_dicts, equipment_id.upper())


@router.get("/{equipment_id}/evidence")
def get_equipment_evidence_layer(equipment_id: str, db: Session = Depends(get_db)):
    """Get structured evidence list (E-001, E-002, ...) for equipment."""
    from analytics.evidence_engine import build_evidence_layer

    conditions = (
        db.query(EquipmentCondition)
        .filter(EquipmentCondition.equipment_id == equipment_id.upper())
        .order_by(EquipmentCondition.timestamp)
        .all()
    )
    if not conditions:
        raise HTTPException(status_code=404, detail=f"No condition data for equipment {equipment_id}")

    condition_dicts = [_condition_to_dict(c) for c in conditions]
    return build_evidence_layer(condition_dicts, equipment_id.upper())


@router.get("/{equipment_id}/thresholds")
def get_equipment_thresholds(equipment_id: str):
    """Get equipment-specific thresholds from Case 2 XLSX files (verified source)."""
    config = get_equipment_config(equipment_id.upper())
    if not config:
        raise HTTPException(
            status_code=404,
            detail=f"No threshold configuration for {equipment_id}. Available: {list(EQUIPMENT_PARAMETERS.keys())}"
        )
    return {
        "equipment_id": equipment_id.upper(),
        "equipment_name": config["name"],
        "equipment_type": config["equipment_type"],
        "ar_number": config["ar_number"],
        "failure_date": config["failure_date"],
        "dominant_failure_mode": config["dominant_failure_mode"],
        "parameters": config["parameters"],
        "performance_kpis": config["performance_kpis"],
        "source": "Equipment Info sheet — Case 2 XLSX (verified)",
    }


@router.get("/{equipment_id}/summary")
def get_equipment_condition_summary(equipment_id: str, db: Session = Depends(get_db)):
    """Get complete condition summary using equipment-specific analytics engine."""
    equip = db.query(Equipment).filter(Equipment.equipment_id == equipment_id.upper()).first()
    if not equip:
        raise HTTPException(status_code=404, detail=f"Equipment {equipment_id} not found")

    conditions = (
        db.query(EquipmentCondition)
        .filter(EquipmentCondition.equipment_id == equipment_id.upper())
        .order_by(EquipmentCondition.timestamp)
        .all()
    )
    condition_dicts = [_condition_to_dict(c) for c in conditions]

    summary = summarize_equipment_condition(equipment_id.upper(), condition_dicts)
    multi_change = detect_multi_indicator_change(equipment_id.upper(), condition_dicts)

    return {
        **summary,
        "multi_indicator_analysis": multi_change,
    }


@router.get("/{equipment_id}/incidents")
def get_equipment_incidents(
    equipment_id: str,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Get incidents for this equipment from incident database."""
    incidents = (
        db.query(Incident)
        .filter(Incident.equipment_id == equipment_id.upper())
        .order_by(Incident.incident_date.desc())
        .limit(limit)
        .all()
    )
    return {
        "equipment_id": equipment_id.upper(),
        "count": len(incidents),
        "incidents": [_incident_to_dict(i) for i in incidents],
    }


@router.get("/{equipment_id}/rca")
def get_equipment_rca(equipment_id: str, db: Session = Depends(get_db)):
    """Get RCA results for this equipment."""
    from models.db_models import RCAResult, Recommendation, FollowUp

    rca_records = (
        db.query(RCAResult)
        .filter(RCAResult.equipment_id == equipment_id.upper())
        .order_by(RCAResult.rca_timestamp.desc())
        .all()
    )

    recs = (
        db.query(Recommendation)
        .filter(Recommendation.equipment_id == equipment_id.upper())
        .order_by(Recommendation.generated_at.desc())
        .all()
    )

    follow_ups = (
        db.query(FollowUp)
        .filter(FollowUp.equipment_id == equipment_id.upper())
        .all()
    )

    config = get_equipment_config(equipment_id.upper())

    return {
        "equipment_id": equipment_id.upper(),
        "ar_number": config.get("ar_number") if config else None,
        "failure_date": config.get("failure_date") if config else None,
        "dominant_failure_mode": config.get("dominant_failure_mode") if config else None,
        "rca_records": [
            {
                "id": str(r.id),
                "equipment_id": r.equipment_id,
                "rca_timestamp": str(r.rca_timestamp),
                "primary_root_cause": r.primary_root_cause,
                "confidence_level": r.confidence_level,
                "possible_root_causes": r.possible_root_causes,
                "evidence": r.evidence,
                "similar_incidents": r.similar_incidents,
            }
            for r in rca_records
        ],
        "recommendations": [_rec_to_dict(r) for r in recs],
        "follow_ups": [
            {
                "id": str(f.id),
                "maintenance_date": str(f.maintenance_date),
                "action_taken": f.action_taken,
                "before_condition": f.before_condition,
                "after_condition": f.after_condition,
                "verification_result": f.verification_result,
                "parameter_deltas": f.parameter_deltas,
                "engineer_notes": f.engineer_notes,
            }
            for f in follow_ups
        ],
        "source": "SERA database (rca_results, recommendations, follow_ups tables)",
    }


@router.get("/{equipment_id}/production")
def get_equipment_production(
    equipment_id: str,
    limit: int = 168,
    db: Session = Depends(get_db)
):
    """Get hourly production sensor records from official PI tag data."""
    records = (
        db.query(ProductionRecord)
        .filter(ProductionRecord.equipment_id == equipment_id.upper())
        .order_by(ProductionRecord.timestamp)
        .limit(limit)
        .all()
    )
    return [
        {
            "timestamp": str(r.timestamp),
            "production_rate": r.production_rate,
            "pressure": r.pressure,
            "feed": r.feed,
            "run_status": r.run_status,
            "efficiency": r.efficiency,
            "vibration_sensor": (r.raw_data or {}).get("vibration_sensor", 0.0),
            "temperature_sensor": (r.raw_data or {}).get("temperature_sensor", 0.0),
            "motor_amp": (r.raw_data or {}).get("motor_amp", 0.0),
            "plant_rate": (r.raw_data or {}).get("plant_rate", 0.0),
        }
        for r in records
    ]


def _condition_to_dict(c: EquipmentCondition) -> dict:
    raw = c.raw_data
    if isinstance(raw, str):
        import json
        try:
            raw = json.loads(raw)
        except Exception:
            raw = {}
    elif not isinstance(raw, dict):
        raw = {}
    else:
        raw = dict(raw)

    eq_id = (c.equipment_id or "").upper()
    d = {
        "id": str(c.id),
        "equipment_id": c.equipment_id,
        "timestamp": str(c.timestamp),
        "week_number": c.week_number,
        "vibration": c.vibration,
        "harmonic_2x": c.harmonic_2x,
        "coupling_offset": c.coupling_offset,
        "bearing_temperature": c.bearing_temperature,
        "motor_temperature": c.motor_temperature,
        "overall_vibration": c.overall_vibration,
        "axial_vibration": c.axial_vibration,
        "radial_vibration": c.radial_vibration,
        "status": c.status,
        "raw_data": raw,
    }

    if eq_id == "BL-5702":
        d["vibration"] = c.vibration
        d["harmonic_2x"] = c.harmonic_2x
        d["coupling_offset"] = c.coupling_offset
        d["bearing_temperature"] = c.bearing_temperature
    elif eq_id == "PU-2101B":
        d["vibration"] = c.vibration
        d["seal_flush_flow"] = c.harmonic_2x
        d["discharge_pressure"] = c.coupling_offset
        d["bearing_temperature"] = c.bearing_temperature
        raw["seal_flush_flow"] = c.harmonic_2x
        raw["discharge_pressure"] = c.coupling_offset
    elif eq_id == "KO-3201":
        d["radial_vibration"] = c.vibration
        d["vibration"] = c.vibration
        d["lube_oil_water"] = c.harmonic_2x
        d["lube_oil_supply_press"] = c.coupling_offset
        d["bearing_temperature"] = c.bearing_temperature
        raw["radial_vibration"] = c.vibration
        raw["lube_oil_water"] = c.harmonic_2x
        raw["lube_oil_supply_press"] = c.coupling_offset
    elif eq_id == "PM-4405B":
        d["bearing_temperature"] = c.vibration
        d["vibration"] = c.harmonic_2x
        d["motor_ampere"] = c.coupling_offset
        d["winding_temperature"] = c.bearing_temperature
        raw["bearing_temperature"] = c.vibration
        raw["vibration"] = c.harmonic_2x
        raw["motor_ampere"] = c.coupling_offset
        raw["winding_temperature"] = c.bearing_temperature
    elif eq_id == "HE-3301":
        d["tube_side_dp"] = c.vibration
        d["heat_duty_pct"] = c.harmonic_2x
        d["cold_outlet_temp"] = c.coupling_offset
        d["feed_heavy_ends_pct"] = c.bearing_temperature
        raw["tube_side_dp"] = c.vibration
        raw["heat_duty_pct"] = c.harmonic_2x
        raw["cold_outlet_temp"] = c.coupling_offset
        raw["feed_heavy_ends_pct"] = c.bearing_temperature

    if isinstance(raw, dict):
        for k, v in raw.items():
            if k not in d or d[k] is None:
                d[k] = v

    return d


def _incident_to_dict(i: Incident) -> dict:
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


def _rec_to_dict(r) -> dict:
    if not r:
        return None
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

