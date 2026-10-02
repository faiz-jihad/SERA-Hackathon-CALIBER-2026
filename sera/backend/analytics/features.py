"""
SERA Feature Engineering
Computes derived features from raw equipment condition data.
"""
from typing import List, Optional, Dict, Any
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

    # ── Harmonic ratio (Strict 2X / 1X: only calculated if 1X component is present in source data)
    if "harmonic_2x" in df.columns and "harmonic_1x" in df.columns:
        df["harmonic_ratio"] = df.apply(
            lambda r: (r["harmonic_2x"] / r["harmonic_1x"])
            if (pd.notna(r["harmonic_2x"]) and pd.notna(r["harmonic_1x"]) and r["harmonic_1x"] > 0)
            else None,
            axis=1
        )
    else:
        df["harmonic_ratio"] = None

    # ── Change features (delta from previous measurement)
    for col in numeric_cols:
        if col in df.columns:
            df[f"{col}_change"] = df[col].diff()
            df[f"{col}_pct_change"] = df[col].pct_change() * 100

    # ── Multi-period rolling trend slopes (3-point, 4-week, 8-week, 12-week)
    for col in ["vibration", "harmonic_2x", "coupling_offset", "bearing_temperature"]:
        if col in df.columns:
            s_col = pd.Series(df[col])
            if len(df) >= 3:
                df[f"{col}_slope"] = _rolling_slope(s_col, window=3)
                df[f"{col}_trend"] = df[f"{col}_slope"].apply(
                    lambda s: "increasing" if s > 0.05 else ("decreasing" if s < -0.05 else "stable")
                )
            if len(df) >= 4:
                df[f"{col}_slope_4w"] = _rolling_slope(s_col, window=4)
            if len(df) >= 8:
                df[f"{col}_slope_8w"] = _rolling_slope(s_col, window=8)
            if len(df) >= 12:
                df[f"{col}_slope_12w"] = _rolling_slope(s_col, window=12)

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
        df["consecutive_alarm_count"] = _consecutive_alarm(pd.Series(df["vibration"]), THRESHOLDS["vibration"]["alarm"])

    # ── Composite severity score (0-100)
    df["severity_score"] = df.apply(_compute_severity_score, axis=1)

    return df


def _rolling_slope(series: pd.Series, window: int = 3) -> pd.Series:
    """Compute rolling linear slope over specified window."""
    slopes = [np.nan] * len(series)
    for i in range(window - 1, len(series)):
        y = series.iloc[i - window + 1:i + 1].values
        x = np.arange(len(y))
        valid = ~np.isnan(y)
        if valid.sum() >= 2:
            slope, _ = np.polyfit(x[valid], y[valid], 1)
            slopes[i] = round(float(slope), 4)
    return pd.Series(slopes, index=series.index)


def compute_linear_regression(y_values: List[float]) -> dict:
    """
    Fits linear regression y = slope * x + intercept on a sequence of values.
    Computes slope, intercept, start, end, % change, direction, and R^2 confidence.
    """
    valid_pairs = [(idx, val) for idx, val in enumerate(y_values) if val is not None and not np.isnan(val)]
    n = len(valid_pairs)
    if n < 2:
        return {
            "slope": 0.0,
            "intercept": float(y_values[-1]) if y_values and y_values[-1] is not None else 0.0,
            "start_value": float(y_values[0]) if y_values and y_values[0] is not None else 0.0,
            "end_value": float(y_values[-1]) if y_values and y_values[-1] is not None else 0.0,
            "change_percentage": 0.0,
            "trend_direction": "insufficient_data",
            "observations_count": n,
            "r_squared": 0.0,
        }

    x = np.array([p[0] for p in valid_pairs], dtype=float)
    y = np.array([p[1] for p in valid_pairs], dtype=float)

    # Fit 1st degree polynomial
    slope, intercept = np.polyfit(x, y, 1)

    # R-squared quality indicator
    y_pred = slope * x + intercept
    ss_tot = np.sum((y - np.mean(y)) ** 2)
    ss_res = np.sum((y - y_pred) ** 2)
    r_squared = 1.0 - (ss_res / ss_tot) if ss_tot > 0 else 1.0
    r_squared = max(0.0, min(1.0, float(r_squared)))

    start_val = float(y[0])
    end_val = float(y[-1])
    pct_change = round(((end_val - start_val) / start_val * 100), 2) if start_val != 0 else 0.0

    direction = "increasing" if slope > 0.01 else ("decreasing" if slope < -0.01 else "stable")

    return {
        "slope": round(float(slope), 4),
        "intercept": round(float(intercept), 4),
        "start_value": round(start_val, 4),
        "end_value": round(end_val, 4),
        "change_percentage": pct_change,
        "trend_direction": direction,
        "observations_count": n,
        "r_squared": round(r_squared, 4),
    }


def compute_multi_window_trends(records: List[dict], parameters: Optional[List[str]] = None) -> dict:
    """
    Computes rigorous linear regression over distinct 4-week, 8-week, and 12-week windows.
    Returns separated sections for 4 weeks, 8 weeks, 12 weeks per Section 8.
    """
    if not records:
        return {"4_weeks": {}, "8_weeks": {}, "12_weeks": {}, "total_records": 0}

    df = pd.DataFrame(records)
    if "timestamp" in df.columns:
        df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
        df = df.sort_values("timestamp")
    elif "week_number" in df.columns:
        df = df.sort_values("week_number")

    default_params = ["vibration", "harmonic_2x", "coupling_offset", "bearing_temperature"]
    target_params = parameters or [p for p in default_params if p in df.columns]
    if not target_params:
        target_params = [c for c in df.select_dtypes(include=[np.number]).columns if c not in ("week_number", "id")]

    # If critical / trip point exists in recent history, center evaluation on the peak anomaly
    alarm_or_trip = df[df["status"].astype(str).str.upper().isin(["TRIP", "ALARM", "CRITICAL"])] if "status" in df.columns else pd.DataFrame()
    end_idx = int(alarm_or_trip.index.tolist()[-1]) + 1 if not alarm_or_trip.empty else len(df)
    sub_df = df.iloc[:end_idx]

    windows = {"4_weeks": 4, "8_weeks": 8, "12_weeks": 12}
    result: Dict[str, Any] = {"total_records": len(df)}

    for win_label, win_size in windows.items():
        win_df = sub_df.tail(win_size)
        win_metrics = {}
        for param in target_params:
            if param in win_df.columns:
                series: List[float] = []
                for val in win_df[param].tolist():
                    try:
                        f = float(val)
                        if not np.isnan(f):
                            series.append(f)
                    except (ValueError, TypeError):
                        pass
                win_metrics[param] = compute_linear_regression(series)
        result[win_label] = win_metrics

    return result


def compute_correlations(records: List[dict]) -> dict:
    """
    Computes empirical Pearson and Spearman correlation matrices between sensor channels.
    Returns pairwise records without forcing targets or claiming causality.
    """
    if not records or len(records) < 4:
        return {"matrix": {}, "spearman_matrix": {}, "pairwise": []}

    df = pd.DataFrame(records)
    candidate_cols = [
        "vibration", "harmonic_2x", "coupling_offset", "bearing_temperature",
        "motor_temperature", "radial_vibration", "axial_vibration",
        "seal_flush_flow", "discharge_pressure", "lube_oil_water",
        "motor_ampere", "tube_side_dp"
    ]
    cols = [c for c in candidate_cols if c in df.columns]
    if len(cols) < 2:
        num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        cols = [c for c in num_cols if c not in ("week_number", "id")][:6]

    if len(cols) < 2:
        return {"matrix": {}, "spearman_matrix": {}, "pairwise": []}

    for c in cols:
        df[c] = pd.to_numeric(df[c], errors="coerce")

    # Drop all-NaN columns
    valid_cols = [c for c in cols if df[c].count() >= 3 and df[c].std() > 0]
    if len(valid_cols) < 2:
        return {"matrix": {}, "spearman_matrix": {}, "pairwise": []}

    clean_df = pd.DataFrame(df[valid_cols])
    pearson_corr = clean_df.corr(method="pearson").round(3).fillna(0.0).to_dict()
    spearman_corr = clean_df.corr(method="spearman").round(3).fillna(0.0).to_dict()

    time_range = {}
    if "timestamp" in df.columns and bool(df["timestamp"].notna().any()):
        time_range = {
            "start": str(df["timestamp"].dropna().iloc[0]),
            "end": str(df["timestamp"].dropna().iloc[-1])
        }

    pairwise = []
    seen_pairs = set()
    for i, col_a in enumerate(valid_cols):
        for col_b in valid_cols[i + 1:]:
            pair_key = tuple(sorted([col_a, col_b]))
            if pair_key in seen_pairs:
                continue
            seen_pairs.add(pair_key)
            valid_sub = pd.DataFrame(clean_df[[col_a, col_b]]).dropna()
            r_val = float(pearson_corr.get(col_a, {}).get(col_b, 0.0))
            rho_val = float(spearman_corr.get(col_a, {}).get(col_b, 0.0))
            pairwise.append({
                "parameter_a": col_a,
                "parameter_b": col_b,
                "pearson_r": r_val,
                "spearman_rho": rho_val,
                "observation_count": len(valid_sub),
                "time_range": time_range
            })

    return {
        "matrix": pearson_corr,
        "spearman_matrix": spearman_corr,
        "pairwise": pairwise,
    }


def get_harmonic_analysis(records: List[dict], equipment_id: str) -> dict:
    """
    Inspects equipment data for 2X and 1X components.
    Complies with Requirement 9: If 1X does not exist, return available: false.
    Do NOT fabricate 1X or equate overall vibration to 1X.
    """
    if not records:
        return {
            "equipment_id": equipment_id,
            "available": False,
            "reason": "No condition records available."
        }

    df = pd.DataFrame(records)
    has_1x = "harmonic_1x" in df.columns and df["harmonic_1x"].dropna().count() > 0
    has_2x = "harmonic_2x" in df.columns and df["harmonic_2x"].dropna().count() > 0

    if not has_1x or not has_2x:
        return {
            "equipment_id": equipment_id,
            "available": False,
            "reason": "Required 1X component is not available in source data." if not has_1x else "Required 2X component is not available in source data.",
            "note": "Case 2 dataset provides Overall Vibration (mm/s RMS) and 2X Harmonic (mm/s), but lacks discrete 1X spectral component. Calculation omitted to avoid fabrication."
        }

    latest = df.iloc[-1]
    h1 = float(latest["harmonic_1x"]) if ("harmonic_1x" in latest and pd.notna(latest["harmonic_1x"])) else None
    h2 = float(latest["harmonic_2x"]) if ("harmonic_2x" in latest and pd.notna(latest["harmonic_2x"])) else None
    ratio = (h2 / h1) if (h1 and h1 > 0 and h2 is not None) else None

    return {
        "equipment_id": equipment_id,
        "available": True,
        "harmonic_1x": round(h1, 3) if h1 else None,
        "harmonic_2x": round(h2, 3) if h2 else None,
        "harmonic_ratio": round(ratio, 3) if ratio else None,
        "formula": "harmonic_2x / harmonic_1x",
        "evaluation": "Elevated 2X/1X ratio confirms angular/parallel misalignment forcing." if ratio and ratio > 1.5 else "Harmonic ratio within nominal limits."
    }


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
        "harmonic_ratio": latest.get("harmonic_ratio"),
        "coupling_offset": latest.get("coupling_offset"),
        "bearing_temperature": latest.get("bearing_temperature"),
        "vibration_change": latest.get("vibration_change"),
        "vibration_trend": latest.get("vibration_trend", "stable"),
        "vibration_slope_4w": latest.get("vibration_slope_4w"),
        "vibration_slope_8w": latest.get("vibration_slope_8w"),
        "vibration_slope_12w": latest.get("vibration_slope_12w"),
        "severity_score": latest.get("severity_score", 0),
        "consecutive_alarm_count": latest.get("consecutive_alarm_count", 0),
        "vibration_level": latest.get("vibration_level", "NORMAL"),
        "bearing_temperature_level": latest.get("bearing_temperature_level", "NORMAL"),
    }
    return summary


# Alias for compatibility with LangGraph investigation agent
calculate_trend_features = compute_features


