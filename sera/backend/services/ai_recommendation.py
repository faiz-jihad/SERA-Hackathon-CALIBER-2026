"""
SERA AI Recommendation Layer (Ollama-backed)
Uses structured engineering evidence — NOT raw data.
"""
import os
import json
import httpx

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")


def _call_ollama(prompt: str, timeout: int = 3) -> str:
    """Call Ollama local LLM with fast fallback if offline."""
    try:
        resp = httpx.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
            timeout=timeout
        )
        resp.raise_for_status()
        return resp.json().get("response", "").strip()
    except Exception as e:
        return f"[AI layer unavailable: {str(e)}]"


def generate_recommendation(
    equipment_id: str,
    problem_types: list,
    detection_evidence: list,
    rca_result: dict,
    similar_incidents: list,
) -> dict:
    """
    Generate AI-backed corrective and preventive recommendations.
    Input is structured evidence — not raw data.
    """

    # Build structured context for LLM
    problem_summary_text = ", ".join(problem_types) if problem_types else "No specific problem detected"
    evidence_text = "\n".join(f"  - {e}" for e in detection_evidence) or "  - No detection evidence available"
    rca_primary = rca_result.get("primary_root_cause", "Unknown")
    rca_confidence = rca_result.get("confidence_level", "LOW")
    rca_explanation = rca_result.get("explanation", "")
    rca_evidence = "\n".join(f"  - {e}" for e in rca_result.get("evidence", []))

    hist_text = ""
    if similar_incidents:
        hist_text = "\n".join(
            f"  [{i+1}] {inc.get('incident_date', '')}: {inc.get('problem', '')} — "
            f"RCA: {inc.get('root_cause', '')} — "
            f"Corrective: {inc.get('corrective_action', '')} — "
            f"Preventive: {inc.get('preventive_action', '')}"
            for i, inc in enumerate(similar_incidents[:3])
        )
    else:
        hist_text = "  No similar historical incidents found."

    prompt = f"""You are an industrial reliability engineering AI assistant for the SERA system.
Your role is to generate evidence-based maintenance recommendations.
You must NOT invent actions unsupported by the evidence.
If evidence is insufficient, state: "Insufficient evidence for a reliable recommendation."

EQUIPMENT: {equipment_id}

DETECTED PROBLEMS:
{problem_summary_text}

DETECTION EVIDENCE:
{evidence_text}

ROOT CAUSE ANALYSIS:
  Primary Root Cause: {rca_primary}
  Confidence: {rca_confidence}
  Explanation: {rca_explanation}

RCA SUPPORTING EVIDENCE:
{rca_evidence or "  None"}

HISTORICAL SIMILAR INCIDENTS:
{hist_text}

Based on the above structured engineering evidence:

1. Write a brief PROBLEM SUMMARY (2-3 sentences, factual).
2. Write a CORRECTIVE ACTION recommendation (immediate actions to address the current problem).
3. Write a PREVENTIVE ACTION recommendation (actions to prevent recurrence).
4. State the EVIDENCE STRENGTH: LOW / MEDIUM / HIGH.

Format your response as JSON with these exact keys:
{{
  "problem_summary": "...",
  "corrective_action": "...",
  "preventive_action": "...",
  "evidence_strength": "LOW|MEDIUM|HIGH",
  "notes": "any caveats or limitations"
}}

Only output valid JSON. No extra text.
"""

    raw_response = _call_ollama(prompt)

    # Try to parse JSON
    try:
        # Extract JSON from response
        start = raw_response.find("{")
        end = raw_response.rfind("}") + 1
        if start >= 0 and end > start:
            result = json.loads(raw_response[start:end])
        else:
            raise ValueError("No JSON found")
    except Exception:
        # Fallback: use rule-based recommendation
        result = _fallback_recommendation(rca_primary, similar_incidents, problem_types)

    result["ai_model"] = OLLAMA_MODEL
    result["source"] = "ollama" if "[AI layer unavailable" not in raw_response else "rule_based"

    return result


def _fallback_recommendation(
    primary_root_cause: str,
    similar_incidents: list,
    problem_types: list
) -> dict:
    """
    Rule-based fallback when LLM is unavailable.
    Uses historical incident data directly.
    """
    corrective = ""
    preventive = ""
    evidence_strength = "LOW"

    # Use most common corrective/preventive actions from similar incidents
    if similar_incidents:
        correctives = [inc.get("corrective_action", "") for inc in similar_incidents if inc.get("corrective_action")]
        preventives = [inc.get("preventive_action", "") for inc in similar_incidents if inc.get("preventive_action")]

        if correctives:
            corrective = correctives[0]  # Most relevant (first is highest scored)
            evidence_strength = "MEDIUM"
        if preventives:
            preventive = preventives[0]

    # Rule-based defaults based on root cause
    rc_lower = primary_root_cause.lower()
    if not corrective:
        if "misalign" in rc_lower:
            corrective = "Stop equipment and perform precision shaft alignment using laser alignment tool. Inspect coupling for wear and replace if necessary."
        elif "bearing" in rc_lower or "lubrication" in rc_lower:
            corrective = "Check bearing lubrication level and condition. Add or replace lubricant as required. Monitor bearing temperature after lubrication."
        elif "looseness" in rc_lower:
            corrective = "Inspect and tighten all foundation bolts and bearing housing bolts to specified torque. Check for structural cracks."
        elif "unbalance" in rc_lower:
            corrective = "Perform dynamic balancing of rotating assembly. Inspect for material buildup or missing balance weights."
        else:
            corrective = "Conduct visual inspection and vibration analysis. Consult maintenance engineering for further investigation."

    if not preventive:
        if "misalign" in rc_lower:
            preventive = "Implement periodic laser alignment checks (quarterly or after major maintenance). Train operators on alignment verification procedures."
        elif "bearing" in rc_lower or "lubrication" in rc_lower:
            preventive = "Establish lubrication schedule per manufacturer specification. Implement bearing temperature monitoring with alarm setpoints."
        elif "looseness" in rc_lower:
            preventive = "Include foundation bolt torque verification in periodic maintenance schedule. Implement routine vibration trending."
        elif "unbalance" in rc_lower:
            preventive = "Perform vibration baseline measurement after maintenance. Schedule periodic balance checks during planned shutdowns."
        else:
            preventive = "Implement vibration monitoring program with defined alarm and trip thresholds. Review maintenance history for recurring patterns."

    problem_summary = (
        f"Equipment has exhibited {', '.join(problem_types) if problem_types else 'abnormal condition'}. "
        f"Based on engineering analysis, the most probable root cause is {primary_root_cause}. "
        f"Immediate intervention is recommended to prevent equipment failure."
    )

    return {
        "problem_summary": problem_summary,
        "corrective_action": corrective,
        "preventive_action": preventive,
        "evidence_strength": evidence_strength,
        "notes": "Recommendation generated using rule-based engine (LLM unavailable or insufficient evidence).",
    }
