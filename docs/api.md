# SERA — REST API Specification

All endpoints are hosted at `/api` and conform to the OpenAPI 3.0 specification. Interactive API documentation is available at `http://localhost:8000/docs`.

---

## 1. Summary of Endpoints

| Category | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Dashboard** | `GET` | `/api/dashboard/overview` | Plant-wide fleet health summary, outage metrics, and active trips |
| **Equipment** | `GET` | `/api/equipment` | List all registered machines with latest condition indicators |
| **Equipment** | `GET` | `/api/equipment/{id}` | Detailed asset dossier, thresholds, and lifetime downtime totals |
| **Equipment** | `GET` | `/api/equipment/{id}/trend` | Full multi-week telemetry time-series and ISO thresholds |
| **Equipment** | `GET` | `/api/equipment/{id}/what-changed` | Baseline vs current comparative delta matrix |
| **Equipment** | `GET` | `/api/equipment/{id}/evidence` | Active rule breach evidence items with provenance citations |
| **Equipment** | `GET` | `/api/equipment/{id}/analysis` | Consolidated diagnostics (RCA, evidence, incidents, work order) |
| **Incidents** | `GET` | `/api/incidents` | Search historical incident archives with keyword/tag filters |
| **Incidents** | `GET` | `/api/incidents/similar` | Retrieve top similar past failures using TF-IDF cosine matching |
| **Analysis** | `POST` | `/api/analysis/detect` | Execute deterministic threshold and anomaly detection |
| **Analysis** | `POST` | `/api/analysis/rca` | Deduces 5-Why root cause fault tree and failure propagation |
| **Analysis** | `POST` | `/api/analysis/investigate` | Trigger end-to-end AI investigation agent workflow |
| **Work Orders** | `GET` | `/api/recommendation` | List all maintenance recommendation plans |
| **Work Orders** | `POST` | `/api/recommendation` | Generate new corrective & preventive action plan |
| **Work Orders** | `POST` | `/api/recommendation/{id}/review` | Submit Lead Engineer authorization (`ACCEPT`/`MODIFY`/`REJECT`) |
| **Follow-Up** | `GET` | `/api/follow-up` | List all post-maintenance follow-up verification records |
| **Follow-Up** | `GET` | `/api/follow-up/{equipment_id}` | Retrieve post-maintenance verification for a specific asset |
| **Follow-Up** | `POST` | `/api/follow-up` | Record post-turnaround commissioning telemetry and calculate deltas |
| **Ingestion** | `POST` | `/api/ingestion/upload` | Multipart form upload of raw Excel telemetry workbook |
| **Ingestion** | `POST` | `/api/ingestion/ingest-raw` | Trigger automated ETL batch ingestion from raw data folder |
| **Ingestion** | `GET` | `/api/ingestion/raw-files` | List all discovered raw data files and sizes |

---

## 2. Detailed Endpoint Contracts

### 2.1 `GET /api/dashboard/overview`
Returns high-level plant overview KPI metrics and status breakdown.

#### Response `200 OK`:
```json
{
  "total_equipment": 5,
  "status_summary": {
    "normal": 4,
    "warning": 0,
    "alarm": 0,
    "critical": 1,
    "trip": 1
  },
  "active_problems": 1,
  "downtime_hours_30d": 38.5,
  "production_loss_30d": 1250.0,
  "financial_loss_30d": 142000.0,
  "recent_incidents_90d": 3,
  "equipment": [
    {
      "equipment_id": "BL-5702",
      "name": "Synthesis Gas Recycle Blower",
      "type": "Centrifugal Blower",
      "location": "Unit 05 - Synthesis Gas",
      "status": "CRITICAL",
      "latest_condition": {
        "vibration": 11.22,
        "harmonic_2x": 5.10,
        "coupling_offset": 0.306,
        "bearing_temperature": 96.9,
        "status": "TRIP"
      }
    }
  ]
}
```

---

### 2.2 `GET /api/equipment/{id}/analysis`
Returns full consolidated diagnostic dossier including evidence, rule trace, RCA, matched historical cases, and recommendation.

#### Parameters:
- `id` (path, string, required): Equipment tag (e.g. `BL-5702`).

#### Response `200 OK`:
```json
{
  "equipment_id": "BL-5702",
  "equipment_status": "CRITICAL",
  "detected_problems": [
    {
      "problem_type": "SHAFT_COUPLING_MISALIGNMENT",
      "severity": "CRITICAL",
      "evidence": [
        "Vibration velocity reached 11.22 mm/s (Trip limit >= 11.00)",
        "2X Harmonic reached 5.10 mm/s (Trip limit >= 5.00)",
        "Radial coupling offset reached 0.306 mm (Trip limit >= 0.300)"
      ]
    }
  ],
  "evidence_layer": [
    {
      "evidence_id": "ev-01",
      "parameter": "Vibration Velocity RMS",
      "parameter_key": "vibration",
      "observed_value": 11.22,
      "previous_value": 8.5,
      "change": 2.72,
      "unit": "mm/s",
      "threshold": ">= 11.00 mm/s",
      "severity": "TRIP",
      "source": "ISO 10816-3 (Class III/IV Rigid)",
      "interpretation": "Exceeds catastrophic trip safety limit."
    }
  ],
  "what_changed": {
    "equipment_id": "BL-5702",
    "current_period": "Week 21 (Trip State)",
    "previous_period": "Weeks 01–05 (Baseline)",
    "comparison": [
      {
        "parameter": "Vibration Velocity RMS",
        "parameter_key": "vibration",
        "unit": "mm/s",
        "baseline_value": 4.10,
        "current_value": 11.22,
        "percentage_change": 173.7,
        "trend": "Increasing",
        "status": "TRIP"
      },
      {
        "parameter": "2X Rotational Harmonic",
        "parameter_key": "harmonic_2x",
        "unit": "mm/s",
        "baseline_value": 1.28,
        "current_value": 5.10,
        "percentage_change": 298.4,
        "trend": "Increasing",
        "status": "TRIP"
      }
    ],
    "summary": "Significant degradation detected: Vibration Velocity RMS surged from baseline 4.10 to 11.22 mm/s (TRIP); 2X Rotational Harmonic surged from baseline 1.28 to 5.10 mm/s (TRIP)."
  },
  "rca": {
    "primary_root_cause": "High vibration from coupling misalignment aggravated by 0.12 mm soft-foot and an over-aged elastomer coupling element (>12 months), undetected because periodic laser alignment checks were absent from routine PM and vibration route interval was too long.",
    "confidence_level": "HIGH_CONFIDENCE (Verified 4P & 4M+1E Analysis)",
    "ar_number": "AR-2026-OPP-0203",
    "evidence": [
      { "code": "P1", "item": "Overall Vibration", "result": "NG", "evidence": "Vibration reached 11.22 mm/s vs 7.0 mm/s alarm — dominant 2X misalignment signature." },
      { "code": "P2", "item": "Coupling Alignment", "result": "NG", "evidence": "Offset 0.35 mm vs < 0.05 mm spec — parallel/angular misalignment." }
    ],
    "four_m_one_e": [
      { "code": "X1", "category": "Method", "result": "NG", "evidence": "Periodic laser alignment and soft-foot checks omitted from routine PM." },
      { "code": "X2", "category": "Material", "result": "NG", "evidence": "Elastomer coupling element operated beyond 12-month design life." }
    ]
  },
  "similar_incidents": [
    {
      "ar": "AR-2025-OPP-0185",
      "tag": "PZ-3313B",
      "plant": "OPP",
      "title": "PZ-3313B Coupling Loose",
      "similarity": 0.942,
      "resolution": "Corrected coupling alignment using laser tool; replaced hardened elastomer insert."
    }
  ],
  "recommendation": {
    "id": "rec-bl5702",
    "equipment_id": "BL-5702",
    "problem_summary": "Emergency trip on Product Blower BL-5702 on 17-Jun-2026 due to coupling misalignment (AR-2026-OPP-0203), incurring 14.0h downtime, 532 tons production loss, and $478.8k financial impact.",
    "corrective_action": "1. Replace cracked and worn elastomer coupling element with genuine OEM insert (PIC: ROT-01).\n2. Correct soft-foot condition on motor foot (re-shim baseplate with 304SS shims to < 0.05 mm tolerance) (PIC: ROT-01).\n3. Re-align motor and blower shafts using precision laser alignment system to < 0.05 mm radial/angular tolerance (PIC: ROT-01).\n4. Restart BL-5702 and confirm continuous stable operation at 38 T/H full load.",
    "preventive_action": "1. Add 6-monthly periodic laser alignment & soft-foot check to BL-5702 routine PM (PM-1, PIC: ROT-01).\n2. Establish plant-wide coupling element register and mandate replacement every 12 months (PM-2, PIC: REL-05).\n3. Shorten BL-5702 vibration monitoring route from monthly to weekly (PM-3, PIC: REL-05).\n4. Pro-Active Action: Roll out alignment check to all Class-A blowers in Orion Polypropylene Plant (OPP) by 18-Aug-2026.",
    "review_status": "PENDING"
  }
}
```

---

### 2.3 `POST /api/recommendation/{id}/review`
Authorizes, modifies, or rejects a maintenance work order.

#### Request Body:
```json
{
  "review_status": "ACCEPTED",
  "engineer_notes": "Reviewed and authorized for immediate emergency turnaround. Verified laser alignment tooling in tool crib.",
  "reviewed_by": "Lead Reliability Engineer (ROT-01 / REL-05)",
  "final_action": "Approved for execution"
}
```

#### Response `200 OK`:
```json
{
  "id": "rec-bl5702",
  "equipment_id": "BL-5702",
  "review_status": "ACCEPTED",
  "engineer_notes": "Reviewed and authorized for immediate emergency turnaround. Verified laser alignment tooling in tool crib.",
  "reviewed_by": "Lead Reliability Engineer (ROT-01 / REL-05)",
  "reviewed_at": "2026-06-17T10:30:00Z",
  "final_action": "Approved for execution"
}
```

---

### 2.4 `POST /api/follow-up`
Records post-maintenance turnaround telemetry and calculates condition recovery metrics.

#### Request Body:
```json
{
  "equipment_id": "BL-5702",
  "recommendation_id": "rec-bl5702",
  "maintenance_date": "2026-06-24T08:00:00Z",
  "action_taken": "Turnaround completed: Soft-foot corrected (0.02 mm), flexible elastomer element replaced, laser alignment dialed into 0.030 mm offset (< 0.05 mm spec). Unit restarted to 38 T/H load.",
  "before_condition": {
    "week": 21,
    "vibration": 11.22,
    "harmonic_2x": 5.10,
    "coupling_offset": 0.306,
    "bearing_temp": 96.9,
    "status": "TRIP"
  },
  "after_condition": {
    "week": 22,
    "vibration": 3.782,
    "harmonic_2x": 1.243,
    "coupling_offset": 0.030,
    "bearing_temp": 60.74,
    "status": "NORMAL"
  },
  "engineer_notes": "Post-repair baseline verified restored per Condition History Week 22. Vibration returned to ISO Zone A (< 4.5 mm/s). Powder handling section running smoothly.",
  "verified_by": "Lead Reliability Engineer (ROT-01 / REL-05)"
}
```

#### Response `201 Created`:
```json
{
  "id": "fu-bl-5702-01",
  "equipment_id": "BL-5702",
  "verification_result": "VERIFIED_RECOVERED",
  "parameter_deltas": {
    "vibration": { "before": 11.22, "after": 3.782, "reduction": 7.438, "pct_reduction": -66.3 },
    "harmonic_2x": { "before": 5.10, "after": 1.243, "reduction": 3.857, "pct_reduction": -75.6 },
    "coupling_offset": { "before": 0.306, "after": 0.030, "reduction": 0.276, "pct_reduction": -90.2 },
    "bearing_temp": { "before": 96.9, "after": 60.74, "reduction": 36.16, "pct_reduction": -37.3 }
  },
  "created_at": "2026-06-24T10:00:00Z"
}
```
