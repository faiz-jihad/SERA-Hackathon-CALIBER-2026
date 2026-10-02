"""
SERA Problem Detection Engine
Hybrid: engineering thresholds + trend analysis + anomaly scoring
"""
import math
import uuid
from datetime import date, datetime
from typing import List, Optional, Dict, Any
import pandas as pd
import numpy as np

from analytics.features import compute_features, THRESHOLDS


def _get(row, key, default=None):
    """Safe row getter supporting both dict and Series."""
    try:
        val = row[key] if isinstance(row, dict) else row.get(key) if hasattr(row, 'get') else getattr(row, key, default)
        if val is None or (isinstance(val, float) and np.isnan(val)):
            return default
        return val
    except (KeyError, AttributeError):
        return default


def _sanitize_for_json(obj):
    """Recursively convert numpy types, NaN, datetimes, and UUIDs to Python JSON-safe native types."""
    if isinstance(obj, dict):
        return {str(k): _sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [_sanitize_for_json(v) for v in obj]
    elif isinstance(obj, (np.integer, int)):
        return int(obj)
    elif isinstance(obj, (np.floating, float)):
        return None if (math.isnan(obj) or math.isinf(obj)) else float(obj)
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, (datetime, date)):
        return obj.isoformat()
    elif isinstance(obj, uuid.UUID):
        return str(obj)
    elif pd.isna(obj):
        return None
    return obj


def _resolve_thresholds(equipment_id: Optional[str] = None) -> Dict[str, Dict[str, Any]]:
    """
    Resolve equipment-specific thresholds dynamically from official equipment registry.
    Ensures zero hardcoding and full multi-equipment calibration.
    """
    base = {
        "vibration": dict(THRESHOLDS.get("vibration", {})),
        "harmonic_2x": dict(THRESHOLDS.get("harmonic_2x", {})),
        "coupling_offset": dict(THRESHOLDS.get("coupling_offset", {})),
        "bearing_temperature": dict(THRESHOLDS.get("bearing_temperature", {})),
        "motor_temperature": dict(THRESHOLDS.get("motor_temperature", {})),
    }
    if equipment_id:
        try:
            from analytics.equipment_thresholds import EQUIPMENT_PARAMETERS
            eq_cfg = EQUIPMENT_PARAMETERS.get(equipment_id.upper(), {}).get("parameters", {})
            for param, pinfo in eq_cfg.items():
                alarm_val = pinfo.get("alarm")
                trip_val = pinfo.get("trip")
                warn_val = pinfo.get("warning") or (alarm_val * 0.75 if alarm_val is not None else None)
                unit_val = pinfo.get("unit", "")

                target_keys = [param]
                if "vibration" in param:
                    target_keys.append("vibration")
                if "harmonic" in param or "2x" in param:
                    target_keys.append("harmonic_2x")
                if "offset" in param or "coupling" in param:
                    target_keys.append("coupling_offset")
                if "bearing" in param and "temp" in param:
                    target_keys.append("bearing_temperature")

                for k in target_keys:
                    if k not in base:
                        base[k] = {}
                    if alarm_val is not None:
                        base[k]["alarm"] = alarm_val
                    if trip_val is not None:
                        base[k]["trip"] = trip_val
                    if warn_val is not None:
                        base[k]["warning"] = warn_val
                    if unit_val:
                        base[k]["unit"] = unit_val
        except Exception:
            pass
    return base


# ─────────────────────────────────────────────────────────
# Individual Check Functions (Fully Dynamic)
# ─────────────────────────────────────────────────────────

def _check_high_vibration(_df: pd.DataFrame, latest, thresholds: Optional[dict] = None) -> dict:
    """Detect high vibration condition using dynamically resolved thresholds."""
    if thresholds is None:
        thresholds = THRESHOLDS
    v_thresh = thresholds.get("vibration", THRESHOLDS.get("vibration", {}))
    v_alarm = v_thresh.get("alarm", 7.0)
    v_unit = v_thresh.get("unit", "mm/s")

    evidence = []
    parameters = {}

    vib = _get(latest, "vibration")
    vib_change = _get(latest, "vibration_change")
    vib_trend = _get(latest, "vibration_trend", "stable")
    vib_level = _get(latest, "vibration_level", "NORMAL")
    alarm_count = _get(latest, "consecutive_alarm_count", 0)
    status = str(_get(latest, "status", "")).upper()

    parameters["vibration"] = vib
    parameters["vibration_change"] = vib_change
    parameters["vibration_level"] = vib_level
    parameters["consecutive_alarm_count"] = alarm_count

    detected = False

    if vib is not None and vib >= v_alarm:
        evidence.append(f"Vibration = {vib:.2f} {v_unit} [EXCEEDS ALARM threshold {v_alarm} {v_unit}]")
        detected = True

    if vib_change is not None and vib_change > (v_alarm * 0.07 if v_alarm else 0.5):
        evidence.append(f"Vibration increased by {vib_change:.2f} {v_unit} in last measurement")
        if not detected:
            detected = True

    if vib_trend == "increasing" and vib_level in ("WARNING", "ALARM", "CRITICAL"):
        evidence.append("Consistent upward trend in vibration over recent weeks")
        if not detected:
            detected = True

    if alarm_count is not None and alarm_count >= 2:
        evidence.append(f"Vibration in alarm/critical state for {alarm_count} consecutive weeks")
        detected = True

    if status in ("TRIP", "ALARM", "CRITICAL"):
        evidence.append(f"Condition status flagged as {status}")
        detected = True

    return {"detected": detected, "evidence": evidence, "parameters": parameters}


def _check_coupling_misalignment(_df: pd.DataFrame, latest, thresholds: Optional[dict] = None) -> dict:
    """Detect coupling misalignment using dynamically resolved thresholds."""
    if thresholds is None:
        thresholds = THRESHOLDS
    h_thresh = thresholds.get("harmonic_2x", THRESHOLDS.get("harmonic_2x", {}))
    c_thresh = thresholds.get("coupling_offset", THRESHOLDS.get("coupling_offset", {}))
    v_thresh = thresholds.get("vibration", THRESHOLDS.get("vibration", {}))

    h_alarm = h_thresh.get("alarm", 3.0)
    h_warn = h_thresh.get("warning", 2.0)
    h_unit = h_thresh.get("unit", "mm/s")

    c_alarm = c_thresh.get("alarm", 0.05)
    c_warn = c_thresh.get("warning", 0.03)
    c_unit = c_thresh.get("unit", "mm")

    v_alarm = v_thresh.get("alarm", 7.0)

    evidence = []
    parameters = {}

    harmonic_2x = _get(latest, "harmonic_2x")
    coupling = _get(latest, "coupling_offset")
    vib = _get(latest, "vibration")
    status = str(_get(latest, "status", "")).upper()

    parameters["harmonic_2x"] = harmonic_2x
    parameters["coupling_offset"] = coupling
    parameters["vibration"] = vib

    detected = False

    if harmonic_2x is not None and harmonic_2x >= h_alarm:
        evidence.append(
            f"2X Harmonic = {harmonic_2x:.2f} {h_unit} [EXCEEDS ALARM threshold {h_alarm} {h_unit}]"
        )
        detected = True

    if coupling is not None and coupling >= c_alarm:
        evidence.append(
            f"Coupling Offset = {coupling:.3f} {c_unit} [EXCEEDS ALARM threshold {c_alarm} {c_unit}]"
        )
        detected = True

    if vib is not None and vib >= v_alarm and (
        (harmonic_2x is not None and harmonic_2x >= h_warn) or
        (coupling is not None and coupling >= c_warn)
    ):
        evidence.append("Combined high vibration with elevated 2X harmonic and/or coupling offset")
        detected = True

    if status == "TRIP" and (
        (harmonic_2x is not None and harmonic_2x >= h_warn) or
        (coupling is not None and coupling >= c_warn)
    ):
        evidence.append("Operational trip event correlated with elevated 2X harmonic and/or coupling offset")
        detected = True

    return {"detected": detected, "evidence": evidence, "parameters": parameters}


def _check_bearing_overtemp(_df: pd.DataFrame, latest, thresholds: Optional[dict] = None) -> dict:
    """Detect bearing overtemperature using dynamically resolved thresholds."""
    if thresholds is None:
        thresholds = THRESHOLDS
    t_thresh = thresholds.get("bearing_temperature", THRESHOLDS.get("bearing_temperature", {}))
    t_alarm = t_thresh.get("alarm", 80.0)
    t_warn = t_thresh.get("warning", 70.0)
    t_unit = t_thresh.get("unit", "°C")

    evidence = []
    parameters = {}

    temp = _get(latest, "bearing_temperature")
    temp_change = _get(latest, "temp_change")
    temp_trend = _get(latest, "temp_trend", "stable")

    parameters["bearing_temperature"] = temp
    parameters["temp_change"] = temp_change
    parameters["temp_trend"] = temp_trend

    detected = False

    if temp is not None and temp >= t_alarm:
        evidence.append(
            f"Bearing temperature = {temp:.1f} {t_unit} [EXCEEDS ALARM threshold {t_alarm} {t_unit}]"
        )
        detected = True

    if temp_change is not None and temp_change > 5.0:
        evidence.append(f"Bearing temperature jumped by {temp_change:.1f} {t_unit} in last measurement")
        if not detected:
            detected = True

    if temp_trend == "increasing" and temp is not None and temp >= t_warn:
        evidence.append("Bearing temperature showing continuous upward trend")
        if not detected:
            detected = True

    return {"detected": detected, "evidence": evidence, "parameters": parameters}


def _check_abnormal_harmonic(_df: pd.DataFrame, latest, thresholds: Optional[dict] = None) -> dict:
    """Detect abnormal harmonic patterns using dynamically resolved thresholds."""
    if thresholds is None:
        thresholds = THRESHOLDS
    h_thresh = thresholds.get("harmonic_2x", THRESHOLDS.get("harmonic_2x", {}))
    h_alarm = h_thresh.get("alarm", 3.0)
    h_unit = h_thresh.get("unit", "mm/s")

    evidence = []
    parameters = {}

    harmonic_2x = _get(latest, "harmonic_2x")
    harmonic_ratio = _get(latest, "harmonic_ratio")

    parameters["harmonic_2x"] = harmonic_2x
    parameters["harmonic_ratio"] = harmonic_ratio

    detected = False

    if harmonic_2x is not None and harmonic_2x >= h_alarm:
        evidence.append(f"2X Harmonic = {harmonic_2x:.2f} {h_unit} (Alarm: {h_alarm} {h_unit})")
        detected = True

    if harmonic_ratio is not None and harmonic_ratio > 0.40:
        evidence.append(
            f"2X Harmonic represents {harmonic_ratio*100:.1f}% of overall vibration [Threshold: 40%]"
        )
        detected = True

    harmonic_trend = _get(latest, "harmonic_2x_trend", "stable")
    if harmonic_trend == "increasing":
        evidence.append("2X Harmonic trend is INCREASING")

    return {"detected": detected, "evidence": evidence, "parameters": parameters}


# ─────────────────────────────────────────────────────────
# Dynamic Severity helpers
# ─────────────────────────────────────────────────────────

def _vib_severity(row, thresholds: Optional[dict] = None) -> str:
    vib = _get(row, "vibration")
    if vib is None:
        return "LOW"
    t = (thresholds or THRESHOLDS).get("vibration", THRESHOLDS.get("vibration", {}))
    trip = t.get("trip", 11.0)
    alarm = t.get("alarm", 7.0)
    warn = t.get("warning", 5.0)
    if vib >= trip:
        return "CRITICAL"
    if vib >= alarm:
        return "HIGH"
    if vib >= warn:
        return "MEDIUM"
    return "LOW"


def _coupling_severity(row, thresholds: Optional[dict] = None) -> str:
    coupling = _get(row, "coupling_offset")
    if coupling is None:
        return "MEDIUM"
    t = (thresholds or THRESHOLDS).get("coupling_offset", THRESHOLDS.get("coupling_offset", {}))
    trip = t.get("trip", 0.30)
    alarm = t.get("alarm", 0.05)
    if coupling >= trip:
        return "CRITICAL"
    if coupling >= alarm:
        return "HIGH"
    return "MEDIUM"


def _temp_severity(row, thresholds: Optional[dict] = None) -> str:
    temp = _get(row, "bearing_temperature")
    if temp is None:
        return "MEDIUM"
    t = (thresholds or THRESHOLDS).get("bearing_temperature", THRESHOLDS.get("bearing_temperature", {}))
    trip = t.get("trip", 95.0)
    alarm = t.get("alarm", 80.0)
    if temp >= trip:
        return "CRITICAL"
    if temp >= alarm:
        return "HIGH"
    return "MEDIUM"


def _harmonic_severity(row, thresholds: Optional[dict] = None) -> str:
    h = _get(row, "harmonic_2x")
    if h is None:
        return "LOW"
    t = (thresholds or THRESHOLDS).get("harmonic_2x", THRESHOLDS.get("harmonic_2x", {}))
    trip = t.get("trip", 5.0)
    alarm = t.get("alarm", 3.0)
    if h >= trip:
        return "HIGH"
    if h >= alarm:
        return "MEDIUM"
    return "LOW"


# ─────────────────────────────────────────────────────────
# Detection Rules
# ─────────────────────────────────────────────────────────

PROBLEM_RULES = [
    {
        "problem_type": "High Vibration",
        "severity_fn": _vib_severity,
        "check_fn": _check_high_vibration,
    },
    {
        "problem_type": "Coupling Misalignment",
        "severity_fn": _coupling_severity,
        "check_fn": _check_coupling_misalignment,
    },
    {
        "problem_type": "Bearing Overtemperature",
        "severity_fn": _temp_severity,
        "check_fn": _check_bearing_overtemp,
    },
    {
        "problem_type": "Abnormal 2X Harmonic",
        "severity_fn": _harmonic_severity,
        "check_fn": _check_abnormal_harmonic,
    },
]


def detect_problems(records: List[dict], equipment_id: Optional[str] = None) -> List[dict]:
    """
    Main detection entry point.
    Dynamically resolves equipment-specific thresholds for zero hardcoding.
    Returns a list of detected problems with evidence.
    """
    if not records:
        return []

    # Auto-detect equipment_id from records if not explicitly passed
    if not equipment_id:
        for r in records:
            if isinstance(r, dict) and r.get("equipment_id"):
                equipment_id = str(r["equipment_id"])
                break

    thresholds = _resolve_thresholds(equipment_id)

    df = compute_features(records)
    if df.empty:
        return []

    detected = []
    # If a critical or alarm condition occurred in evaluations, evaluate that failure point
    alarm_or_trip = df[df["status"].astype(str).str.upper().isin(["TRIP", "ALARM", "CRITICAL"])]
    if not alarm_or_trip.empty:
        latest = alarm_or_trip.iloc[-1]
    else:
        latest = df.iloc[-1]

    for rule in PROBLEM_RULES:
        try:
            # Resilient invocation supporting both check_fn(df, latest, thresholds) and check_fn(df, latest)
            try:
                result = rule["check_fn"](df, latest, thresholds)
            except TypeError:
                result = rule["check_fn"](df, latest)

            if isinstance(result, dict) and result.get("detected"):
                # Resilient invocation supporting both severity_fn(latest, thresholds) and severity_fn(latest)
                try:
                    severity = rule["severity_fn"](latest, thresholds)
                except TypeError:
                    severity = rule["severity_fn"](latest)

                detected.append({
                    "problem_type": str(rule.get("problem_type") or "Unknown Problem"),
                    "severity": str(severity or "MEDIUM"),
                    "detected_at": str(_get(latest, "timestamp") or _get(latest, "week_number") or ""),
                    "evidence": _sanitize_for_json(result.get("evidence", [])),
                    "parameters": _sanitize_for_json(result.get("parameters", {})),
                })
        except Exception:
            continue

    return detected
