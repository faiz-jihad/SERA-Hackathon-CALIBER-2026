"""
SERA Problem Detection Engine
Hybrid: engineering thresholds + trend analysis + anomaly scoring
"""
from typing import List, Optional
import pandas as pd
import numpy as np

from analytics.features import compute_features, THRESHOLDS, _classify_level


# ─────────────────────────────────────────────────────────
# Detection Rules
# ─────────────────────────────────────────────────────────

PROBLEM_RULES = [
    {
        "problem_type": "High Vibration",
        "severity_fn": lambda r: _vib_severity(r),
        "check_fn": lambda df, r: _check_high_vibration(df, r),
    },
    {
        "problem_type": "Coupling Misalignment",
        "severity_fn": lambda r: _coupling_severity(r),
        "check_fn": lambda df, r: _check_coupling_misalignment(df, r),
    },
    {
        "problem_type": "Bearing Overtemperature",
        "severity_fn": lambda r: _temp_severity(r),
        "check_fn": lambda df, r: _check_bearing_overtemp(df, r),
    },
    {
        "problem_type": "Abnormal 2X Harmonic",
        "severity_fn": lambda r: _harmonic_severity(r),
        "check_fn": lambda df, r: _check_abnormal_harmonic(df, r),
    },
]


def _sanitize_for_json(obj):
    """Recursively convert numpy types, NaN, datetimes, and UUIDs to Python JSON-safe native types."""
    import math
    from datetime import date, datetime
    import uuid
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


def detect_problems(records: List[dict]) -> List[dict]:
    """
    Main detection entry point.
    Returns a list of detected problems with evidence.
    """
    if not records:
        return []

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
        result = rule["check_fn"](df, latest)
        if result["detected"]:
            severity = rule["severity_fn"](latest)
            detected.append({
                "problem_type": rule["problem_type"],
                "severity": severity,
                "detected_at": str(latest.get("timestamp") or ""),
                "evidence": _sanitize_for_json(result["evidence"]),
                "parameters": _sanitize_for_json(result["parameters"]),
            })

    return detected


# ─────────────────────────────────────────────────────────
# Individual Check Functions
# ─────────────────────────────────────────────────────────

def _check_high_vibration(df: pd.DataFrame, latest) -> dict:
    """Detect high vibration condition."""
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

    if vib is not None and vib >= THRESHOLDS["vibration"]["alarm"]:
        evidence.append(f"Vibration = {vib:.2f} mm/s [EXCEEDS ALARM threshold {THRESHOLDS['vibration']['alarm']} mm/s]")
        detected = True

    if vib_change is not None and vib_change > 0.5:
        evidence.append(f"Vibration increased by {vib_change:.2f} mm/s in last measurement")
        if not detected:
            detected = True

    if vib_trend == "increasing":
        evidence.append("Vibration trend is INCREASING over last 3 measurements")

    if alarm_count and alarm_count >= 2:
        evidence.append(f"Vibration has been above ALARM threshold for {int(alarm_count)} consecutive measurements")
        detected = True

    if status in ("ALARM", "TRIP", "CRITICAL"):
        evidence.append(f"Equipment status = {status}")
        detected = True

    return {"detected": detected, "evidence": evidence, "parameters": parameters}


def _check_coupling_misalignment(df: pd.DataFrame, latest) -> dict:
    """Detect coupling misalignment pattern."""
    evidence = []
    parameters = {}

    coupling = _get(latest, "coupling_offset")
    harmonic = _get(latest, "harmonic_2x")
    vib = _get(latest, "vibration")
    coupling_level = _get(latest, "coupling_offset_level", "NORMAL")
    harmonic_level = _get(latest, "harmonic_2x_level", "NORMAL")

    parameters["coupling_offset"] = coupling
    parameters["harmonic_2x"] = harmonic
    parameters["vibration"] = vib

    # Misalignment: high coupling + high 2X + high vibration
    indicators = 0
    detected = False

    if coupling is not None and coupling >= THRESHOLDS["coupling_offset"]["warning"]:
        evidence.append(f"Coupling offset = {coupling:.3f} mm [Level: {coupling_level}]")
        indicators += 1

    if harmonic is not None and harmonic >= THRESHOLDS["harmonic_2x"]["warning"]:
        evidence.append(f"2X Harmonic = {harmonic:.2f} [Level: {harmonic_level}]")
        indicators += 1

    # Check increasing coupling trend
    coupling_trend = _get(latest, "coupling_offset_trend", "stable")
    if coupling_trend == "increasing":
        evidence.append("Coupling offset trend is INCREASING")
        indicators += 1

    if vib is not None and vib >= THRESHOLDS["vibration"]["warning"]:
        evidence.append(f"Overall vibration elevated: {vib:.2f} mm/s")
        indicators += 1

    if indicators >= 2:
        detected = True
        evidence.append(f"Pattern matches COUPLING MISALIGNMENT signature ({indicators} of 4 indicators)")

    return {"detected": detected, "evidence": evidence, "parameters": parameters}


def _check_bearing_overtemp(df: pd.DataFrame, latest) -> dict:
    """Detect bearing overtemperature."""
    evidence = []
    parameters = {}

    temp = _get(latest, "bearing_temperature")
    temp_change = _get(latest, "bearing_temperature_change")
    temp_level = _get(latest, "bearing_temperature_level", "NORMAL")

    parameters["bearing_temperature"] = temp
    parameters["bearing_temperature_change"] = temp_change
    parameters["bearing_temperature_level"] = temp_level

    detected = False

    if temp is not None and temp >= THRESHOLDS["bearing_temperature"]["alarm"]:
        evidence.append(f"Bearing temperature = {temp:.1f}°C [EXCEEDS ALARM threshold {THRESHOLDS['bearing_temperature']['alarm']}°C]")
        detected = True

    if temp_change is not None and temp_change > 5.0:
        evidence.append(f"Bearing temperature increased by {temp_change:.1f}°C in last measurement")
        if not detected and temp is not None and temp >= THRESHOLDS["bearing_temperature"]["warning"]:
            detected = True

    temp_trend = _get(latest, "bearing_temperature_trend", "stable")
    if temp_trend == "increasing":
        evidence.append("Bearing temperature trend is INCREASING")

    return {"detected": detected, "evidence": evidence, "parameters": parameters}


def _check_abnormal_harmonic(df: pd.DataFrame, latest) -> dict:
    """Detect abnormal 2X harmonic (misalignment or looseness)."""
    evidence = []
    parameters = {}

    harmonic = _get(latest, "harmonic_2x")
    harmonic_change = _get(latest, "harmonic_2x_change")
    harmonic_level = _get(latest, "harmonic_2x_level", "NORMAL")

    parameters["harmonic_2x"] = harmonic
    parameters["harmonic_2x_change"] = harmonic_change

    detected = False

    if harmonic is not None and harmonic >= THRESHOLDS["harmonic_2x"]["alarm"]:
        evidence.append(f"2X Harmonic = {harmonic:.2f} [Level: {harmonic_level}] — indicates resonance or misalignment")
        detected = True

    if harmonic_change is not None and harmonic_change > 0.5:
        evidence.append(f"2X Harmonic increased by {harmonic_change:.2f} in last measurement")

    harmonic_trend = _get(latest, "harmonic_2x_trend", "stable")
    if harmonic_trend == "increasing":
        evidence.append("2X Harmonic trend is INCREASING")

    return {"detected": detected, "evidence": evidence, "parameters": parameters}


# ─────────────────────────────────────────────────────────
# Severity helpers
# ─────────────────────────────────────────────────────────

def _vib_severity(row) -> str:
    vib = _get(row, "vibration")
    if vib is None:
        return "LOW"
    if vib >= THRESHOLDS["vibration"]["trip"]:
        return "CRITICAL"
    if vib >= THRESHOLDS["vibration"]["alarm"]:
        return "HIGH"
    if vib >= THRESHOLDS["vibration"]["warning"]:
        return "MEDIUM"
    return "LOW"


def _coupling_severity(row) -> str:
    coupling = _get(row, "coupling_offset")
    if coupling is None:
        return "MEDIUM"
    if coupling >= THRESHOLDS["coupling_offset"]["trip"]:
        return "CRITICAL"
    if coupling >= THRESHOLDS["coupling_offset"]["alarm"]:
        return "HIGH"
    return "MEDIUM"


def _temp_severity(row) -> str:
    temp = _get(row, "bearing_temperature")
    if temp is None:
        return "MEDIUM"
    if temp >= THRESHOLDS["bearing_temperature"]["trip"]:
        return "CRITICAL"
    if temp >= THRESHOLDS["bearing_temperature"]["alarm"]:
        return "HIGH"
    return "MEDIUM"


def _harmonic_severity(row) -> str:
    h = _get(row, "harmonic_2x")
    if h is None:
        return "LOW"
    if h >= THRESHOLDS["harmonic_2x"]["trip"]:
        return "HIGH"
    if h >= THRESHOLDS["harmonic_2x"]["alarm"]:
        return "MEDIUM"
    return "LOW"


def _get(row, key, default=None):
    """Safe row getter supporting both dict and Series."""
    try:
        val = row[key] if isinstance(row, dict) else row.get(key) if hasattr(row, 'get') else getattr(row, key, default)
        if val is None or (isinstance(val, float) and np.isnan(val)):
            return default
        return val
    except (KeyError, AttributeError):
        return default
