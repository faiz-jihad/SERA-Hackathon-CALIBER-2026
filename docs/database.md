# SERA — Relational Database Documentation

---

## 1. Relational Entity Relationship (ER) Model

SERA persists time-series telemetry, process sensor readings, master asset registries, rule definitions, historical incidents, and engineering work orders in a fully normalized relational schema using **SQLAlchemy ORM**.

```mermaid
erDiagram
    EQUIPMENT ||--o{ EQUIPMENT_CONDITIONS : "records"
    EQUIPMENT ||--o{ PRODUCTION_RECORDS : "process_telemetry"
    EQUIPMENT ||--o{ DOWNTIME_RECORDS : "outage_logs"
    EQUIPMENT ||--o{ INCIDENTS : "historical_incidents"
    EQUIPMENT ||--o{ DETECTED_PROBLEMS : "detects"
    DETECTED_PROBLEMS ||--o{ RCA_RESULTS : "analyzes"
    RCA_RESULTS ||--o{ RECOMMENDATIONS : "generates"
    RECOMMENDATIONS ||--o{ FOLLOW_UPS : "verified_by"

    EQUIPMENT {
        uuid id PK "Auto-generated UUID"
        string equipment_id UK "Unique asset tag (e.g. BL-5702)"
        string name "Asset description"
        string equipment_type "Classification"
        string location "Plant area / complex"
        string unit "Operating unit / train"
        string status "Current operating status"
        datetime created_at "Registration timestamp"
    }

    EQUIPMENT_CONDITIONS {
        uuid id PK "Auto-generated UUID"
        string equipment_id FK "References EQUIPMENT"
        datetime timestamp "Measurement timestamp"
        int week_number "Operational week index"
        float vibration "Overall velocity RMS (mm/s)"
        float harmonic_2x "2X Rotational component (mm/s)"
        float coupling_offset "Radial offset (mm)"
        float bearing_temperature "DE bearing temp (°C)"
        float motor_temperature "Stator winding temp (°C)"
        float motor_current "Motor current (A)"
        string status "Operating condition flag"
        json raw_data "Unpacked sensor tags JSON"
    }

    PRODUCTION_RECORDS {
        uuid id PK "Auto-generated UUID"
        string equipment_id FK "References EQUIPMENT"
        datetime timestamp "Hourly timestamp"
        float production_rate "Plant throughput (T/H)"
        float pressure "Discharge pressure (bar)"
        float feed "Feed rate (T/H)"
        float flow_rate "Volumetric flow rate"
        float efficiency "Calculated efficiency (%)"
        string run_status "ON / OFF / TRIP"
        json raw_data "Additional PI sensor tags JSON"
    }

    DOWNTIME_RECORDS {
        uuid id PK "Auto-generated UUID"
        string equipment_id FK "References EQUIPMENT"
        datetime start_time "Outage start timestamp"
        datetime end_time "Outage end timestamp"
        float duration_hours "Total outage duration"
        string reason "Failure cause explanation"
        float production_loss "Lost production (tons)"
        float financial_loss "Estimated loss ($ USD)"
    }

    INCIDENTS {
        uuid id PK "Auto-generated UUID"
        int serial_number "Serial number from workbook"
        string ar_number "Abnormality report reference"
        string plant "Plant unit code (OPP, ARP, PGP, SMX, OP2)"
        string equipment_id FK "References EQUIPMENT"
        date date "Occurrence date"
        string title "Incident title"
        string problem "Symptom description"
        string root_cause "Identified root cause"
        string corrective_action "Remedial action taken"
        string preventive_action "Recurrence prevention"
        float downtime_hours "Downtime duration"
        float financial_loss "Recorded financial loss ($)"
        string severity "CRITICAL / HIGH / MEDIUM"
        string status "Resolution status"
    }

    DETECTED_PROBLEMS {
        uuid id PK "Auto-generated UUID"
        string equipment_id FK "References EQUIPMENT"
        datetime detected_at "Detection timestamp"
        string problem_type "Classification"
        string severity "TRIP / ALARM / WARNING"
        string status "OPEN / IN_PROGRESS / RESOLVED"
        json evidence "List of factual trigger statements"
        json parameters "Snapshot of breached values"
    }

    RCA_RESULTS {
        uuid id PK "Auto-generated UUID"
        uuid problem_id FK "References DETECTED_PROBLEMS"
        string equipment_id FK "References EQUIPMENT"
        datetime rca_timestamp "Analysis timestamp"
        string primary_root_cause "Core root cause"
        string confidence_level "Confidence rating"
        json evidence "4P and 4M+1E verification JSON"
        json possible_root_causes "Alternative hypotheses"
        json similar_incidents "Top historical matches"
    }

    RECOMMENDATIONS {
        uuid id PK "Auto-generated UUID"
        uuid problem_id FK "References DETECTED_PROBLEMS"
        uuid rca_id FK "References RCA_RESULTS"
        string equipment_id FK "References EQUIPMENT"
        datetime generated_at "Generation timestamp"
        string problem_summary "Problem synopsis"
        string root_cause_explanation "RCA narrative"
        string corrective_action "CAPA turnaround scope"
        string preventive_action "PAA long-term strategy"
        json evidence "Turnaround window and loss estimates"
        string review_status "PENDING / ACCEPTED / MODIFIED / REJECTED"
        string engineer_notes "Lead engineer comments"
        datetime reviewed_at "Authorization timestamp"
        string reviewed_by "Reviewer ID / name"
        string final_action "Authorized field work scope"
    }

    FOLLOW_UPS {
        uuid id PK "Auto-generated UUID"
        string equipment_id FK "References EQUIPMENT"
        uuid recommendation_id FK "References RECOMMENDATIONS"
        datetime maintenance_date "Turnaround execution date"
        string action_taken "Executed field actions"
        json before_condition "Pre-maintenance snapshot"
        json after_condition "Post-maintenance snapshot"
        string verification_result "VERIFIED_RECOVERED"
        json parameter_deltas "Calculated reduction percentages"
        string engineer_notes "Final commissioning notes"
        string verified_by "Signing engineer"
        datetime verified_at "Verification timestamp"
    }
```

---

## 2. Table Specifications & Data Volume

| Table Name | Primary Purpose | Official Record Count | Source File |
|---|---|---|---|
| `equipment` | Master asset registry | **5 Assets** | Equipment Info Sheets |
| `equipment_conditions` | Weekly condition monitoring time-series | **130 Records** (26 wks × 5 assets) | `Condition History` Sheets |
| `production_records` | Hourly PI sensor telemetry | **3,600 Records** (720 hrs × 5 assets) | `Production Data - RCA*.xlsx` |
| `downtime_records` | Historical equipment downtime logs | Logged equipment events | Downtime / Incident records |
| `incidents` | Cross-plant historical breakdowns | **380 Records** ($67.2M loss, 2,261.1h) | `Incident Database.xlsx` |
| `detected_problems` | Active mechanical anomalies | Auto-detected & historical | Rule & Detection Engine |
| `rca_results` | 4P & 4M+1E investigation findings | 5 Equipment RCAs | Official Case 2 RCA Reports |
| `recommendations` | Turnaround CAPA & fleet PAA plans | Generated / Official | Abnormality Reports (e.g. `AR-2026-OPP-0203`) |
| `follow_ups` | Post-maintenance recovery verification | Week 22 verified records | Post-turnaround Condition History |

---

## 3. Database Engine Flexibility & Initialization

SERA supports dual database engine configurations via standard environment variables:

| Setting | SQLite (Default for Hackathon / Demos) | PostgreSQL (Enterprise Production) |
| :--- | :--- | :--- |
| **Connection URI** | `sqlite:///./sera.db` | `postgresql://user:pass@host:5432/sera_db` |
| **Concurrency** | Single-file locking | Multiversion Concurrency Control (MVCC) |
| **JSON Support** | Native JSON1 extension | Native JSONB with GIN indexing |
| **Setup Overhead** | 0 seconds (auto-created on startup) | Requires PostgreSQL container or managed RDS |

The database is initialized and populated automatically on startup by running `scripts/ingest_official_caliber_data.py`.
