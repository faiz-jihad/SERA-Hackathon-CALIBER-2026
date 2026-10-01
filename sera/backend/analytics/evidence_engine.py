"""
SERA Structured Evidence Layer & "What Changed?" Engine
Complies with CALIBER 2026 Case 2 Specification (Sections 7, 10, 11)

Generates:
1. Structured Evidence Items (E-001, E-002, ...) evaluated on verified critical observations.
2. "What Changed?" comparative analysis (Baseline Period vs Critical Period vs Current Period).
"""
from typing import List, Dict, Any
import pandas as pd
import numpy as np

from analytics.features import compute_features, compute_correlations
from analytics.rule_engine import default_rule_engine


def _clean_val(v):
    if v is None:
        return None
    try:
        f = float(v)
        if np.isnan(f) or np.isinf(f):
            return None
        return round(f, 3)
    except (TypeError, ValueError):
        return v


def _extract_contexts(df: pd.DataFrame):
    """
    Extracts canonical baseline, critical, and current rows from condition DataFrame.
    Guarantees deterministic selection of the verified trip observation.
    """
    if df.empty:
        raise ValueError("Condition DataFrame cannot be empty when extracting condition context.")

    # 1. Critical Row: Trip -> Critical -> Highest Alarm -> Peak
    trip_rows = df[df["status"].astype(str).str.upper().isin(["TRIP", "CRITICAL"])]
    alarm_rows = df[df["status"].astype(str).str.upper().isin(["ALARM", "WARNING"])]

    if not trip_rows.empty:
        curr_idx = int(trip_rows.index.tolist()[-1])
        critical_row = df.loc[curr_idx]
        prev_row = df.loc[curr_idx - 1] if curr_idx > 0 else critical_row
    elif not alarm_rows.empty:
        sorted_alarm = pd.DataFrame(alarm_rows).sort_values(by="vibration", ascending=False)
        curr_idx = int(sorted_alarm.index.tolist()[0])
        critical_row = df.loc[curr_idx]
        prev_row = df.loc[curr_idx - 1] if curr_idx > 0 else critical_row
    else:
        sorted_all = df.sort_values(by="vibration", ascending=False)
        curr_idx = int(sorted_all.index.tolist()[0])
        critical_row = df.loc[curr_idx]
        prev_row = df.loc[curr_idx - 1] if curr_idx > 0 else critical_row

    # 2. Baseline Window: Healthy period before degradation onset
    first_alarm = int(alarm_rows.index.tolist()[0]) if not alarm_rows.empty else None
    if first_alarm is not None and first_alarm > 0:
        baseline_df = df.loc[:first_alarm - 1]
        baseline_df = baseline_df[baseline_df["status"].astype(str).str.upper() == "NORMAL"]
    else:
        baseline_df = df[df["status"].astype(str).str.upper() == "NORMAL"]

    if baseline_df.empty:
        baseline_df = df.head(min(4, len(df)))
    else:
        baseline_df = baseline_df.head(min(5, len(baseline_df)))

    # 3. Current Row: Latest observation in dataset
    current_row = df.iloc[-1]

    return baseline_df, critical_row, prev_row, current_row


def build_evidence_layer(
    records: List[Dict[str, Any]],
    equipment_id: str,
    context_type: str = "critical"
) -> List[Dict[str, Any]]:
    """
    Builds structured evidence items (E-001, E-002, ...) with numerical change,
    threshold comparison, source provenance, and physical interpretation.
    
    Evaluates the critical condition by default to ground RCA and investigations,
    with explicit temporal context labeling.
    """
    if not records:
        return []

    df = compute_features(records)
    if df.empty:
        return []

    baseline_df, critical_row, prev_row, latest_row = _extract_contexts(df)
    target_row = latest_row if context_type == "current" else critical_row
    reference_prev = df.iloc[-2] if (context_type == "current" and len(df) > 1) else prev_row

    raw_wk = target_row.get("week_number")
    target_wk = int(raw_wk) if (raw_wk is not None and not pd.isna(raw_wk)) else None
    target_ts = str(target_row.get("timestamp") or "")
    target_status = str(target_row.get("status") or "NORMAL").upper()
    temporal_label = (
        f"CURRENT / POST-MAINTENANCE (Week {target_wk})"
        if (target_status == "NORMAL" and target_wk and target_wk > 21)
        else f"CRITICAL_INCIDENT (Week {target_wk}, {target_ts[:10]})"
    )

    evidence_items = []
    item_counter = 1

    parameters_to_check = [
        ("vibration", "Vibration Velocity RMS", "mm/s", f"{equipment_id}_equipment_condition.xlsx"),
        ("harmonic_2x", "2X Rotational Harmonic", "mm/s", f"{equipment_id}_equipment_condition.xlsx"),
        ("coupling_offset", "Coupling Radial Offset", "mm", f"{equipment_id}_equipment_condition.xlsx"),
        ("bearing_temperature", "DE Bearing Temperature", "°C", f"{equipment_id}_equipment_condition.xlsx"),
    ]

    for param_key, param_name, unit, default_source in parameters_to_check:
        curr_val = target_row.get(param_key)
        prev_val = reference_prev.get(param_key)
        base_val = float(np.nanmean(baseline_df[param_key])) if (param_key in baseline_df.columns and not baseline_df.empty) else curr_val

        if curr_val is None or (isinstance(curr_val, float) and np.isnan(curr_val)):
            continue

        curr_val = float(curr_val)
        prev_val = float(prev_val) if (prev_val is not None and not np.isnan(float(prev_val))) else curr_val
        base_val = float(base_val) if (base_val is not None and not np.isnan(float(base_val))) else curr_val
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
            "parameter": str(param_name),
            "parameter_key": str(param_key),
            "observed_value": float(round(curr_val, 3)),
            "previous_value": float(round(prev_val, 3)),
            "baseline_value": float(round(base_val, 3)),
            "change": float(change),
            "unit": str(unit),
            "threshold": str(threshold_str),
            "severity": str(highest_rule["severity"] if highest_rule else "NORMAL"),
            "source": str(source_str),
            "timestamp": str(target_ts),
            "record_id": str(target_row.get("id") or ""),
            "week_number": target_wk,
            "temporal_context": str(temporal_label),
            "interpretation": str(interpretation),
        })
        item_counter += 1

    return evidence_items


def compute_what_changed(records: List[Dict[str, Any]], equipment_id: str) -> Dict[str, Any]:
    """
    Computes comparative "What Changed?" analysis across Baseline vs Critical vs Current observations.
    Strictly compares the verified Critical observation against Baseline healthy period,
    while also reporting Current operational state.
    """
    if not records:
        return {"comparison": [], "summary": "No data available"}

    df = compute_features(records)
    if df.empty:
        return {"comparison": [], "summary": "No data available"}

    baseline_df, critical_row, _prev_row, current_row = _extract_contexts(df)

    b_start_wk = baseline_df.iloc[0].get("week_number") if not baseline_df.empty else 1
    b_end_wk = baseline_df.iloc[-1].get("week_number") if not baseline_df.empty else len(baseline_df)
    b_start_ts = str(baseline_df.iloc[0].get("timestamp") or "")[:10]
    b_end_ts = str(baseline_df.iloc[-1].get("timestamp") or "")[:10]
    baseline_period = f"Week {b_start_wk} - Week {b_end_wk} ({b_start_ts} to {b_end_ts})"

    crit_wk = critical_row.get("week_number") or ""
    crit_ts = str(critical_row.get("timestamp") or "")[:10]
    critical_period = f"Week {crit_wk} ({crit_ts})"

    curr_wk = current_row.get("week_number") or ""
    curr_ts = str(current_row.get("timestamp") or "")[:10]
    current_period = f"Week {curr_wk} ({curr_ts})"

    baseline_source_records = [str(r.get("id")) for _, r in baseline_df.iterrows() if r.get("id")]
    critical_source_record_id = str(critical_row.get("id") or "")
    current_source_record_id = str(current_row.get("id") or "")

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
        crit_val = critical_row.get(param_key)
        curr_val = current_row.get(param_key)
        base_val = float(np.nanmean(baseline_df[param_key])) if (param_key in baseline_df.columns and not baseline_df.empty) else crit_val

        if crit_val is None or (isinstance(crit_val, float) and np.isnan(crit_val)):
            continue

        crit_val = float(crit_val)
        curr_val = float(curr_val) if (curr_val is not None and not np.isnan(float(curr_val))) else crit_val
        base_val = float(base_val) if (base_val is not None and not np.isnan(float(base_val))) else crit_val

        abs_change = round(crit_val - base_val, 3)
        pct_change = round(((crit_val - base_val) / base_val * 100), 1) if base_val != 0 else 0.0

        direction = "Increasing" if abs_change > 0.05 else ("Decreasing" if abs_change < -0.05 else "Stable")

        # Evaluate rules against critical value
        trig = default_rule_engine.evaluate_parameter(equipment_id, param_key, crit_val)
        crit_status = trig[0]["severity"] if trig else str(critical_row.get("status") or "NORMAL").upper()

        if crit_status in ("ALARM", "CRITICAL", "TRIP"):
            trend_desc = f"Surged to {crit_status} threshold"
            notable_changes.append(f"{param_name} surged from baseline {base_val:.2f} {unit} to critical {crit_val:.2f} {unit} ({crit_status})")
        else:
            trend_desc = direction

        comparison.append({
            "parameter": str(param_name),
            "parameter_key": str(param_key),
            "unit": str(unit),
            "baseline_value": float(round(base_val, 3)),
            "critical_value": float(round(crit_val, 3)),
            "current_value": float(round(crit_val, 3)),  # Represents the investigated condition value
            "latest_value": float(round(curr_val, 3)),   # Post-maintenance current reading
            "absolute_change": float(abs_change),
            "percentage_change": float(pct_change),
            "delta_from_baseline": float(abs_change),
            "direction": str(direction),
            "trend": str(trend_desc),
            "status": str(crit_status),
        })

    crit_status_overall = str(critical_row.get("status") or "NORMAL").upper()
    summary = (
        f"Significant degradation detected at {critical_period}: {'; '.join(notable_changes)}. "
        f"Overall equipment status reached {crit_status_overall}."
        if notable_changes else "All parameters operating within nominal baseline parameters."
    )

    slopes = {
        "vibration_slope_3pt": _clean_val(critical_row.get("vibration_slope")),
        "vibration_slope_4w": _clean_val(critical_row.get("vibration_slope_4w")),
        "vibration_slope_8w": _clean_val(critical_row.get("vibration_slope_8w")),
        "vibration_slope_12w": _clean_val(critical_row.get("vibration_slope_12w")),
        "harmonic_ratio_current": _clean_val(critical_row.get("harmonic_ratio")),
    }

    correlations = compute_correlations(records)

    return {
        "equipment_id": equipment_id,
        "baseline_period": baseline_period,
        "critical_period": critical_period,
        "current_period": current_period,
        "baseline_source_records": baseline_source_records,
        "critical_source_record_id": critical_source_record_id,
        "current_source_record_id": current_source_record_id,
        "comparison": comparison,
        "slopes": slopes,
        "correlations": correlations,
        "summary": summary,
    }
