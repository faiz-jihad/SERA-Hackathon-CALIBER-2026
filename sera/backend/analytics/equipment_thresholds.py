"""
SERA Equipment-Specific Threshold Registry
Source: Equipment Info sheets from Case 2 XLSX files (verified)

Each equipment has unique monitored parameters with different:
- Column mappings (what physical quantity is measured)
- Units (mm/s vs micron vs bar vs °C vs %)
- Threshold types (high-alarm vs low-alarm)
- Alarm and trip values

DO NOT use generic thresholds across all equipment.
DO NOT invent threshold values.
"""
from typing import Dict, Any, Optional, List

# ─────────────────────────────────────────────────────────────────────────────
# Source: Equipment Info sheet, Columns 3-4, Rows 5-8 in each Equipment
# Performance XLSX file. All values verified from actual Case 2 files.
# ─────────────────────────────────────────────────────────────────────────────

EQUIPMENT_PARAMETERS: Dict[str, Dict[str, Any]] = {

    # ── BL-5702: Product Blower, Centrifugal Blower, OPP ──────────────────
    # Source: Equipment Performance - RCA5 BL-5702.xlsx, Equipment Info sheet
    # AR: AR-2026-OPP-0203, Failure Date: 2026-06-17
    "BL-5702": {
        "name": "Product Blower BL-5702",
        "equipment_type": "Centrifugal Blower",
        "plant": "OPP",
        "location": "Polymer Plant (OPP)",
        "discipline": "ROT",
        "criticality": "High",
        "equipment_class": "A",
        "ar_number": "AR-2026-OPP-0203",
        "failure_date": "2026-06-17",
        "dominant_failure_mode": "High Vibration (Coupling Misalignment)",
        "parameters": {
            "vibration": {
                "label": "Overall Vibration",
                "column_raw": "Overall Vibration (mm/s)",
                "db_field": "vibration",
                "unit": "mm/s",
                "alarm": 7.0,
                "trip": 11.0,
                "direction": "high",   # > alarm → alarm, > trip → trip
                "source": "Equipment Info R5, BL-5702 xlsx",
            },
            "harmonic_2x": {
                "label": "2X Harmonic",
                "column_raw": "2X Harmonic (mm/s)",
                "db_field": "harmonic_2x",
                "unit": "mm/s",
                "alarm": 3.0,
                "trip": 5.0,
                "direction": "high",
                "source": "Equipment Info R6, BL-5702 xlsx",
            },
            "coupling_offset": {
                "label": "Coupling Offset",
                "column_raw": "Coupling Offset (mm)",
                "db_field": "coupling_offset",
                "unit": "mm",
                "alarm": 0.05,
                "trip": 0.30,
                "direction": "high",
                "source": "Equipment Info R7, BL-5702 xlsx",
            },
            "bearing_temperature": {
                "label": "Bearing Temperature",
                "column_raw": "Bearing Temp (°C)",
                "db_field": "bearing_temperature",
                "unit": "°C",
                "alarm": 80.0,
                "trip": 95.0,
                "direction": "high",
                "source": "Equipment Info R8, BL-5702 xlsx",
            },
        },
        "performance_kpis": {
            "downtime_hours": 14.0,
            "availability_pct": 99.68,
            "alarm_weeks": 15,
            "trip_weeks": 1,
            "production_loss_ton": 532,
            "estimated_loss_kusd": 478.8,
        },
    },

    # ── PU-2101B: Feed Charge Pump, Centrifugal Pump, ARP ─────────────────
    # Source: Equipment Performance - RCA1 PU-2101B.xlsx, Equipment Info sheet
    # AR: AR-2026-ARP-0117, Failure Date: 2026-03-12
    "PU-2101B": {
        "name": "Feed Charge Pump PU-2101B",
        "equipment_type": "Centrifugal Pump",
        "plant": "ARP",
        "location": "Aromatics Plant (ARP)",
        "discipline": "ROT",
        "criticality": "Medium",
        "equipment_class": "B",
        "ar_number": "AR-2026-ARP-0117",
        "failure_date": "2026-03-12",
        "dominant_failure_mode": "Mechanical Seal Leakage",
        "parameters": {
            "vibration": {
                "label": "Overall Vibration",
                "column_raw": "Overall Vibration (mm/s)",
                "db_field": "vibration",
                "unit": "mm/s",
                "alarm": 7.0,
                "trip": 11.0,
                "direction": "high",
                "source": "Equipment Info R5, PU-2101B xlsx",
            },
            "seal_flush_flow": {
                "label": "Seal Flush Flow",
                "column_raw": "Seal Flush Flow (L/min)",
                "db_field": "raw_data.seal_flush_flow",
                "unit": "L/min",
                "alarm": 5.0,   # minimum — low alarm
                "trip": 4.0,    # minimum — low trip
                "direction": "low",  # < alarm → alarm, < trip → trip
                "source": "Equipment Info R6, PU-2101B xlsx",
            },
            "discharge_pressure": {
                "label": "Discharge Pressure",
                "column_raw": "Discharge Pressure (barg)",
                "db_field": "raw_data.discharge_pressure",
                "unit": "barg",
                "alarm": 8.5,   # minimum
                "trip": 7.5,    # minimum
                "direction": "low",
                "source": "Equipment Info R7, PU-2101B xlsx",
            },
            "bearing_temperature": {
                "label": "Bearing Temperature",
                "column_raw": "Bearing Temp (°C)",
                "db_field": "bearing_temperature",
                "unit": "°C",
                "alarm": 80.0,
                "trip": 95.0,
                "direction": "high",
                "source": "Equipment Info R8, PU-2101B xlsx",
            },
        },
        "performance_kpis": {
            "downtime_hours": 18.5,
            "availability_pct": 99.58,
            "alarm_weeks": 6,
            "trip_weeks": 1,
            "production_loss_ton": 251.6,
            "estimated_loss_kusd": 226.44,
        },
    },

    # ── KO-3201: Cracked Gas Compressor, Centrifugal Compressor, ZCU ──────
    # Source: Equipment Performance - RCA2 KO-3201.xlsx, Equipment Info sheet
    # AR: AR-2026-ZCU-0142, Failure Date: 2026-04-29
    "KO-3201": {
        "name": "Cracked Gas Compressor KO-3201",
        "equipment_type": "Centrifugal Compressor",
        "plant": "ZCU",
        "location": "Cracker Unit (ZCU)",
        "discipline": "ROT",
        "criticality": "High",
        "equipment_class": "A",
        "ar_number": "AR-2026-ZCU-0142",
        "failure_date": "2026-04-29",
        "dominant_failure_mode": "High Radial Vibration Trip (Bearing Distress)",
        "parameters": {
            "radial_vibration": {
                "label": "DE Radial Vibration",
                "column_raw": "DE Radial Vibration (micron)",
                "db_field": "radial_vibration",    # stored in radial_vibration column
                "unit": "micron",
                "alarm": 45.0,
                "trip": 75.0,
                "direction": "high",
                "source": "Equipment Info R5, KO-3201 xlsx",
            },
            "lube_oil_water": {
                "label": "Lube Oil Water Content",
                "column_raw": "Lube Oil Water Content (ppm)",
                "db_field": "raw_data.lube_oil_water",
                "unit": "ppm",
                "alarm": 500.0,
                "trip": 1500.0,
                "direction": "high",
                "source": "Equipment Info R6, KO-3201 xlsx",
            },
            "lube_oil_supply_press": {
                "label": "Lube Oil Supply Pressure",
                "column_raw": "Lube Oil Supply Press (barg)",
                "db_field": "raw_data.lube_oil_supply_press",
                "unit": "barg",
                "alarm": 1.4,   # minimum — low alarm
                "trip": 1.1,    # minimum — low trip
                "direction": "low",
                "source": "Equipment Info R7, KO-3201 xlsx",
            },
            "bearing_temperature": {
                "label": "Bearing Metal Temperature",
                "column_raw": "Bearing Metal Temp (°C)",
                "db_field": "bearing_temperature",
                "unit": "°C",
                "alarm": 95.0,
                "trip": 110.0,
                "direction": "high",
                "source": "Equipment Info R8, KO-3201 xlsx",
            },
        },
        "performance_kpis": {
            "downtime_hours": 32.0,
            "availability_pct": 99.27,
            "alarm_weeks": 11,
            "trip_weeks": 1,
            "production_loss_ton": 1760,
            "estimated_loss_kusd": 1584,
        },
    },

    # ── PM-4405B: Cooling Water Pump Motor, NUP ───────────────────────────
    # Source: Equipment Performance - RCA3 PM-4405B.xlsx, Equipment Info sheet
    # AR: AR-2026-NUP-0089, Failure Date: 2026-07-08
    "PM-4405B": {
        "name": "Cooling Water Pump PM-4405B (Motor Drive)",
        "equipment_type": "Centrifugal Pump / Electric Motor",
        "plant": "NUP",
        "location": "Utility Plant (NUP)",
        "discipline": "ELE",
        "criticality": "Medium",
        "equipment_class": "B",
        "ar_number": "AR-2026-NUP-0089",
        "failure_date": "2026-07-08",
        "dominant_failure_mode": "Motor Bearing Failure (Overheating)",
        "parameters": {
            "bearing_temperature": {
                "label": "Motor DE Bearing Temperature",
                "column_raw": "Motor DE Bearing Temp (°C)",
                "db_field": "bearing_temperature",
                "unit": "°C",
                "alarm": 75.0,
                "trip": 90.0,
                "direction": "high",
                "source": "Equipment Info R5, PM-4405B xlsx",
            },
            "vibration": {
                "label": "Motor Vibration",
                "column_raw": "Motor Vibration (mm/s)",
                "db_field": "vibration",
                "unit": "mm/s",
                "alarm": 5.0,
                "trip": 8.0,
                "direction": "high",
                "source": "Equipment Info R6, PM-4405B xlsx",
            },
            "motor_ampere": {
                "label": "Motor Ampere",
                "column_raw": "Motor Ampere (A)",
                "db_field": "raw_data.motor_ampere",
                "unit": "A",
                "alarm": 150.0,
                "trip": 165.0,
                "direction": "high",
                "source": "Equipment Info R7, PM-4405B xlsx",
            },
            "winding_temperature": {
                "label": "Winding Temperature",
                "column_raw": "Winding Temp (°C)",
                "db_field": "raw_data.winding_temperature",
                "unit": "°C",
                "alarm": 120.0,
                "trip": 140.0,
                "direction": "high",
                "source": "Equipment Info R8, PM-4405B xlsx",
            },
        },
        "performance_kpis": {
            "downtime_hours": 8.0,
            "availability_pct": 99.82,
            "alarm_weeks": 6,
            "trip_weeks": 1,
            "production_loss_ton": 160,
            "estimated_loss_kusd": 112,
        },
    },

    # ── HE-3301: Feed/Effluent Heat Exchanger, Shell & Tube, BDX ──────────
    # Source: Equipment Performance - RCA4 HE-3301.xlsx, Equipment Info sheet
    # AR: AR-2026-ZCU-0165, Failure Date: 2026-05-21
    "HE-3301": {
        "name": "Feed/Effluent Heat Exchanger HE-3301",
        "equipment_type": "Shell & Tube Heat Exchanger",
        "plant": "BDX",
        "location": "Butadiene Extraction (BDX)",
        "discipline": "STA",
        "criticality": "Medium",
        "equipment_class": "B",
        "ar_number": "AR-2026-ZCU-0165",
        "failure_date": "2026-05-21",
        "dominant_failure_mode": "High Fouling — Duty Loss & High dP",
        "parameters": {
            "tube_side_dp": {
                "label": "Tube-side Differential Pressure",
                "column_raw": "Tube-side dP (bar)",
                "db_field": "raw_data.tube_side_dp",
                "unit": "bar",
                "alarm": 0.6,
                "trip": 0.9,
                "direction": "high",
                "source": "Equipment Info R5, HE-3301 xlsx",
            },
            "heat_duty_pct": {
                "label": "Heat Duty (% of design)",
                "column_raw": "Heat Duty (% design)",
                "db_field": "raw_data.heat_duty_pct",
                "unit": "% design",
                "alarm": 90.0,  # minimum — low alarm (duty degradation)
                "trip": 70.0,   # minimum — low trip
                "direction": "low",
                "source": "Equipment Info R6, HE-3301 xlsx",
            },
            "cold_outlet_temp": {
                "label": "Cold Outlet Temperature",
                "column_raw": "Cold Outlet Temp (°C)",
                "db_field": "raw_data.cold_outlet_temp",
                "unit": "°C",
                "alarm": 110.0,  # minimum
                "trip": 95.0,    # minimum
                "direction": "low",
                "source": "Equipment Info R7, HE-3301 xlsx",
            },
            "feed_heavy_ends_pct": {
                "label": "Feed Heavy-ends Fraction",
                "column_raw": "Feed Heavy-ends (%)",
                "db_field": "raw_data.feed_heavy_ends_pct",
                "unit": "%",
                "alarm": 1.5,
                "trip": 2.4,
                "direction": "high",
                "source": "Equipment Info R8, HE-3301 xlsx",
            },
        },
        "performance_kpis": {
            "downtime_hours": 12.0,
            "availability_pct": 99.73,
            "alarm_weeks": 10,
            "trip_weeks": 1,
            "production_loss_ton": 216,
            "estimated_loss_kusd": 183.6,
        },
    },
}


# ─────────────────────────────────────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────────────────────────────────────

def get_equipment_config(equipment_id: str) -> Optional[Dict[str, Any]]:
    """Get equipment configuration. Returns None if not found."""
    return EQUIPMENT_PARAMETERS.get(equipment_id)


def get_parameters(equipment_id: str) -> Dict[str, Any]:
    """Get monitored parameters for an equipment. Empty dict if not found."""
    config = get_equipment_config(equipment_id)
    if not config:
        return {}
    return config.get("parameters", {})


def evaluate_parameter(equipment_id: str, param_name: str, value: float) -> Dict[str, Any]:
    """
    Evaluate a single parameter value against equipment-specific thresholds.

    Returns:
        {
            "status": "NORMAL" | "ALARM" | "TRIP",
            "level": "NORMAL" | "ALARM" | "TRIP",
            "value": float,
            "alarm_threshold": float,
            "trip_threshold": float,
            "unit": str,
            "direction": "high" | "low",
            "source": str,
        }
    """
    params = get_parameters(equipment_id)
    if param_name not in params:
        return {
            "status": "UNKNOWN",
            "level": "UNKNOWN",
            "value": value,
            "note": f"Parameter '{param_name}' not defined for {equipment_id}",
        }

    p = params[param_name]
    alarm = p["alarm"]
    trip = p["trip"]
    direction = p.get("direction", "high")

    if direction == "high":
        if value >= trip:
            level = "TRIP"
        elif value >= alarm:
            level = "ALARM"
        else:
            level = "NORMAL"
    else:  # low (min thresholds)
        if value <= trip:
            level = "TRIP"
        elif value <= alarm:
            level = "ALARM"
        else:
            level = "NORMAL"

    return {
        "status": level,
        "level": level,
        "parameter": param_name,
        "label": p["label"],
        "value": value,
        "alarm_threshold": alarm,
        "trip_threshold": trip,
        "unit": p["unit"],
        "direction": direction,
        "source": p["source"],
    }


def evaluate_condition_record(equipment_id: str, condition: Dict[str, Any]) -> Dict[str, Any]:
    """
    Evaluate a full condition record against all equipment-specific parameters.

    Args:
        equipment_id: Equipment ID string
        condition: Dict of parameter values (from equipment_conditions record or raw_data)

    Returns:
        {
            "equipment_id": str,
            "overall_status": "NORMAL" | "ALARM" | "TRIP",
            "evaluations": List[Dict],  # one per parameter
            "triggered": List[Dict],    # parameters in ALARM or TRIP
            "reasons": List[str],       # human-readable explanations
        }
    """
    params = get_parameters(equipment_id)
    if not params:
        return {
            "equipment_id": equipment_id,
            "overall_status": "UNKNOWN",
            "evaluations": [],
            "triggered": [],
            "reasons": [f"No threshold configuration for {equipment_id}"],
        }

    evaluations = []
    triggered = []

    for param_name, p_config in params.items():
        # Resolve value from condition dict — try direct field, then raw_data
        value = condition.get(param_name)
        if value is None and "raw_data" in condition and isinstance(condition["raw_data"], dict):
            raw_key = p_config["db_field"].replace("raw_data.", "")
            value = condition["raw_data"].get(raw_key)

        if value is None:
            continue

        try:
            value = float(value)
        except (TypeError, ValueError):
            continue

        eval_result = evaluate_parameter(equipment_id, param_name, value)
        eval_result["parameter"] = param_name
        evaluations.append(eval_result)

        if eval_result["level"] in ("ALARM", "TRIP"):
            triggered.append(eval_result)

    # Determine overall status
    statuses = [e["level"] for e in evaluations]
    if "TRIP" in statuses:
        overall = "TRIP"
    elif "ALARM" in statuses:
        overall = "ALARM"
    else:
        overall = "NORMAL"

    # Build human-readable reasons
    reasons = []
    for t in triggered:
        direction_str = "exceeds" if t["direction"] == "high" else "below"
        threshold_label = "trip limit" if t["level"] == "TRIP" else "alarm limit"
        reasons.append(
            f"[{t['level']}] {t['label']} = {t['value']:.3g} {t['unit']} "
            f"({direction_str} {threshold_label} {t['trip_threshold'] if t['level'] == 'TRIP' else t['alarm_threshold']} {t['unit']}) "
            f"— Source: {t['source']}"
        )

    return {
        "equipment_id": equipment_id,
        "overall_status": overall,
        "evaluations": evaluations,
        "triggered": triggered,
        "reasons": reasons,
    }


def get_all_equipment_ids() -> List[str]:
    """Return list of all registered equipment IDs."""
    return list(EQUIPMENT_PARAMETERS.keys())


def get_equipment_summary() -> List[Dict[str, Any]]:
    """Return summary of all equipment for overview dashboard."""
    summaries = []
    for eq_id, config in EQUIPMENT_PARAMETERS.items():
        summaries.append({
            "equipment_id": eq_id,
            "name": config["name"],
            "equipment_type": config["equipment_type"],
            "plant": config["plant"],
            "location": config["location"],
            "discipline": config["discipline"],
            "criticality": config["criticality"],
            "equipment_class": config["equipment_class"],
            "ar_number": config["ar_number"],
            "failure_date": config["failure_date"],
            "dominant_failure_mode": config["dominant_failure_mode"],
            "parameters": list(config["parameters"].keys()),
            "kpis": config["performance_kpis"],
        })
    return summaries
