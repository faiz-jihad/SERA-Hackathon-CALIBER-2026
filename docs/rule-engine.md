# SERA — Deterministic Rule Provenance Engine

---

## 1. The Principle of Rule Provenance

In industrial reliability engineering, an alert or recommendation without a cited standard or physical justification is useless. 

SERA enforces the **Rule Provenance Principle**:
> *Every detected anomaly, status classification, or triggered threshold MUST explicitly cite its governing standard, threshold boundary, parameter key, and engineering rationale.*

---

## 2. Rule Hierarchy & Evaluation Order

When evaluating a telemetry record, SERA executes rules in a strict 3-tier priority sequence:

```
┌────────────────────────────────────────────────────────┐
│ Priority 1: OEM Machine Interlock Trip Limits          │
│ Example: Overall Vibration ≥ 11.00 mm/s (Auto-Trip)    │
│ Example: Coupling Radial Offset ≥ 0.300 mm (Trip)      │
├────────────────────────────────────────────────────────┤
│ Priority 2: International Standards (ISO 10816-3)      │
│ Example: Zone D Unacceptable Velocity > 7.10 mm/s      │
│ Example: Zone C Unsatisfactory Velocity > 4.50 mm/s    │
├────────────────────────────────────────────────────────┤
│ Priority 3: Plant Operating Envelope Guidelines        │
│ Example: 2X Rotational Harmonic Surge ≥ 5.00 mm/s      │
│ Example: Drive End Bearing Temperature ≥ 95.0 °C (Trip)│
└────────────────────────────────────────────────────────┘
```

---

## 3. Implemented Rule Catalog (BL-5702 Blower Example)

| Rule ID | Parameter | Condition | Threshold | Unit | Severity | Source Type | Source Reference | Engineering Rationale |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `RULE-VIB-TRIP-01` | `vibration` | $\ge$ | $11.00$ | $\text{mm/s}$ | `TRIP` | OEM Standard | OEM Manual Section 4.2 | Emergency trip interlock to prevent catastrophic casing destruction. |
| `RULE-VIB-ALARM-01` | `vibration` | $\ge$ | $7.00$ | $\text{mm/s}$ | `ALARM` | Plant Standard | Cilegon Plant Operating Guideline Unit 05 | High vibration alert requiring immediate operational intervention. |
| `RULE-ISO-ZONE-D` | `vibration` | $\ge$ | $7.10$ | $\text{mm/s}$ | `CRITICAL` | ISO Standard | ISO 10816-3 (Class III/IV Rigid) | Unacceptable vibration severity zone; causes structural fatigue. |
| `RULE-HARM-2X-TRIP` | `harmonic_2x` | $\ge$ | $5.00$ | $\text{mm/s}$ | `TRIP` | Vibration Analysis | ISO 10816-3 Spectral Diagnostic Annex B | Dominant 2X harmonic signature is a definitive indicator of angular/radial shaft misalignment. |
| `RULE-OFFSET-TRIP` | `coupling_offset` | $\ge$ | $0.300$ | $\text{mm}$ | `TRIP` | OEM Standard | Blower Coupling Manual Tab 3 | Radial centerline offset exceeds flexible disc elastic deflection limit. |
| `RULE-OFFSET-WARN` | `coupling_offset` | $\ge$ | $0.050$ | $\text{mm}$ | `WARNING` | Engineering Standard| Precision Laser Alignment Spec | Exceeds standard precision alignment tolerance ($< 0.05\text{ mm}$). |
| `RULE-TEMP-DE-TRIP` | `bearing_temperature`| $\ge$ | $95.0$ | $^\circ\text{C}$ | `TRIP` | OEM Standard | Sleeve Bearing Design Spec | Hydrodynamic oil film breakdown risk due to misalignment friction heating. |

---

## 4. Rule Output Payload Structure

When evaluated against live telemetry, the rule engine returns a `RuleTraceData` model:

```json
{
  "equipment_id": "BL-5702",
  "status": "CRITICAL",
  "rules_triggered_count": 4,
  "rules_triggered": [
    {
      "rule_id": "RULE-VIB-TRIP-01",
      "equipment_id": "BL-5702",
      "parameter": "vibration",
      "observed_value": 11.22,
      "condition": ">=",
      "threshold": 11.0,
      "unit": "mm/s",
      "severity": "TRIP",
      "source_type": "OEM Standard",
      "source_reference": "OEM Manual Section 4.2",
      "rationale": "Emergency trip interlock to prevent catastrophic casing destruction.",
      "priority": 1
    }
  ],
  "reasons": [
    "Overall vibration (11.22 mm/s) breached OEM trip threshold (11.00 mm/s).",
    "2X Harmonic (5.10 mm/s) breached spectral trip threshold (5.00 mm/s).",
    "Coupling radial offset (0.306 mm) breached trip tolerance (0.300 mm)."
  ],
  "evaluated_at": "2026-06-17T04:30:00Z"
}
```
