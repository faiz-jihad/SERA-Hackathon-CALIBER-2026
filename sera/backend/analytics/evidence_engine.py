"""
SERA Structured Evidence Layer & "What Changed?" Engine
Complies with CALIBER 2026 Case 2 Specification (Sections 10 & 11)

Generates:
1. Structured Evidence Items (E-001, E-002, ...) with full provenance.
2. "What Changed?" comparative analysis (Baseline vs Previous vs Current).
"""
from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np

from analytics.features import compute_features
from analytics.rule_engine import default_rule_engine


def build_evidence_layer(records: List[Dict[str, Any]], equipment_id: str) -> List[Dict[str, Any]]:
    """
    Builds a structured evidence list (E-001, E-002, ...) with numerical change,
    threshold comparison, source provenance, and physical interpretation.
    """
    if not records:
        return []

    df = compute_features(records)
    if df.empty:
        return []

    # If critical/trip occurred in recent history, inspect the peak/alarm observation
    recent_df = df.tail(4)
    alarm_or_trip = recent_df[recent_df["status"].astype(str).str.upper().isin(["TRIP", "ALARM", "CRITICAL"])]
    if not alarm_or_trip.empty:
        curr_idx = alarm_or_trip.index[-1]
        current_row = df.loc[curr_idx]
        prev_row = df.loc[curr_idx - 1] if curr_idx > 0 else current_row
    else:
        current_row = df.iloc[-1]
        prev_row = df.iloc[-2] if len(df) > 1 else current_row

    evidence_items = []
    item_counter = 1

    parameters_to_check = [
        ("vibration", "Vibration Velocity RMS", "mm/s", "BL-5702_equipment_condition.xlsx"),
        ("harmonic_2x", "2X Rotational Harmonic", "mm/s", "BL-5702_equipment_condition.xlsx"),
        ("coupling_offset", "Coupling Radial Offset", "mm", "BL-5702_equipment_condition.xlsx"),
        ("bearing_temperature", "DE Bearing Temperature", "°C", "BL-5702_equipment_condition.xlsx"),
    ]

    for param_key, param_name, unit, default_source in parameters_to_check:
        curr_val = current_row.get(param_key)
        prev_val = prev_row.get(param_key)

        if curr_val is None or (isinstance(curr_val, float) and np.isnan(curr_val)):
            continue

        curr_val = float(curr_val)
        prev_val = float(prev_val) if (prev_val is not None and not np.isnan(prev_val)) else curr_val
        change = round(curr_val - prev_val, 3)

        # Evaluate rules for this parameter
        trig_rules = default_rule_engine.evaluate_parameter(equipment_id, param_key, curr_val)
        highest_rule = trig_rules[0] if trig_rules else None

        threshold_str = f"{highest_rule['condition']} {highest_rule['threshold']} {unit}" if highest_rule else f"Nominal ({unit})"
        source_str = highest_rule['source_reference'] if highest_rule else default_source

        # Interpretation based on engineering behavior
        if param_key == "vibration":
            if curr_val >= 11.0:
                interpretation = f"Vibration velocity reached {curr_val:.2f} {unit}, exceeding emergency interlock trip limit."
            elif curr_val >= 8.5:
                interpretation = f"Vibration breached alarm threshold ({curr_val:.2f} {unit}) with accelerating slope (+{change:.2f} {unit})."
            else:
                interpretation = f"Vibration velocity within normal operating limits ({curr_val:.2f} {unit})."
        elif param_key == "coupling_offset":
            if curr_val >= 0.15:
                interpretation = f"Coupling offset reached {curr_val:.3f} {unit}, causing severe flexible insert deformation and angular deflection."
            elif curr_val >= 0.05:
                interpretation = f"Coupling offset exceeded warning limit ({curr_val:.3f} {unit}), indicating shaft centerline misalignment."
            else:
                interpretation = f"Coupling radial alignment within tolerance ({curr_val:.3f} {unit})."
        elif param_key == "harmonic_2x":
            if curr_val >= 5.0:
                interpretation = f"Prominent 2X harmonic peak ({curr_val:.2f} {unit}) confirms classic twice-per-revolution misalignment forcing."
            elif curr_val >= 3.0:
                interpretation = f"Elevated 2X rotational harmonic ({curr_val:.2f} {unit}) indicating developing alignment stress."
            else:
                interpretation = f"2X harmonic amplitude is within normal baseline ({curr_val:.2f} {unit})."
        elif param_key == "bearing_temperature":
            if curr_val >= 90.0:
                interpretation = f"Bearing temperature thermal surge ({curr_val:.1f} {unit}) caused by high misalignment friction and radial load."
            elif curr_val >= 75.0:
                interpretation = f"Bearing temperature elevated ({curr_val:.1f} {unit}) above warning threshold."
            else:
                interpretation = f"Bearing operating temperature is normal ({curr_val:.1f} {unit})."
        else:
            interpretation = f"{param_name} observed at {curr_val:.2f} {unit} (Change: {change:+.2f})."

        evidence_items.append({
            "evidence_id": f"E-{item_counter:03d}",
            "parameter": param_name,
            "parameter_key": param_key,
            "observed_value": curr_val,
            "previous_value": prev_val,
            "change": change,
            "unit": unit,
            "threshold": threshold_str,
            "severity": highest_rule["severity"] if highest_rule else "NORMAL",
            "source": source_str,
            "timestamp": str(current_row.get("timestamp") or ""),
            "interpretation": interpretation,
        })
        item_counter += 1

    return evidence_items


def compute_what_changed(records: List[Dict[str, Any]], equipment_id: str) -> Dict[str, Any]:
    """
    Computes comparative "What Changed?" analysis across Baseline vs Previous vs Current observations.
    """
    if not records:
        return {"comparison": [], "summary": "No data available"}

    df = compute_features(records)
    if df.empty:
        return {"comparison": [], "summary": "No data available"}

    # Baseline: Average of first 4 observations (weeks 1-4)
    baseline_window = df.head(min(4, len(df)))

    # If critical/trip occurred, evaluate that critical window
    recent_df = df.tail(4)
    alarm_or_trip = recent_df[recent_df["status"].astype(str).str.upper().isin(["TRIP", "ALARM", "CRITICAL"])]
    if not alarm_or_trip.empty:
        curr_idx = alarm_or_trip.index[-1]
        current_row = df.loc[curr_idx]
        prev_row = df.loc[curr_idx - 1] if curr_idx > 0 else current_row
    else:
        current_row = df.iloc[-1]
        prev_row = df.iloc[-2] if len(df) > 1 else current_row

    comparison = []
    parameters = [
        ("vibration", "Vibration Velocity RMS", "mm/s"),
        ("harmonic_2x", "2X Rotational Harmonic", "mm/s"),
        ("coupling_offset", "Coupling Radial Offset", "mm"),
        ("bearing_temperature", "DE Bearing Temperature", "°C"),
        ("motor_temperature", "Motor Temperature", "°C"),
    ]

    notable_changes = []

    for param_key, param_name, unit in parameters:
        curr_val = current_row.get(param_key)
        prev_val = prev_row.get(param_key)
        base_val = baseline_window[param_key].mean() if param_key in baseline_window.columns else curr_val

        if curr_val is None or (isinstance(curr_val, float) and np.isnan(curr_val)):
            continue

        curr_val = float(curr_val)
        prev_val = float(prev_val) if (prev_val is not None and not np.isnan(prev_val)) else curr_val
        base_val = float(base_val) if (base_val is not None and not np.isnan(base_val)) else curr_val

        abs_change = round(curr_val - prev_val, 3)
        pct_change = round(((curr_val - prev_val) / prev_val * 100), 1) if prev_val != 0 else 0.0
        delta_from_baseline = round(curr_val - base_val, 3)

        trend = "Increasing" if abs_change > 0.05 else ("Decreasing" if abs_change < -0.05 else "Stable")

        # Status check
        trig = default_rule_engine.evaluate_parameter(equipment_id, param_key, curr_val)
        status = trig[0]["severity"] if trig else "NORMAL"

        if status in ("ALARM", "CRITICAL", "TRIP"):
            notable_changes.append(f"{param_name} surged from baseline {base_val:.2f} to {curr_val:.2f} {unit} ({status})")

        comparison.append({
            "parameter": param_name,
            "parameter_key": param_key,
            "unit": unit,
            "baseline_value": round(base_val, 3),
            "previous_value": round(prev_val, 3),
            "current_value": round(curr_val, 3),
            "absolute_change": abs_change,
            "percentage_change": pct_change,
            "delta_from_baseline": delta_from_baseline,
            "trend": trend,
            "status": status,
        })

    summary = (
        f"Significant degradation detected: {'; '.join(notable_changes)}."
        if notable_changes else "All parameters operating within nominal baseline parameters."
    )

    return {
        "equipment_id": equipment_id,
        "current_period": str(current_row.get("timestamp") or current_row.get("week_number") or "Current"),
        "previous_period": str(prev_row.get("timestamp") or prev_row.get("week_number") or "Previous"),
        "comparison": comparison,
        "summary": summary,
    }
