"""
SERA Multi-Equipment Analytics Engine
Works across all 5 Case 2 equipment using equipment-specific parameters.

Core functions:
  - analyze_trend()
  - detect_threshold_crossing()
  - detect_condition_change()
  - summarize_equipment_condition()
  - correlate_incident()
  - retrieve_related_rca()
  - analyze_production_context()

All calculations are deterministic. LLM is not used for primary calculations.
"""
from typing import List, Dict, Any, Optional, Tuple
import statistics
import math
from datetime import datetime

from analytics.equipment_thresholds import (
    EQUIPMENT_PARAMETERS,
    get_equipment_config,
    get_parameters,
    evaluate_parameter,
    evaluate_condition_record,
)


# ─────────────────────────────────────────────────────────────────────────────
# 1. Trend Analysis
# ─────────────────────────────────────────────────────────────────────────────

def analyze_trend(
    equipment_id: str,
    param_name: str,
    values: List[float],
    window: int = 3,
) -> Dict[str, Any]:
    """
    Analyze trend for a single parameter.

    Returns:
        direction: "increasing" | "decreasing" | "stable"
        slope: float (change per measurement period)
        slope_pct: float (percentage change per period)
        last_value: float
        first_value: float
        total_change: float
        total_change_pct: float
        source: str (attribution)
    """
    if not values or len(values) < 2:
        return {
            "direction": "insufficient_data",
            "slope": None,
            "note": f"Need at least 2 data points, got {len(values)}",
        }

    # Use only the last `window` values for slope
    window_vals = values[-window:] if len(values) >= window else values

    # Linear regression slope
    n = len(window_vals)
    x = list(range(n))
    x_mean = sum(x) / n
    y_mean = sum(window_vals) / n

    numerator = sum((x[i] - x_mean) * (window_vals[i] - y_mean) for i in range(n))
    denominator = sum((x[i] - x_mean) ** 2 for i in range(n))

    slope = numerator / denominator if denominator != 0 else 0.0

    # Classify direction (threshold: 5% of alarm threshold)
    params = get_parameters(equipment_id)
    threshold_scale = 1.0
    if params and param_name in params:
        alarm_val = params[param_name].get("alarm", 1.0)
        threshold_scale = max(abs(alarm_val) * 0.02, 0.001)  # 2% of alarm threshold

    if slope > threshold_scale:
        direction = "increasing"
    elif slope < -threshold_scale:
        direction = "decreasing"
    else:
        direction = "stable"

    first_val = values[0]
    last_val = values[-1]
    total_change = last_val - first_val
    total_change_pct = (total_change / abs(first_val) * 100) if first_val != 0 else 0.0

    result = {
        "direction": direction,
        "slope": round(slope, 4),
        "slope_per_week": round(slope, 4),
        "last_value": round(last_val, 4),
        "first_value": round(first_val, 4),
        "total_change": round(total_change, 4),
        "total_change_pct": round(total_change_pct, 2),
        "data_points": len(values),
        "window_used": window,
    }

    # Add unit info if available
    if params and param_name in params:
        result["unit"] = params[param_name]["unit"]
        result["label"] = params[param_name]["label"]

    return result


# ─────────────────────────────────────────────────────────────────────────────
# 2. Threshold Crossing Detection
# ─────────────────────────────────────────────────────────────────────────────

def detect_threshold_crossing(
    equipment_id: str,
    param_name: str,
    values: List[float],
    week_numbers: Optional[List[int]] = None,
) -> Dict[str, Any]:
    """
    Detect when a parameter first crossed alarm and trip thresholds.

    Returns:
        alarm_crossings: list of {week, value} where alarm was first crossed
        trip_crossings: list of {week, value} where trip was first crossed
        current_level: NORMAL | ALARM | TRIP
        consecutive_alarm_count: int
        source: str
    """
    params = get_parameters(equipment_id)
    if not params or param_name not in params:
        return {
            "error": f"Parameter '{param_name}' not defined for {equipment_id}",
            "alarm_crossings": [],
            "trip_crossings": [],
        }

    p = params[param_name]
    alarm = p["alarm"]
    trip = p["trip"]
    direction = p.get("direction", "high")
    unit = p["unit"]

    alarm_crossings = []
    trip_crossings = []
    consecutive_count = 0
    max_consecutive = 0

    for i, val in enumerate(values):
        week = week_numbers[i] if week_numbers else i + 1

        if direction == "high":
            in_alarm = val >= alarm
            in_trip = val >= trip
        else:  # low
            in_alarm = val <= alarm
            in_trip = val <= trip

        if in_trip:
            trip_crossings.append({"week": week, "value": round(val, 4), "unit": unit})
            consecutive_count += 1
        elif in_alarm:
            alarm_crossings.append({"week": week, "value": round(val, 4), "unit": unit})
            consecutive_count += 1
        else:
            max_consecutive = max(max_consecutive, consecutive_count)
            consecutive_count = 0

    max_consecutive = max(max_consecutive, consecutive_count)

    # Current level
    if values:
        last_eval = evaluate_parameter(equipment_id, param_name, values[-1])
        current_level = last_eval["level"]
    else:
        current_level = "UNKNOWN"

    return {
        "equipment_id": equipment_id,
        "parameter": param_name,
        "label": p["label"],
        "unit": unit,
        "alarm_threshold": alarm,
        "trip_threshold": trip,
        "direction": direction,
        "alarm_crossings": alarm_crossings,
        "trip_crossings": trip_crossings,
        "first_alarm_week": alarm_crossings[0]["week"] if alarm_crossings else None,
        "first_trip_week": trip_crossings[0]["week"] if trip_crossings else None,
        "total_alarm_count": len(alarm_crossings),
        "total_trip_count": len(trip_crossings),
        "consecutive_alarm_count": consecutive_count,
        "max_consecutive_alarm": max_consecutive,
        "current_level": current_level,
        "current_value": round(values[-1], 4) if values else None,
        "source": p["source"],
    }


# ─────────────────────────────────────────────────────────────────────────────
# 3. Condition Change Detection
# ─────────────────────────────────────────────────────────────────────────────

def detect_condition_change(
    equipment_id: str,
    conditions: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Detect when the overall health status changed (NORMAL → ALARM → TRIP).

    Args:
        conditions: List of condition records sorted by week ascending

    Returns:
        changes: List of {week, from_status, to_status, date}
        first_alarm_week: int | None
        first_trip_week: int | None
        current_status: str
    """
    changes = []
    prev_status = None

    for cond in conditions:
        current = str(cond.get("status", "UNKNOWN")).upper()
        week = cond.get("week_number")
        date = cond.get("timestamp") or cond.get("date")

        if prev_status is not None and current != prev_status:
            changes.append({
                "week": week,
                "from_status": prev_status,
                "to_status": current,
                "date": str(date) if date else None,
            })

        prev_status = current

    first_alarm = next((c["week"] for c in changes if c["to_status"] == "ALARM"), None)
    first_trip = next((c["week"] for c in changes if c["to_status"] == "TRIP"), None)
    current_status = conditions[-1].get("status", "UNKNOWN") if conditions else "UNKNOWN"

    return {
        "equipment_id": equipment_id,
        "changes": changes,
        "first_alarm_week": first_alarm,
        "first_trip_week": first_trip,
        "current_status": str(current_status).upper(),
        "total_changes": len(changes),
    }


# ─────────────────────────────────────────────────────────────────────────────
# 4. Equipment Condition Summary
# ─────────────────────────────────────────────────────────────────────────────

def summarize_equipment_condition(
    equipment_id: str,
    conditions: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Generate a complete equipment condition summary from 26-week history.

    Args:
        equipment_id: Equipment ID
        conditions: List of condition records (oldest to newest)

    Returns:
        Structured summary with trends, threshold crossings, status changes,
        and evidence list.
    """
    config = get_equipment_config(equipment_id)
    if not config:
        return {"error": f"No configuration for equipment {equipment_id}"}

    params = config["parameters"]
    sorted_conds = sorted(conditions, key=lambda c: c.get("week_number", 0))

    # Collect parameter series
    param_series: Dict[str, List[float]] = {p: [] for p in params}
    week_numbers: List[int] = []

    for cond in sorted_conds:
        week_numbers.append(int(cond.get("week_number", 0) or 0))
        raw_data = cond.get("raw_data") or {}
        if isinstance(raw_data, str):
            import json
            try:
                raw_data = json.loads(raw_data)
            except Exception:
                raw_data = {}

        for param_name, p_config in params.items():
            val = cond.get(p_config["db_field"].split(".")[-1])
            if val is None:
                val = raw_data.get(p_config["db_field"].replace("raw_data.", ""))
            if val is not None:
                try:
                    param_series[param_name].append(float(val))
                except (TypeError, ValueError):
                    pass

    # Analyze each parameter
    parameter_analysis = {}
    for param_name in params:
        values = param_series[param_name]
        if not values:
            continue

        trend = analyze_trend(equipment_id, param_name, values)
        crossings = detect_threshold_crossing(equipment_id, param_name, values, week_numbers)
        parameter_analysis[param_name] = {
            "trend": trend,
            "crossings": crossings,
            "values_count": len(values),
        }

    # Condition changes
    condition_change = detect_condition_change(equipment_id, sorted_conds)

    # Current status
    current_cond = sorted_conds[-1] if sorted_conds else {}
    current_eval = evaluate_condition_record(equipment_id, current_cond)

    # Build evidence list (facts, not hypotheses)
    evidence = []
    for param_name, analysis in parameter_analysis.items():
        crossings = analysis["crossings"]
        trend = analysis["trend"]
        label = params[param_name]["label"]
        unit = params[param_name]["unit"]

        if crossings.get("first_trip_week"):
            evidence.append({
                "type": "FACT",
                "category": "THRESHOLD_CROSSING",
                "text": (
                    f"{label} exceeded trip limit ({crossings['trip_threshold']} {unit}) "
                    f"at Week {crossings['first_trip_week']} "
                    f"(value: {crossings['trip_crossings'][0]['value']} {unit})"
                ),
                "source": crossings["source"],
                "week": crossings["first_trip_week"],
            })
        elif crossings.get("first_alarm_week"):
            evidence.append({
                "type": "FACT",
                "category": "THRESHOLD_CROSSING",
                "text": (
                    f"{label} exceeded alarm limit ({crossings['alarm_threshold']} {unit}) "
                    f"at Week {crossings['first_alarm_week']} "
                    f"(value: {crossings['alarm_crossings'][0]['value']} {unit})"
                ),
                "source": crossings["source"],
                "week": crossings["first_alarm_week"],
            })

        if trend.get("direction") in ("increasing", "decreasing"):
            evidence.append({
                "type": "OBSERVATION",
                "category": "TREND",
                "text": (
                    f"{label} trend: {trend['direction']} at "
                    f"{abs(trend['slope']):.4g} {unit}/week over {trend['window_used']}-week window "
                    f"(from {trend['first_value']} to {trend['last_value']} {unit}, "
                    f"total change: {trend['total_change']:+.4g} {unit})"
                ),
                "source": f"SERA trend analysis ({trend['data_points']} data points)",
                "week": week_numbers[-1] if week_numbers else None,
            })

    if condition_change["first_alarm_week"]:
        evidence.append({
            "type": "FACT",
            "category": "STATUS_CHANGE",
            "text": f"Health status changed to ALARM at Week {condition_change['first_alarm_week']}",
            "source": "Condition History, Equipment Performance XLSX",
            "week": condition_change["first_alarm_week"],
        })

    if condition_change["first_trip_week"]:
        evidence.append({
            "type": "FACT",
            "category": "STATUS_CHANGE",
            "text": f"Health status changed to TRIP at Week {condition_change['first_trip_week']}",
            "source": "Condition History, Equipment Performance XLSX",
            "week": condition_change["first_trip_week"],
        })

    # Sort evidence by week
    evidence.sort(key=lambda e: e.get("week") or 0)

    return {
        "equipment_id": equipment_id,
        "equipment_name": config["name"],
        "equipment_type": config["equipment_type"],
        "ar_number": config["ar_number"],
        "failure_date": config["failure_date"],
        "dominant_failure_mode": config["dominant_failure_mode"],
        "current_status": condition_change["current_status"],
        "current_evaluation": current_eval,
        "condition_changes": condition_change,
        "parameter_analysis": parameter_analysis,
        "evidence": evidence,
        "kpis": config["performance_kpis"],
        "total_weeks_analyzed": len(sorted_conds),
        "data_source": f"Equipment Performance XLSX — {equipment_id}",
    }


# ─────────────────────────────────────────────────────────────────────────────
# 5. Incident Correlation
# ─────────────────────────────────────────────────────────────────────────────

def correlate_incident(
    equipment_id: str,
    incidents: List[Dict[str, Any]],
    problem_type: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Find incidents related to this equipment and optionally a problem type.

    Args:
        equipment_id: Equipment ID
        incidents: All incidents from database
        problem_type: Optional problem type string for keyword matching

    Returns:
        matched: List of matching incidents
        same_equipment: Incidents on same equipment
        same_problem_type: Incidents with similar problem
    """
    same_equipment = []
    same_problem = []
    other_matches = []

    for inc in incidents:
        inc_equip = str(inc.get("equipment_id", "")).upper()
        inc_title = str(inc.get("incident_title", "")).lower()
        inc_problem = str(inc.get("problem", "")).lower()
        inc_rc = str(inc.get("root_cause", "")).lower()

        # Same equipment
        if inc_equip == equipment_id.upper():
            same_equipment.append(inc)
            continue

        # Similar problem type
        if problem_type:
            keywords = [kw for kw in problem_type.lower().split() if len(kw) > 3]
            matches = sum(1 for kw in keywords if kw in inc_title or kw in inc_problem or kw in inc_rc)
            if matches >= 2:
                same_problem.append({**inc, "_match_score": matches})
            elif matches == 1:
                other_matches.append({**inc, "_match_score": matches})

    same_problem.sort(key=lambda x: x.get("_match_score", 0), reverse=True)

    return {
        "equipment_id": equipment_id,
        "same_equipment_count": len(same_equipment),
        "same_equipment": same_equipment[:5],
        "similar_problem_count": len(same_problem),
        "similar_problem": same_problem[:5],
        "other_matches": other_matches[:3],
        "total_searched": len(incidents),
    }


# ─────────────────────────────────────────────────────────────────────────────
# 6. RCA Retrieval
# ─────────────────────────────────────────────────────────────────────────────

def retrieve_related_rca(
    equipment_id: str,
    rca_results: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Retrieve RCA results relevant to an equipment.

    Args:
        equipment_id: Equipment ID
        rca_results: All RCA records from database

    Returns:
        direct_rca: List of RCA records for this equipment
        related_rca: List of RCA records with similar patterns
    """
    direct = [r for r in rca_results if str(r.get("equipment_id", "")).upper() == equipment_id.upper()]

    # Get AR number from registry
    config = get_equipment_config(equipment_id)
    ar_number = config.get("ar_number") if config else None

    return {
        "equipment_id": equipment_id,
        "ar_number": ar_number,
        "direct_rca_count": len(direct),
        "direct_rca": direct,
        "source": "SERA database (rca_results table) + Case 2 RCA documents",
        "note": "For full RCA evidence, refer to corresponding PPTX document in RCA - Downtime Data/",
    }


# ─────────────────────────────────────────────────────────────────────────────
# 7. Production Context Analysis
# ─────────────────────────────────────────────────────────────────────────────

def analyze_production_context(
    equipment_id: str,
    production_records: List[Dict[str, Any]],
    condition_records: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Analyze production context during equipment condition degradation.

    Args:
        equipment_id: Equipment ID
        production_records: List of production records (hourly PI data)
        condition_records: Optional list of condition records for correlation

    Returns:
        Structured production context analysis
    """
    if not production_records:
        return {
            "equipment_id": equipment_id,
            "status": "NO_PRODUCTION_DATA",
            "note": "No production records found in database for this equipment",
        }

    sorted_prod = sorted(production_records, key=lambda r: str(r.get("timestamp", "")))

    # Feed rates
    feed_rates = [r.get("production_rate") or r.get("feed") for r in sorted_prod]
    feed_rates = [float(f) for f in feed_rates if f is not None]

    # Run status
    run_statuses = [str(r.get("run_status", "")).upper() for r in sorted_prod]
    on_count = sum(1 for s in run_statuses if s == "ON")
    off_count = sum(1 for s in run_statuses if s == "OFF")

    # Plant rate
    plant_rates = []
    for r in sorted_prod:
        raw = r.get("raw_data") or {}
        if isinstance(raw, dict):
            plant_rates.append(raw.get("plant_rate"))
    plant_rates = [float(p) for p in plant_rates if p is not None]

    result = {
        "equipment_id": equipment_id,
        "total_records": len(sorted_prod),
        "date_range": {
            "start": str(sorted_prod[0].get("timestamp", "")),
            "end": str(sorted_prod[-1].get("timestamp", "")),
        },
        "run_status": {
            "on_count": on_count,
            "off_count": off_count,
            "on_pct": round(on_count / len(run_statuses) * 100, 1) if run_statuses else 0,
        },
    }

    if feed_rates:
        result["feed_rate"] = {
            "min": round(min(feed_rates), 3),
            "max": round(max(feed_rates), 3),
            "mean": round(statistics.mean(feed_rates), 3),
            "latest": round(feed_rates[-1], 3),
        }

    if plant_rates:
        result["plant_rate"] = {
            "min": round(min(plant_rates), 3),
            "max": round(max(plant_rates), 3),
            "mean": round(statistics.mean(plant_rates), 3),
        }

    # Check for downtime events (RUN_STATUS transitions OFF)
    downtime_transitions = []
    for i in range(1, len(run_statuses)):
        if run_statuses[i-1] == "ON" and run_statuses[i] == "OFF":
            downtime_transitions.append({
                "timestamp": str(sorted_prod[i].get("timestamp", "")),
                "type": "START_DOWNTIME",
            })
        elif run_statuses[i-1] == "OFF" and run_statuses[i] == "ON":
            downtime_transitions.append({
                "timestamp": str(sorted_prod[i].get("timestamp", "")),
                "type": "END_DOWNTIME",
            })

    result["downtime_transitions"] = downtime_transitions[:10]
    result["source"] = "Production Data XLSX (Sheet2) — PI hourly sensor records"

    return result


# ─────────────────────────────────────────────────────────────────────────────
# 8. Multi-Indicator Change Detection
# ─────────────────────────────────────────────────────────────────────────────

def detect_multi_indicator_change(
    equipment_id: str,
    conditions: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Detect simultaneous deterioration across multiple parameters.
    A multi-indicator change is more significant than a single-parameter exceedance.

    Returns:
        multi_indicator_events: List of weeks where multiple parameters were in alarm
        peak_event: The week with most simultaneous alarms
        indicator_count_series: Count of alarms per week
    """
    config = get_equipment_config(equipment_id)
    if not config:
        return {"error": f"No configuration for {equipment_id}"}

    sorted_conds = sorted(conditions, key=lambda c: c.get("week_number", 0))
    indicator_count_series = []
    multi_events = []

    for cond in sorted_conds:
        week = cond.get("week_number")
        eval_result = evaluate_condition_record(equipment_id, cond)
        triggered_count = len(eval_result.get("triggered", []))
        triggered_params = [t["parameter"] for t in eval_result.get("triggered", [])]

        indicator_count_series.append({
            "week": week,
            "triggered_count": triggered_count,
            "triggered_parameters": triggered_params,
            "status": eval_result.get("overall_status"),
        })

        if triggered_count >= 2:
            multi_events.append({
                "week": week,
                "triggered_count": triggered_count,
                "triggered_parameters": triggered_params,
                "status": eval_result.get("overall_status"),
            })

    peak_event = max(indicator_count_series, key=lambda x: x["triggered_count"]) if indicator_count_series else None

    return {
        "equipment_id": equipment_id,
        "multi_indicator_events": multi_events,
        "peak_event": peak_event,
        "indicator_count_series": indicator_count_series,
        "multi_indicator_event_count": len(multi_events),
    }
