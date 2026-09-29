"""
SERA Feature Engineering
Computes derived features from raw equipment condition data.
"""
from typing import List, Optional
import pandas as pd
import numpy as np


# ─────────────────────────────────────────────────────────
# Thresholds (ISO 10816 / API 670 approximate guidelines)
# Engineers should calibrate per equipment spec
# ─────────────────────────────────────────────────────────
# ─────────────────────────────────────────────────────────
# Official CALIBER Case 2 Thresholds (Equipment Info sheet)
# ─────────────────────────────────────────────────────────
THRESHOLDS = {
    "vibration": {
        "warning": 5.0,
        "alarm": 7.0,     # mm/s RMS (Official Alarm)
        "trip": 11.0,     # mm/s RMS (Official Trip)
    },
    "harmonic_2x": {
        "warning": 2.0,
        "alarm": 3.0,     # mm/s (Official Alarm)
        "trip": 5.0,      # mm/s (Official Trip)
    },
    "coupling_offset": {
        "warning": 0.03,
        "alarm": 0.05,    # mm (Official Alarm)
        "trip": 0.30,     # mm (Official Trip)
    },
    "bearing_temperature": {
        "warning": 70.0,
        "alarm": 80.0,    # °C (Official Alarm)
        "trip": 95.0,     # °C (Official Trip)
    },
    "motor_temperature": {
        "warning": 70.0,
        "alarm": 80.0,
        "trip": 95.0,
    },
}


def compute_features(records: List[dict]) -> pd.DataFrame:
    """
    Takes a list of condition record dicts (ordered by timestamp),
    returns a DataFrame enriched with derived features.
    """
    if not records:
        return pd.DataFrame()

    df = pd.DataFrame(records)

    # Sort by timestamp/week
    if "timestamp" in df.columns:
        df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
        df = df.sort_values("timestamp")
    elif "week_number" in df.columns:
        df = df.sort_values("week_number")

    numeric_cols = ["vibration", "harmonic_2x", "coupling_offset",
                    "bearing_temperature", "motor_temperature",
                    "overall_vibration", "axial_vibration", "radial_vibration"]

    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # ── Change features (delta from previous measurement)
    for col in numeric_cols:
        if col in df.columns:
            df[f"{col}_change"] = df[col].diff()
            df[f"{col}_pct_change"] = df[col].pct_change() * 100

    # ── Rolling trend (3-point slope) — use only if enough data
    for col in ["vibration", "harmonic_2x", "coupling_offset", "bearing_temperature"]:
        if col in df.columns and len(df) >= 3:
            df[f"{col}_slope"] = _rolling_slope(df[col], window=3)
            df[f"{col}_trend"] = df[f"{col}_slope"].apply(
                lambda s: "increasing" if s > 0.05 else ("decreasing" if s < -0.05 else "stable")
            )

    # ── Distance to threshold
    for col, thresholds in THRESHOLDS.items():
        if col in df.columns:
            df[f"{col}_dist_alarm"] = thresholds["alarm"] - df[col]
            df[f"{col}_dist_trip"] = thresholds["trip"] - df[col]

    # ── Alarm status per parameter
    for col, thresholds in THRESHOLDS.items():
        if col in df.columns:
            df[f"{col}_level"] = df[col].apply(
                lambda v: _classify_level(v, thresholds) if pd.notna(v) else "UNKNOWN"
            )

    # ── Consecutive alarm count (vibration)
    if "vibration" in df.columns:
        df["consecutive_alarm_count"] = _consecutive_alarm(df["vibration"], THRESHOLDS["vibration"]["alarm"])

    # ── Composite severity score (0-100)
    df["severity_score"] = df.apply(_compute_severity_score, axis=1)

    return df


def _rolling_slope(series: pd.Series, window: int = 3) -> pd.Series:
    """Compute rolling linear slope."""
    slopes = [np.nan] * len(series)
    for i in range(window - 1, len(series)):
        y = series.iloc[i - window + 1:i + 1].values
        x = np.arange(len(y))
        valid = ~np.isnan(y)
        if valid.sum() >= 2:
            slope, _ = np.polyfit(x[valid], y[valid], 1)
            slopes[i] = slope
    return pd.Series(slopes, index=series.index)


def _classify_level(value: float, thresholds: dict) -> str:
    if value >= thresholds.get("trip", float("inf")):
        return "TRIP"
    elif value >= thresholds.get("alarm", float("inf")):
        return "ALARM"
    elif value >= thresholds.get("warning", float("inf")):
        return "WARNING"
    else:
        return "NORMAL"


def _consecutive_alarm(series: pd.Series, alarm_threshold: float) -> pd.Series:
    count = 0
    counts = []
    for v in series:
        if pd.notna(v) and v >= alarm_threshold:
            count += 1
        else:
            count = 0
        counts.append(count)
    return pd.Series(counts, index=series.index)


def _compute_severity_score(row) -> float:
    """
    Composite severity score 0-100.
    Higher = more severe.
    """
    score = 0
    count = 0

    for col, thresholds in THRESHOLDS.items():
        val = row.get(col)
        if val is None or (isinstance(val, float) and np.isnan(val)):
            continue
        trip = thresholds["trip"]
        normal_max = thresholds["warning"]
        if trip > normal_max:
            normalized = min(1.0, max(0.0, (val - normal_max) / (trip - normal_max)))
            score += normalized * 100
            count += 1

    return round(score / count, 1) if count > 0 else 0.0


def get_latest_condition_summary(records: List[dict]) -> dict:
    """Return summary of latest condition for dashboard."""
    if not records:
        return {}

    df = compute_features(records)
    if df.empty:
        return {}

    latest = df.iloc[-1].to_dict()
    summary = {
        "vibration": latest.get("vibration"),
        "harmonic_2x": latest.get("harmonic_2x"),
        "coupling_offset": latest.get("coupling_offset"),
        "bearing_temperature": latest.get("bearing_temperature"),
        "vibration_change": latest.get("vibration_change"),
        "vibration_trend": latest.get("vibration_trend", "stable"),
        "severity_score": latest.get("severity_score", 0),
        "consecutive_alarm_count": latest.get("consecutive_alarm_count", 0),
        "vibration_level": latest.get("vibration_level", "NORMAL"),
        "bearing_temperature_level": latest.get("bearing_temperature_level", "NORMAL"),
    }
    return summary


# Alias for compatibility with LangGraph investigation agent
calculate_trend_features = compute_features

