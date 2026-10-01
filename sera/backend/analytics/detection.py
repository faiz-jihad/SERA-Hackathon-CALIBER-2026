"""
SERA Problem Detection Engine
Hybrid: engineering thresholds + trend analysis + anomaly scoring
"""
import math
import uuid
from datetime import date, datetime
from typing import List
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


# ─────────────────────────────────────────────────────────
# Individual Check Functions
# ─────────────────────────────────────────────────────────

def _check_high_vibration(_df: pd.DataFrame, latest) -> dict:
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


def _check_coupling_misalignment(_df: pd.DataFrame, latest) -> dict:
    """Detect coupling misalignment."""
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

    if harmonic_2x is not None and harmonic_2x >= THRESHOLDS["harmonic_2x"]["alarm"]:
        evidence.append(
            f"2X Harmonic = {harmonic_2x:.2f} mm/s [EXCEEDS ALARM threshold {THRESHOLDS['harmonic_2x']['alarm']} mm/s]"
        )
        detected = True

    if coupling is not None and coupling >= THRESHOLDS["coupling_offset"]["alarm"]:
        evidence.append(
            f"Coupling Offset = {coupling:.3f} mm [EXCEEDS ALARM threshold {THRESHOLDS['coupling_offset']['alarm']} mm]"
        )
        detected = True

    if vib is not None and vib >= THRESHOLDS["vibration"]["alarm"] and (
        (harmonic_2x is not None and harmonic_2x >= THRESHOLDS["harmonic_2x"]["warning"]) or
        (coupling is not None and coupling >= THRESHOLDS["coupling_offset"]["warning"])
    ):
        evidence.append("Combined high vibration with elevated 2X harmonic and/or coupling offset")
        detected = True

    if status == "TRIP":
        evidence.append("Operational trip event correlated with high vibration signature")
        detected = True

    return {"detected": detected, "evidence": evidence, "parameters": parameters}


def _check_bearing_overtemp(_df: pd.DataFrame, latest) -> dict:
    """Detect bearing overtemperature."""
    evidence = []
    parameters = {}

    temp = _get(latest, "bearing_temperature")
    temp_change = _get(latest, "temp_change")
    temp_trend = _get(latest, "temp_trend", "stable")

    parameters["bearing_temperature"] = temp
    parameters["temp_change"] = temp_change
    parameters["temp_trend"] = temp_trend

    detected = False

    if temp is not None and temp >= THRESHOLDS["bearing_temperature"]["alarm"]:
        evidence.append(
            f"Bearing temperature = {temp:.1f} °C [EXCEEDS ALARM threshold {THRESHOLDS['bearing_temperature']['alarm']} °C]"
        )
        detected = True

    if temp_change is not None and temp_change > 5.0:
        evidence.append(f"Bearing temperature jumped by {temp_change:.1f} °C in last measurement")
        if not detected:
            detected = True

    if temp_trend == "increasing" and temp is not None and temp >= THRESHOLDS["bearing_temperature"]["warning"]:
        evidence.append("Bearing temperature showing continuous upward trend")
        if not detected:
            detected = True

    return {"detected": detected, "evidence": evidence, "parameters": parameters}


def _check_abnormal_harmonic(_df: pd.DataFrame, latest) -> dict:
    """Detect abnormal harmonic patterns."""
    evidence = []
    parameters = {}

    harmonic_2x = _get(latest, "harmonic_2x")
    harmonic_ratio = _get(latest, "harmonic_ratio")

    parameters["harmonic_2x"] = harmonic_2x
    parameters["harmonic_ratio"] = harmonic_ratio

    detected = False

    if harmonic_2x is not None and harmonic_2x >= THRESHOLDS["harmonic_2x"]["alarm"]:
        evidence.append(f"2X Harmonic = {harmonic_2x:.2f} mm/s (Alarm: {THRESHOLDS['harmonic_2x']['alarm']} mm/s)")
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
                "detected_at": str(_get(latest, "timestamp") or ""),
                "evidence": _sanitize_for_json(result["evidence"]),
                "parameters": _sanitize_for_json(result["parameters"]),
            })

    return detected
