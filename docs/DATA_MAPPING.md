# DATA MAPPING — SERA CALIBER 2026 Case 2

> All relationships verified against actual Case 2 XLSX files and SERA database.

---

## Top-Level Data Flow

```
Equipment Performance XLSX
        │ (26 weekly condition readings per equipment)
        │ (Equipment Info: thresholds, AR reference, failure date)
        ▼
Production Data XLSX
        │ (720 hourly PI sensor records per equipment)
        │ (PI tag metadata: units, spans, instrument tags)
        ▼
Incident Database XLSX
        │ (380 historical incidents across all plant equipment)
        │ (Linked by Tag Number → Equipment ID)
        ▼
RCA / Downtime PPTX
        │ (5 equipment-specific root cause analyses)
        │ (Linked by AR No. → Equipment Info sheet)
        ▼
SERA Analysis Engine
        │ (Deterministic analytics + AI investigation)
        ▼
Engineer Review → Decision
```

---

## Equipment-to-Data Relationships

| Equipment | Perf. File | Prod. File | Incident Row | RCA File | AR Number |
|---|---|---|---|---|---|
| BL-5702 | RCA5 BL-5702.xlsx | RCA5 BL-5702.xlsx | Row 4 (Serial ?) | RCA5 High Vibration.pptx | AR-2026-OPP-0203 |
| PU-2101B | RCA1 PU-2101B.xlsx | RCA1 PU-2101B.xlsx | Row 4 (Serial 1) | RCA1 Mech Seal.pptx | AR-2026-ARP-0117 |
| KO-3201 | RCA2 KO-3201.xlsx | RCA2 KO-3201.xlsx | Row 5 (Serial 2) | RCA2 High Vibration.pptx | AR-2026-ZCU-0142 |
| PM-4405B | RCA3 PM-4405B.xlsx | RCA3 PM-4405B.xlsx | Row 6 (Serial 3) | RCA3 Motor Bearing.pptx | AR-2026-NUP-0089 |
| HE-3301 | RCA4 HE-3301.xlsx | RCA4 HE-3301.xlsx | Row 7 (Serial 4?) | RCA4 High Fouling.pptx | AR-2026-ZCU-0165 |

---

## Column-Level Mapping

### Equipment Performance → Internal DB

```
Equipment Performance XLSX (Condition History sheet)
    Column 1: Week       → equipment_conditions.week_number
    Column 2: Date       → equipment_conditions.timestamp
    Column 3: Primary indicator (equipment-specific)
               BL-5702   → equipment_conditions.vibration (mm/s)
               PU-2101B  → equipment_conditions.vibration (mm/s)
               KO-3201   → equipment_conditions.radial_vibration (micron) [stored in vibration field]
               PM-4405B  → equipment_conditions.bearing_temperature (°C) [stored in bearing_temperature]
               HE-3301   → stored in raw_data JSON (tube_side_dp)
    Column 4: Secondary indicator (equipment-specific)
               BL-5702   → equipment_conditions.harmonic_2x (mm/s)
               PU-2101B  → raw_data.seal_flush_flow (L/min)
               KO-3201   → raw_data.lube_oil_water (ppm)
               PM-4405B  → equipment_conditions.vibration (mm/s)
               HE-3301   → raw_data.heat_duty_pct (%)
    Column 5: Tertiary indicator
               BL-5702   → equipment_conditions.coupling_offset (mm)
               PU-2101B  → raw_data.discharge_pressure (barg)
               KO-3201   → raw_data.lube_oil_supply_press (barg)
               PM-4405B  → raw_data.motor_ampere (A)
               HE-3301   → raw_data.cold_outlet_temp (°C)
    Column 6: Quaternary indicator
               BL-5702   → equipment_conditions.bearing_temperature (°C)
               PU-2101B  → equipment_conditions.bearing_temperature (°C)
               KO-3201   → equipment_conditions.bearing_temperature (°C)
               PM-4405B  → raw_data.winding_temperature (°C)
               HE-3301   → raw_data.feed_heavy_ends_pct (%)
    Column 7: Health Status  → equipment_conditions.status
    Column 8: Remark         → equipment_conditions.raw_data.remark
```

### Equipment Performance → Rule Engine

```
Equipment Info XLSX (Equipment Info sheet)
    Row 5, Col 3 (Parameter 1)  → rule_engine.parameter
    Row 5, Col 4 (Alarm/Trip)   → rule_engine.threshold (alarm), rule_engine.threshold (trip)
    Row 6, Col 3 (Parameter 2)  → rule_engine.parameter
    Row 6, Col 4 (Alarm/Trip)   → rule_engine.threshold (alarm), rule_engine.threshold (trip)
    Row 7, Col 3 (Parameter 3)  → rule_engine.parameter
    Row 7, Col 4 (Alarm/Trip)   → rule_engine.threshold (alarm), rule_engine.threshold (trip)
    Row 8, Col 3 (Parameter 4)  → rule_engine.parameter
    Row 8, Col 4 (Alarm/Trip)   → rule_engine.threshold (alarm), rule_engine.threshold (trip)
```

### Production Data → Internal DB

```
Production Data XLSX (Sheet2)
    Timestamp         → production_records.timestamp
    {EQ}_FEED         → production_records.feed, production_records.production_rate
    {EQ}_DISP         → production_records.pressure
    {EQ}_VIB          → production_records.raw_data.vibration_sensor
    {EQ}_TEMP         → production_records.raw_data.temperature_sensor
    {EQ}_AMP          → production_records.raw_data.motor_amp
    PLANT_RATE        → production_records.raw_data.plant_rate
    RUN_STATUS        → production_records.run_status
```

### Incident Database → Internal DB

```
Incident Database XLSX (Incident Database sheet)
    Col 3  (AR No.)           → incidents.ar_number (stored in raw_data)
    Col 4  (Plant)            → incidents.raw_data.plant
    Col 5  (Tag Number)       → incidents.equipment_id
    Col 7  (Date of Occur.)   → incidents.incident_date
    Col 8  (Risk Case Title)  → incidents.incident_title
    Col 14 (Discipline)       → incidents.root_cause_category
    Col 16 (Component)        → incidents.raw_data.component
    Col 17 (F Mechanism)      → incidents.problem (combined with title)
    Col 18 (Downtime hrs)     → incidents.downtime_hours
    Col 19 (Act. Loss k USD)  → incidents.financial_loss
    Col 13 (Overall Status)   → incidents.status
```

### RCA Documents → Internal DB

```
RCA PPTX (5 files)
    Equipment Tag    → rca_results.equipment_id, detected_problems.equipment_id
    AR No.           → rca_results.evidence.ar_number
    Root Cause       → rca_results.primary_root_cause
    4P Analysis      → rca_results.evidence.four_p_verification
    4M+1E Analysis   → rca_results.evidence.four_m_one_e_verification
    CAPA Actions     → recommendations.corrective_action, recommendations.preventive_action
    Post-Repair Data → follow_ups.before_condition, follow_ups.after_condition
```

---

## Cross-Reference: Equipment Linking Keys

```
Equipment Performance → Incident Database
    Link: equipment_id == tag_number
    Example: BL-5702 == BL-5702 (Equipment Info R4-C2 == Incident DB Col 5)

Equipment Performance → RCA Documents
    Link: "Linked RCA / AR No." (Equipment Info R13) == AR No. (RCA filename + incident record)
    Example: AR-2026-OPP-0203 links BL-5702 Equipment Info → RCA5 PPTX → Incident DB row

Condition History → Detected Problems
    Link: week_number × equipment_id + TRIP status → detected_problems record
    Example: BL-5702 Week 21 TRIP → detected_problems (2026-06-17 04:30)

Production Records → Condition History
    Link: timestamp overlap (PI hourly overlaps weekly condition window)
    BL-5702: PI range 2026-06-01 to 2026-06-30 overlaps Weeks 19–22
```

---

## SERA Evidence Chain (BL-5702 Golden Path)

```
Step 1: Condition History
   BL-5702 Wk6 → ALARM (Vibration 4.435 mm/s > Offset 0.051 mm crossed alarm)
   BL-5702 Wk15 → ALARM (Vibration 7.425 mm/s exceeded 7.0 alarm threshold)
   BL-5702 Wk21 → TRIP (Vibration 11.22 mm/s, 2X 5.10, Offset 0.306, Temp 96.9)
        ↓
Step 2: Production Context
   PI hourly data (2026-06-01 to 2026-06-17) shows PLANT_RATE, RUN_STATUS ON
   Feed rate ~37-38 T/H at full load until trip
        ↓
Step 3: Incident Record
   Incident DB: AR-2026-OPP-0203, BL-5702, 2026-06-17
   Downtime 14h, Loss 478.8k USD, Component: Coupling, Mechanism: Mechanical
        ↓
Step 4: RCA Evidence
   Primary: Coupling misalignment (0.306 mm offset vs 0.05 mm spec)
   Contributing: 0.12 mm soft-foot (motor DE foot), Aged elastomer element
   PM Gap: Laser alignment absent from routine PM, vibration route too long
        ↓
Step 5: Post-Repair Verification
   Wk22: Vibration 3.782 mm/s, 2X 1.243 mm/s, Offset 0.030 mm, Temp 60.74°C
   VERIFIED_RECOVERED — parameters returned to normal zone
        ↓
Step 6: SERA Analysis Output
   FACT: Multi-indicator degradation confirmed (15 ALARM weeks + 1 TRIP week)
   OBSERVATION: Progressive coupling offset increase from Wk6 (0.051) to Wk21 (0.306)
   HYPOTHESIS: Coupling misalignment with soft-foot contributing factor
   RECOMMENDATION: Laser alignment + elastomer replacement + soft-foot correction
   ENGINEER REVIEW: REQUIRED before action
```

---

## Analytics Engine → AI Agent Data Flow

```
Raw Condition Records (26 per equipment)
        ↓
features.py → compute_features()
   - Rolling slope (3-point window)
   - Trend direction (increasing/stable/decreasing)
   - Distance to alarm/trip threshold
   - Level classification (NORMAL/ALARM/TRIP)
   - Consecutive alarm count
   - Severity score (0–100 composite)
        ↓
detection.py → detect_problems()
   - Check high vibration (vs equipment-specific thresholds)
   - Check coupling misalignment (multi-indicator)
   - Check bearing overtemperature
   - Check abnormal 2X harmonic
        ↓
rule_engine.py → RuleEngine.evaluate_condition_record()
   - Equipment-specific rules (BL-5702: 8 rules)
   - Fleet class rules (rotating machinery)
   - Data-driven trend rules
   - Source provenance tracking
        ↓
rca.py → run_rca() + find_similar_incidents()
   - Pattern matching (problem types → RCA rules)
   - Historical incident search (380 records)
   - Confidence scoring
        ↓
investigation_agent.py → run_sera_investigation()
   LangGraph nodes:
     detect_problem → collect_evidence → analyze_trend
     → check_production_context → check_downtime
     → search_historical_incidents → support_rca
     → generate_corrective_action → generate_preventive_action
     → prepare_evidence_summary
        ↓
Engineer Review (PENDING → ACCEPTED/MODIFIED/REJECTED)
```

---

*All relationships verified against actual Case 2 files and database.*
