"""
SERA Condition Context Service
Single Source of Truth for Equipment Condition Context (Baseline, Critical, Post-Maintenance, Current).

Prevents inconsistency where different backend endpoints independently guess which record is "critical".
"""
from typing import Dict, Any
from datetime import datetime
import numpy as np
from sqlalchemy.orm import Session

from models.db_models import EquipmentCondition, FollowUp


def _clean_val(v):
    if v is None:
        return None
    try:
        f = float(v)
        if np.isnan(f) or np.isinf(f):
            return None
        return round(f, 4)
    except (TypeError, ValueError):
        return v


def _record_to_dict(rec: EquipmentCondition) -> Dict[str, Any]:
    if not rec:
        return {}
    raw = rec.raw_data
    if isinstance(raw, str):
        import json
        try:
            raw = json.loads(raw)
        except Exception:
            raw = {}
    elif not isinstance(raw, dict):
        raw = {}

    return {
        "id": str(rec.id),
        "equipment_id": rec.equipment_id,
        "timestamp": rec.timestamp.isoformat() if isinstance(rec.timestamp, datetime) else str(rec.timestamp),
        "week_number": rec.week_number,
        "vibration": _clean_val(rec.vibration),
        "harmonic_2x": _clean_val(rec.harmonic_2x),
        "coupling_offset": _clean_val(rec.coupling_offset),
        "bearing_temperature": _clean_val(rec.bearing_temperature),
        "motor_temperature": _clean_val(rec.motor_temperature),
        "overall_vibration": _clean_val(rec.overall_vibration),
        "radial_vibration": _clean_val(rec.radial_vibration),
        "status": str(rec.status or "NORMAL").upper(),
        "raw_data": raw,
    }


def get_condition_context(equipment_id: str, db: Session) -> Dict[str, Any]:
    """
    Computes a canonical, unified Condition Context for an equipment asset.
    Returns:
    - baseline: Healthy reference state (typically weeks 1-4/5 before degradation)
    - critical: The verified trip/alarm incident observation that triggered failure investigation
    - post_maintenance: The immediate post-repair observation confirming maintenance completion
    - current: The latest reading available in the database
    - degradation_onset: The first observation where an alarm threshold was breached
    - has_incident: Boolean indicating whether an abnormal/trip event occurred
    - timeline_summary: High-level sequence description
    """
    eq_id = equipment_id.upper()
    conditions = (
        db.query(EquipmentCondition)
        .filter(EquipmentCondition.equipment_id == eq_id)
        .order_by(EquipmentCondition.week_number.asc(), EquipmentCondition.timestamp.asc())
        .all()
    )

    if not conditions:
        return {
            "equipment_id": eq_id,
            "has_data": False,
            "baseline": None,
            "critical": None,
            "post_maintenance": None,
            "current": None,
            "has_incident": False,
        }

    cond_dicts = [_record_to_dict(c) for c in conditions]
    total_records = len(cond_dicts)

    # 1. Identify Critical / Incident Record
    # Hierarchy: Record with status TRIP -> CRITICAL -> Highest Alarm Vibration -> Peak Vibration
    trip_records = [c for c in cond_dicts if c.get("status") in ("TRIP", "CRITICAL")]
    alarm_records = [c for c in cond_dicts if c.get("status") in ("ALARM", "WARNING")]

    has_incident = bool(trip_records or alarm_records)
    critical_dict = None

    if trip_records:
        # For an asset with a trip (e.g. BL-5702 Week 21), select the trip record
        critical_dict = trip_records[-1]
    elif alarm_records:
        # Select highest severity alarm record
        critical_dict = sorted(alarm_records, key=lambda c: (c.get("vibration") or 0.0), reverse=True)[0]
    else:
        # Steady-state asset (e.g. PU-2101B): select peak observation
        critical_dict = sorted(cond_dicts, key=lambda c: (c.get("vibration") or 0.0), reverse=True)[0]

    critical_week = critical_dict.get("week_number") or 1

    # 2. Identify Degradation Onset (First Alarm)
    degradation_onset_dict = alarm_records[0] if alarm_records else None

    # 3. Identify Baseline Healthy Window
    # All records prior to degradation onset, or first 4-5 records if degradation onset is late
    if degradation_onset_dict and degradation_onset_dict.get("week_number"):
        onset_wk = degradation_onset_dict["week_number"]
        baseline_candidates = [c for c in cond_dicts if (c.get("week_number") or 0) < onset_wk and c.get("status") == "NORMAL"]
    else:
        baseline_candidates = [c for c in cond_dicts if c.get("status") == "NORMAL"]

    if not baseline_candidates:
        baseline_candidates = cond_dicts[:min(4, total_records)]

    # Compute averaged baseline values
    baseline_vibs = [c["vibration"] for c in baseline_candidates if c.get("vibration") is not None]
    baseline_h2x = [c["harmonic_2x"] for c in baseline_candidates if c.get("harmonic_2x") is not None]
    baseline_offset = [c["coupling_offset"] for c in baseline_candidates if c.get("coupling_offset") is not None]
    baseline_temp = [c["bearing_temperature"] for c in baseline_candidates if c.get("bearing_temperature") is not None]
    baseline_mtemp = [c["motor_temperature"] for c in baseline_candidates if c.get("motor_temperature") is not None]

    first_b = baseline_candidates[0]
    last_b = baseline_candidates[-1]
    b_start_wk = first_b.get("week_number") or 1
    b_end_wk = last_b.get("week_number") or len(baseline_candidates)

    ts_start = str(first_b.get('timestamp') or '')[:10]
    ts_end = str(last_b.get('timestamp') or '')[:10]

    baseline_dict = {
        "period": f"Week {b_start_wk} - Week {b_end_wk} ({ts_start} to {ts_end})",
        "start_week": b_start_wk,
        "end_week": b_end_wk,
        "source_record_ids": [c["id"] for c in baseline_candidates],
        "vibration": _clean_val(np.mean(baseline_vibs)) if baseline_vibs else first_b.get("vibration"),
        "harmonic_2x": _clean_val(np.mean(baseline_h2x)) if baseline_h2x else first_b.get("harmonic_2x"),
        "coupling_offset": _clean_val(np.mean(baseline_offset)) if baseline_offset else first_b.get("coupling_offset"),
        "bearing_temperature": _clean_val(np.mean(baseline_temp)) if baseline_temp else first_b.get("bearing_temperature"),
        "motor_temperature": _clean_val(np.mean(baseline_mtemp)) if baseline_mtemp else first_b.get("motor_temperature"),
        "status": "NORMAL",
        "observation_count": len(baseline_candidates),
    }

    # 4. Identify Post-Maintenance Condition
    # Observations chronologically after the critical week where status recovered to NORMAL
    post_maint_candidates = [
        c for c in cond_dicts
        if (c.get("week_number") or 0) > critical_week and c.get("status") == "NORMAL"
    ]

    post_maintenance_dict = None
    if post_maint_candidates:
        # First reading immediately after turnaround is the initial verification reading (e.g. Week 22)
        post_maintenance_dict = dict(post_maint_candidates[0])
        pm_ts = str(post_maintenance_dict.get('timestamp') or '')[:10]
        post_maintenance_dict["period"] = f"Week {post_maintenance_dict.get('week_number')} ({pm_ts})"
    else:
        # Check FollowUp table in DB
        fu = db.query(FollowUp).filter(FollowUp.equipment_id == eq_id).order_by(FollowUp.created_at.desc()).first()
        after_c = getattr(fu, "after_condition", None) if fu is not None else None
        if fu is not None and after_c is not None and isinstance(after_c, dict):
            post_maintenance_dict = {
                "id": str(fu.id),
                "equipment_id": eq_id,
                "timestamp": str(fu.maintenance_date),
                "week_number": after_c.get("week"),
                "vibration": _clean_val(after_c.get("vibration")),
                "harmonic_2x": _clean_val(after_c.get("harmonic_2x")),
                "coupling_offset": _clean_val(after_c.get("coupling_offset")),
                "bearing_temperature": _clean_val(after_c.get("bearing_temp")),
                "status": str(after_c.get("status") or "NORMAL").upper(),
                "period": f"Week {after_c.get('week')} (Verified Follow-Up)",
            }

    # 5. Identify Current Condition (Latest Available Reading in DB)
    current_dict = dict(cond_dicts[-1])
    curr_ts = str(current_dict.get('timestamp') or '')[:10]
    current_dict["period"] = f"Week {current_dict.get('week_number')} ({curr_ts})"

    # Annotate critical record with period description
    if critical_dict:
        critical_dict = dict(critical_dict)
        crit_ts = str(critical_dict.get('timestamp') or '')[:10]
        critical_dict["period"] = f"Week {critical_dict.get('week_number')} ({crit_ts})"

    # Formulate clear timeline summary
    if has_incident and trip_records:
        crit_wk = critical_dict.get("week_number")
        crit_vib = critical_dict.get("vibration")
        post_vib = post_maintenance_dict.get("vibration") if post_maintenance_dict else None
        timeline_summary = (
            f"Asset operated normally during baseline (W1-W{b_end_wk}, ~{baseline_dict['vibration']} mm/s). "
            f"Degradation onset flagged at Week {degradation_onset_dict['week_number'] if degradation_onset_dict else 'N/A'}. "
            f"Emergency trip occurred at Week {crit_wk} (Vibration: {crit_vib} mm/s, Status: TRIP). "
        )
        if post_maintenance_dict:
            timeline_summary += f"Post-turnaround maintenance restored baseline at Week {post_maintenance_dict.get('week_number')} (Vibration: {post_vib} mm/s, Status: NORMAL)."
    else:
        timeline_summary = f"Asset running within operational design envelope across all {total_records} weekly observations."

    return {
        "equipment_id": eq_id,
        "has_data": True,
        "has_incident": has_incident,
        "baseline": baseline_dict,
        "critical": critical_dict,
        "post_maintenance": post_maintenance_dict,
        "current": current_dict,
        "degradation_onset": degradation_onset_dict,
        "total_observations": total_records,
        "timeline_summary": timeline_summary,
    }
