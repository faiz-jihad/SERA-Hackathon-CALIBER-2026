# SERA — Plant User & Operator Manual

---

## 1. Navigating the SERA Interface

### 1.1 Logging In & Persona Selection
1. Navigate to `http://localhost:5173/login`.
2. Select your operational role using the **1-Click Interactive Persona Switcher**:
   - 👑 **Lead Reliability Engineer (`lead.engineer`)**: Full review, modification, and sign-off authority for turnaround plans.
   - 🔧 **Maintenance Technician (`tech.surya`)**: Access to field checklists, laser alignment specs, and schematics.
   - 📊 **Plant Operations Manager (`mgr.hartono`)**: Fleet downtime metrics, production loss tracking, and plant summaries.
   - 💾 **Reliability Data Engineer (`data.admin`)**: Excel workbook upload and batch ingestion controls.
3. Click **"Sign In to Plant System"**.

---

### 1.2 Plant Fleet Cockpit ([`/`](http://localhost:5173/))
- **Fleet KPI Bar**: Displays total fleet assets (5 Class-A/B assets), nominal count, active warnings, critical trips, cumulative downtime ($14.0\text{h}$ on BL-5702), and financial production impact ($478,800 USD).
- **Critical Asset Highlight Banner**: Appears automatically whenever an asset enters `ALARM` or `TRIP` status (e.g. `BL-5702` at Week 21).
- **Mechanical Train Synoptic**: Shows the physical rotating machinery train with live stage-by-stage health indicators.
- **Fleet Status Table**: Interactive fleet overview. Click **"View Cockpit"** or **"Investigate RCA"** to open detailed asset diagnostics.

---

### 1.3 Asset Diagnostics Cockpit ([`/equipment/{id}`](http://localhost:5173/equipment/BL-5702))
Explore the **7-Step Decision Support Pipeline**:
1. **1. DATA (Supporting Inputs)**: Ingested weekly condition monitoring history, hourly PI sensor tag readings, and incident database summaries.
2. **2. DETECT (Anomaly Detection)**: Drivetrain physical schematic, 4 SCADA linear operating gauges with dynamic limits (`warning`, `alarm`, `trip`), and ISO 10816-3 severity matrix.
3. **3. INVESTIGATE (Signals & Correlation)**: Comparative "What Changed from Baseline?" delta table and multi-parameter deterioration trend charts (`vibration`, `harmonic_2x`, `coupling_offset`, `bearing_temperature`).
4. **4. UNDERSTAND (4P / 4M+1E RCA)**: Official 4P verification matrix, 4M+1E gap analysis cards, and TF-IDF cosine-matched historical plant incidents.
5. **5. RECOMMEND (Action Plan)**: Immediate corrective action turnaround scope (CAPA) and preventive recurrence controls (PAA) linked to official Abnormality Reports.
6. **6. REVIEW (Lead Engineer Sign-Off)**: Human-in-the-loop authorization interface (`ACCEPT`, `MODIFY`, `REJECT`) with audit timestamping.
7. **7. VERIFY (Post-Repair Recovery)**: Closed-loop before vs. after scorecard quantifying percentage drops (e.g. $-66.3\%$ vibration drop at Week 22).

---

### 1.4 Data Ingestion Center ([`/ingest`](http://localhost:5173/ingest))
- Upload raw multi-tab Excel telemetry files.
- Select target equipment tag from the live database fleet list (`BL-5702`, `PU-2101B`, `KO-3201`, `PM-4405B`, `HE-3301`).
- Click **"Batch Ingest Official Datasets"** to trigger automated ETL normalization, threshold evaluation, and feature engineering.
