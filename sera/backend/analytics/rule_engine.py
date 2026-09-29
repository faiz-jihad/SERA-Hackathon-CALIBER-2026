"""
SERA Deterministic Rule Engine & Traceability Layer
Complies with CALIBER 2026 Case 2 System Specification (Sections 5, 6, 7, 8, 9, 30)

Rule Source Priority:
1. PLANT_LIMIT: Plant / OEM Limit
2. SUPPORTING_DATA: Supporting Data Equipment Limit
3. ENGINEERING_STANDARD: Applicable Engineering Standard
4. DATA_DRIVEN: Data-driven Detection / Slope
5. PROJECT_ASSUMPTION: Clearly Documented Project Assumption

Zero Hallucination:
Every threshold has an explicit source_reference and rationale.
"""
from typing import List, Dict, Any, Optional
from datetime import datetime
import operator

# Rule Source Priority constants
SOURCE_PRIORITY = {
    "PLANT_LIMIT": 1,
    "SUPPORTING_DATA": 2,
    "ENGINEERING_STANDARD": 3,
    "DATA_DRIVEN": 4,
    "PROJECT_ASSUMPTION": 5,
}

OPERATORS = {
    ">": operator.gt,
    ">=": operator.ge,
    "<": operator.lt,
    "<=": operator.le,
    "==": operator.eq,
}

# Standard Reference Disclaimer (Section 7)
ISO_DISCLAIMER = (
    "Standard reference available, but equipment-specific classification "
    "is required for definitive severity assessment."
)

# ─────────────────────────────────────────────────────────────────
# Seed Rules Definition with Complete Provenance & Metadata
# ─────────────────────────────────────────────────────────────────
SEED_RULES: List[Dict[str, Any]] = [
    # ── BL-5702 Specific Rules (Supporting Data) ──
    {
        "rule_id": "BL5702_VIB_ALARM",
        "equipment_id": "BL-5702",
        "equipment_class": "Centrifugal Blower",
        "parameter": "vibration",
        "condition": ">=",
        "threshold": 8.50,
        "unit": "mm/s",
        "severity": "ALARM",
        "source_type": "SUPPORTING_DATA",
        "source_reference": "BL-5702_equipment_condition.xlsx (Week 17)",
        "rationale": "Provided alarm threshold for vibration in equipment performance dataset",
        "active": True,
    },
    {
        "rule_id": "BL5702_VIB_TRIP",
        "equipment_id": "BL-5702",
        "equipment_class": "Centrifugal Blower",
        "parameter": "vibration",
        "condition": ">=",
        "threshold": 11.00,
        "unit": "mm/s",
        "severity": "TRIP",
        "source_type": "SUPPORTING_DATA",
        "source_reference": "BL-5702_equipment_condition.xlsx (Week 21)",
        "rationale": "Emergency vibration interlock trip threshold in supporting data",
        "active": True,
    },
    {
        "rule_id": "BL5702_COUPLING_OFFSET_WARN",
        "equipment_id": "BL-5702",
        "equipment_class": "Centrifugal Blower",
        "parameter": "coupling_offset",
        "condition": ">=",
        "threshold": 0.05,
        "unit": "mm",
        "severity": "WARNING",
        "source_type": "SUPPORTING_DATA",
        "source_reference": "BL-5702_equipment_condition.xlsx",
        "rationale": "Initial radial offset warning indicating incipient shaft misalignment",
        "active": True,
    },
    {
        "rule_id": "BL5702_COUPLING_OFFSET_ALARM",
        "equipment_id": "BL-5702",
        "equipment_class": "Centrifugal Blower",
        "parameter": "coupling_offset",
        "condition": ">=",
        "threshold": 0.10,
        "unit": "mm",
        "severity": "ALARM",
        "source_type": "SUPPORTING_DATA",
        "source_reference": "BL-5702_equipment_condition.xlsx (Week 18)",
        "rationale": "Coupling radial offset alarm threshold in equipment performance records",
        "active": True,
    },
    {
        "rule_id": "BL5702_COUPLING_OFFSET_TRIP",
        "equipment_id": "BL-5702",
        "equipment_class": "Centrifugal Blower",
        "parameter": "coupling_offset",
        "condition": ">=",
        "threshold": 0.15,
        "unit": "mm",
        "severity": "TRIP",
        "source_type": "SUPPORTING_DATA",
        "source_reference": "BL-5702_equipment_condition.xlsx (Week 21)",
        "rationale": "Severe coupling offset threshold resulting in flexible insert failure and trip",
        "active": True,
    },
    {
        "rule_id": "BL5702_2X_HARMONIC_ALARM",
        "equipment_id": "BL-5702",
        "equipment_class": "Centrifugal Blower",
        "parameter": "harmonic_2x",
        "condition": ">=",
        "threshold": 5.0,
        "unit": "mm/s",
        "severity": "ALARM",
        "source_type": "SUPPORTING_DATA",
        "source_reference": "BL-5702_equipment_condition.xlsx (Week 18)",
        "rationale": "2X harmonic amplitude exceeding 50% of 1X component indicating severe coupling misalignment",
        "active": True,
    },
    {
        "rule_id": "BL5702_BEARING_TEMP_ALARM",
        "equipment_id": "BL-5702",
        "equipment_class": "Centrifugal Blower",
        "parameter": "bearing_temperature",
        "condition": ">=",
        "threshold": 85.0,
        "unit": "°C",
        "severity": "ALARM",
        "source_type": "SUPPORTING_DATA",
        "source_reference": "BL-5702_equipment_condition.xlsx (Week 19)",
        "rationale": "Bearing operating temperature alarm threshold",
        "active": True,
    },
    {
        "rule_id": "BL5702_BEARING_TEMP_TRIP",
        "equipment_id": "BL-5702",
        "equipment_class": "Centrifugal Blower",
        "parameter": "bearing_temperature",
        "condition": ">=",
        "threshold": 93.0,
        "unit": "°C",
        "severity": "TRIP",
        "source_type": "SUPPORTING_DATA",
        "source_reference": "BL-5702_equipment_condition.xlsx (Week 21)",
        "rationale": "High temperature thermal surge threshold under extreme coupling offset load",
        "active": True,
    },

    # ── Plant Fleet Class Limits (Supporting Data / Engineering Standard) ──
    {
        "rule_id": "FLEET_PUMP_COUPLING_WARN",
        "equipment_id": None,
        "equipment_class": "Process Pump",
        "parameter": "coupling_offset",
        "condition": ">=",
        "threshold": 0.045,
        "unit": "mm",
        "severity": "WARNING",
        "source_type": "SUPPORTING_DATA",
        "source_reference": "plant_equipment_fleet.xlsx (PU-2101B)",
        "rationale": "Process pump alignment tolerance warning threshold",
        "active": True,
    },
    {
        "rule_id": "FLEET_ROTATING_VIB_WARN",
        "equipment_id": None,
        "equipment_class": "Rotating Machinery",
        "parameter": "vibration",
        "condition": ">=",
        "threshold": 7.10,
        "unit": "mm/s",
        "severity": "WARNING",
        "source_type": "ENGINEERING_STANDARD",
        "source_reference": "ISO 20816 / ISO 10816-3 Class II Guideline",
        "rationale": f"Vibration velocity warning boundary for medium industrial rotating machines. Note: {ISO_DISCLAIMER}",
        "active": True,
    },

    # ── Data-Driven Detection Rules (Section 8) ──
    {
        "rule_id": "DATA_DRIVEN_VIB_SLOPE_ALARM",
        "equipment_id": None,
        "equipment_class": None,
        "parameter": "vibration_slope",
        "condition": ">",
        "threshold": 0.50,
        "unit": "mm/s/period",
        "severity": "ALARM",
        "source_type": "DATA_DRIVEN",
        "source_reference": "Vibration Velocity Trend Derivative",
        "rationale": "Multi-period trend acceleration detected (slope > +0.50 mm/s per inspection interval)",
        "active": True,
    },
    {
        "rule_id": "DATA_DRIVEN_CONSECUTIVE_ALARMS",
        "equipment_id": None,
        "equipment_class": None,
        "parameter": "consecutive_alarm_count",
        "condition": ">=",
        "threshold": 2.0,
        "unit": "cycles",
        "severity": "CRITICAL",
        "source_type": "DATA_DRIVEN",
        "source_reference": "Alarm Persistence Analysis",
        "rationale": "Sustained abnormal condition across 2 or more consecutive observation cycles",
        "active": True,
    },
]


class RuleEngine:
    """
    Deterministic rule engine that evaluates equipment condition parameters
    against prioritized rules and provides complete provenance traceability.
    """

    def __init__(self, custom_rules: Optional[List[Dict[str, Any]]] = None):
        self.rules = custom_rules if custom_rules is not None else SEED_RULES

    def evaluate_parameter(
        self,
        equipment_id: str,
        parameter: str,
        value: float,
        equipment_class: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Evaluate a single parameter against all matching active rules.
        Returns triggered rules sorted by source priority and severity.
        """
        if value is None:
            return []

        triggered = []
        for rule in self.rules:
            if not rule.get("active", True):
                continue
            if rule["parameter"] != parameter:
                continue

            # Check equipment scope match
            rule_eq = rule.get("equipment_id")
            rule_cls = rule.get("equipment_class")

            if rule_eq and rule_eq != equipment_id:
                continue
            if not rule_eq and rule_cls and equipment_class and rule_cls != equipment_class:
                continue

            # Check condition
            op_func = OPERATORS.get(rule["condition"])
            if op_func and op_func(value, rule["threshold"]):
                triggered.append({
                    "rule_id": rule["rule_id"],
                    "equipment_id": equipment_id,
                    "parameter": parameter,
                    "observed_value": value,
                    "condition": rule["condition"],
                    "threshold": rule["threshold"],
                    "unit": rule.get("unit", ""),
                    "severity": rule["severity"],
                    "source_type": rule["source_type"],
                    "source_reference": rule["source_reference"],
                    "rationale": rule["rationale"],
                    "priority": SOURCE_PRIORITY.get(rule["source_type"], 99),
                })

        # Sort by Source Priority (1=Plant Limit, 2=Supporting Data, etc.) then by severity
        severity_rank = {"TRIP": 1, "CRITICAL": 2, "ALARM": 3, "WARNING": 4, "NORMAL": 5}
        triggered.sort(key=lambda r: (r["priority"], severity_rank.get(r["severity"], 99)))
        return triggered

    def evaluate_condition_record(
        self,
        equipment_id: str,
        condition_data: Dict[str, Any],
        equipment_class: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Evaluate full condition record (vibration, harmonics, offset, temp, trends).
        Returns overall status, list of triggered rules, and explainable reasons.
        """
        all_triggered: List[Dict[str, Any]] = []

        for param, val in condition_data.items():
            if val is not None and isinstance(val, (int, float)):
                trig = self.evaluate_parameter(equipment_id, param, float(val), equipment_class)
                all_triggered.extend(trig)

        # Determine overall status
        status = "NORMAL"
        severity_set = {r["severity"] for r in all_triggered}
        if "TRIP" in severity_set:
            status = "TRIP"
        elif "CRITICAL" in severity_set:
            status = "CRITICAL"
        elif "ALARM" in severity_set:
            status = "ALARM"
        elif "WARNING" in severity_set:
            status = "WARNING"

        # Generate explainable reasons with rule traceability
        reasons = []
        for r in all_triggered:
            source_label = (
                "Supporting Data Threshold"
                if r["source_type"] == "SUPPORTING_DATA"
                else ("Plant Limit" if r["source_type"] == "PLANT_LIMIT" else r["source_type"].replace("_", " ").title())
            )
            reasons.append(
                f"[{r['severity']}] {r['parameter'].replace('_', ' ').title()} = {r['observed_value']} {r['unit']} "
                f"(Threshold: {r['condition']} {r['threshold']} {r['unit']}) • Source: {source_label} ({r['source_reference']})"
            )

        return {
            "equipment_id": equipment_id,
            "status": status,
            "rules_triggered_count": len(all_triggered),
            "rules_triggered": all_triggered,
            "reasons": reasons,
            "evaluated_at": datetime.utcnow().isoformat(),
        }


# Global instance
default_rule_engine = RuleEngine()
