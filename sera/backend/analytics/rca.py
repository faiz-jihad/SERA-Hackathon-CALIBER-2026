"""
SERA Root Cause Analysis Engine
Combines: current pattern + engineering rules + historical incidents
"""
from typing import List, Optional
import re


# ─────────────────────────────────────────────────────────
# Engineering RCA Knowledge Base
# Maps symptom patterns → probable root causes
# ─────────────────────────────────────────────────────────
RCA_RULES = [
    {
        "root_cause": "Coupling Misalignment",
        "category": "MECHANICAL",
        "match_problems": ["High Vibration", "Coupling Misalignment", "Abnormal 2X Harmonic"],
        "required_indicators": {
            "coupling_offset": (">=", 0.05),
            "harmonic_2x": (">=", 3.0),
        },
        "supporting_indicators": {
            "vibration": (">=", 7.1),
        },
        "explanation": (
            "High 2X harmonic combined with elevated coupling offset is a classic signature "
            "of coupling misalignment. Misalignment causes twice-per-revolution forcing, "
            "resulting in elevated 2X frequency components and coupling wear."
        ),
        "confidence": "HIGH",
    },
    {
        "root_cause": "Bearing Wear / Deterioration",
        "category": "MECHANICAL",
        "match_problems": ["Bearing Overtemperature", "High Vibration"],
        "required_indicators": {
            "bearing_temperature": (">=", 85.0),
        },
        "supporting_indicators": {
            "vibration": (">=", 7.1),
        },
        "explanation": (
            "Elevated bearing temperature combined with increased vibration indicates "
            "bearing deterioration. This may be caused by lubrication failure, "
            "contamination, or mechanical overload."
        ),
        "confidence": "MEDIUM",
    },
    {
        "root_cause": "Mechanical Looseness",
        "category": "MECHANICAL",
        "match_problems": ["Abnormal 2X Harmonic", "High Vibration"],
        "required_indicators": {
            "harmonic_2x": (">=", 5.0),
        },
        "supporting_indicators": {
            "vibration": (">=", 11.0),
        },
        "explanation": (
            "High 2X harmonic without significant coupling offset may indicate "
            "mechanical looseness in foundation bolts, bearing housing, or rotating components."
        ),
        "confidence": "MEDIUM",
    },
    {
        "root_cause": "Unbalance",
        "category": "MECHANICAL",
        "match_problems": ["High Vibration"],
        "required_indicators": {
            "vibration": (">=", 11.0),
        },
        "supporting_indicators": {},
        "explanation": (
            "Elevated overall vibration without significant harmonic components "
            "may indicate rotor unbalance. Unbalance produces 1X (synchronous) "
            "frequency components and increases with rotational speed."
        ),
        "confidence": "LOW",
    },
    {
        "root_cause": "Lubrication Deficiency",
        "category": "MECHANICAL",
        "match_problems": ["Bearing Overtemperature"],
        "required_indicators": {
            "bearing_temperature": (">=", 75.0),
        },
        "supporting_indicators": {},
        "explanation": (
            "Bearing overtemperature without concurrent vibration increase may suggest "
            "lubrication deficiency (low oil/grease level or degraded lubricant)."
        ),
        "confidence": "LOW",
    },
]


def run_rca(
    problem_types: List[str],
    parameters: dict,
    historical_incidents: List[dict]
) -> dict:
    """
    Run Root Cause Analysis.

    Args:
        problem_types: List of detected problem types
        parameters: Dict of current parameter values
        historical_incidents: List of similar past incidents

    Returns:
        RCA result dict
    """
    candidates = []

    for rule in RCA_RULES:
        # Check if this rule applies to any detected problem
        if not any(p in rule["match_problems"] for p in problem_types):
            continue

        score = 0
        evidence = []

        # Check required indicators
        required_met = True
        for param, (op, threshold) in rule["required_indicators"].items():
            val = parameters.get(param)
            if val is None:
                continue
            try:
                val = float(val)
            except (TypeError, ValueError):
                continue
            if _compare(val, op, threshold):
                score += 2
                evidence.append(f"{param} = {val:.3f} (threshold {op} {threshold}) ✓")
            else:
                required_met = False

        if not required_met:
            score = max(0, score - 1)

        # Check supporting indicators
        for param, (op, threshold) in rule["supporting_indicators"].items():
            val = parameters.get(param)
            if val is None:
                continue
            try:
                val = float(val)
            except (TypeError, ValueError):
                continue
            if _compare(val, op, threshold):
                score += 1
                evidence.append(f"{param} = {val:.3f} supports this RCA ✓")

        # Check historical match
        hist_match_count = 0
        for incident in historical_incidents:
            rc = str(incident.get("root_cause", "")).lower()
            if any(kw in rc for kw in rule["root_cause"].lower().split()):
                hist_match_count += 1
                score += 1

        if hist_match_count > 0:
            evidence.append(f"Historical incidents with same root cause: {hist_match_count}")

        if score > 0:
            candidates.append({
                "root_cause": rule["root_cause"],
                "category": rule["category"],
                "score": score,
                "confidence": rule["confidence"] if required_met else "LOW",
                "explanation": rule["explanation"],
                "evidence": evidence,
                "historical_match_count": hist_match_count,
            })

    # Sort by score
    candidates.sort(key=lambda x: x["score"], reverse=True)

    primary = candidates[0] if candidates else {
        "root_cause": "Insufficient evidence for root cause determination",
        "category": "UNKNOWN",
        "confidence": "LOW",
        "explanation": "The available data does not match known failure patterns. Manual investigation required.",
        "evidence": [],
        "score": 0,
        "historical_match_count": 0,
    }

    return {
        "primary_root_cause": primary["root_cause"],
        "confidence_level": primary["confidence"],
        "explanation": primary["explanation"],
        "evidence": primary["evidence"],
        "all_candidates": candidates,
        "historical_match_count": primary.get("historical_match_count", 0),
    }


def find_similar_incidents(
    problem_types: List[str],
    equipment_id: str,
    all_incidents: List[dict],
    max_results: int = 5
) -> List[dict]:
    """
    Find historical incidents similar to detected problems.
    Matching strategy:
    1. Same equipment_id (highest priority)
    2. Same problem keyword
    """
    scored = []

    for incident in all_incidents:
        score = 0
        inc_problem = str(incident.get("problem", "")).lower()
        inc_equip = str(incident.get("equipment_id", "")).upper()

        # Same equipment
        if inc_equip == equipment_id.upper():
            score += 3

        # Problem type match
        for pt in problem_types:
            pt_lower = pt.lower()
            keywords = pt_lower.split()
            for kw in keywords:
                if len(kw) > 3 and kw in inc_problem:
                    score += 2
                    break

        # Partial keyword match in root cause
        inc_rc = str(incident.get("root_cause", "")).lower()
        for pt in problem_types:
            for kw in pt.lower().split():
                if len(kw) > 3 and kw in inc_rc:
                    score += 1
                    break

        if score > 0:
            scored.append((score, incident))

    scored.sort(key=lambda x: x[0], reverse=True)
    results = []
    for _, inc in scored[:max_results]:
        clean_inc = dict(inc)
        if "incident_date" in clean_inc and clean_inc["incident_date"] is not None:
            clean_inc["incident_date"] = str(clean_inc["incident_date"])
        results.append(clean_inc)
    return results


def _compare(val, op, threshold) -> bool:
    if op == ">=":
        return val >= threshold
    if op == "<=":
        return val <= threshold
    if op == ">":
        return val > threshold
    if op == "<":
        return val < threshold
    return False
