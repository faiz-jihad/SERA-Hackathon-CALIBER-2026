# SERA — Measured Evidence Layer

---

## 1. The Evidence-First Principle

A foundational rule of the SERA architecture is:
> **Evidence must precede narrative. AI reasoning must consume structured evidence, never invent it.**

The Evidence System converts numerical rule evaluations and mathematical feature deltas into discrete, immutable **Evidence Items**.

---

## 2. Anatomy of an Evidence Item

Each evidence item represents a deterministic parameter breach with full provenance:

```typescript
export interface EvidenceItem {
  evidence_id: string        // Unique evidence identifier (e.g. "ev-vib-01")
  parameter: string          // Human-readable parameter name ("Vibration RMS")
  parameter_key: string      // Telemetry key ("vibration")
  observed_value: number     // Live measured value (11.22)
  previous_value: number     // Prior period value (8.50)
  change: number             // Absolute change (+2.72)
  unit: string               // Unit of measure ("mm/s")
  threshold: string          // Governing threshold (">= 11.00 mm/s")
  severity: string           // Severity classification ("TRIP")
  source: string             // Citation standard ("ISO 10816-3 Class III/IV")
  timestamp: string          // Timestamp of observation
  interpretation: string     // Engineering significance
}
```

---

## 3. Evidence Packaging for Downstream Modules

The Evidence Layer packages evidence records into a structured JSON payload that is simultaneously fed to:
1. **Frontend Presentation**: Renders the **What Changed?** table and parameter breach badges.
2. **Historical Search Engine**: Forms keyword vectors for TF-IDF incident matching.
3. **AI Investigation Agent**: Serves as the bounded system prompt context.

```json
{
  "evidence_strength": "STRONG",
  "total_breaches": 4,
  "evidence_items": [
    {
      "evidence_id": "ev-01",
      "parameter": "Vibration Velocity RMS",
      "parameter_key": "vibration",
      "observed_value": 11.22,
      "previous_value": 10.38,
      "change": 0.84,
      "unit": "mm/s",
      "threshold": ">= 11.00 mm/s",
      "severity": "TRIP",
      "source": "ISO 10816-3 (Class A Trip Limit)",
      "interpretation": "Surpassed catastrophic interlock trip threshold of 11.0 mm/s."
    },
    {
      "evidence_id": "ev-02",
      "parameter": "2X Rotational Harmonic",
      "parameter_key": "harmonic_2x",
      "observed_value": 5.10,
      "previous_value": 4.67,
      "change": 0.43,
      "unit": "mm/s",
      "threshold": ">= 5.00 mm/s",
      "severity": "TRIP",
      "source": "Spectral Harmonic Analysis",
      "interpretation": "Dominates rotational energy, confirming severe shaft coupling misalignment."
    },
    {
      "evidence_id": "ev-03",
      "parameter": "Coupling Radial Offset",
      "parameter_key": "coupling_offset",
      "observed_value": 0.306,
      "previous_value": 0.277,
      "change": 0.029,
      "unit": "mm",
      "threshold": ">= 0.300 mm",
      "severity": "TRIP",
      "source": "OEM Coupling Specification",
      "interpretation": "Radial shaft centerline offset exceeds flexible element elastic yield limit."
    },
    {
      "evidence_id": "ev-04",
      "parameter": "DE Bearing Temperature",
      "parameter_key": "bearing_temperature",
      "observed_value": 96.9,
      "previous_value": 92.4,
      "change": 4.5,
      "unit": "°C",
      "threshold": ">= 95.0 °C",
      "severity": "TRIP",
      "source": "OEM Bearing Operating Limit",
      "interpretation": "Frictional heating induced by severe radial preload from misaligned coupling."
    }
  ]
}
```
