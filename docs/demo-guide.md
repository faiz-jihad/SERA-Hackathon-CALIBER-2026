# SERA — Hackathon Demo & Presentation Guide
> 5-Minute Pitch Script & Walkthrough for Hackathon Judges (CALIBER 2026 Case 2)

---

## 🎯 5-Minute Live Demo Pitch Script

### [0:00 – 1:00] The Hook & Industrial Problem
> *"Good morning judges. In heavy continuous manufacturing like the Orion Polypropylene Plant (OPP), when a critical machine like the **BL-5702 Product Blower** trips, plant operations halt immediately — costing **$478,800 USD** in just 14 hours. Today, engineers face fragmented SCADA alarms, lost institutional history, and AI tools that hallucinate ungrounded advice.
>
> Introducing **SERA — System for Equipment Reliability Assessment**. Our philosophy is simple: **Engineering data is the uncompromising evidence, AI is the reasoning layer, and the Lead Engineer remains the final decision maker.**"*

---

### [1:00 – 2:00] Unified Fleet Cockpit & Physical Drivetrain Synoptic
1. **Show Login / RBAC Persona Switcher**:
   - Log in as **Lead Reliability Engineer (lead.engineer)**.
2. **Show Fleet Cockpit ([`/`](http://localhost:5173/))**:
   - Point to the **5 Authoritative Fleet Assets**: `BL-5702`, `PU-2101B`, `KO-3201`, `PM-4405B`, and `HE-3301`.
   - Point to the real-time financial KPI cards: **$478.8K** critical downtime loss, **14.0h** outage window, and **380** historical incidents loaded directly from SQLite (`sera.db`).
   - Click **BL-5702**: Examine the **Interactive Drivetrain Schematic**:
     $$\text{Motor (Class A)} \rightarrow \mathbf{\text{Coupling (FAULT: 0.306 mm Offset & 0.12 mm Soft-Foot)}} \rightarrow \mathbf{\text{DE Bearing (96.9°C)}} \rightarrow \mathbf{\text{Blower (11.22 mm/s)}}$$
   - Explain: *"Rather than generic SaaS charts, the operator instantly sees WHERE the physical defect is located in the machine train and what OEM limit was breached."*

---

### [2:00 – 3:30] Deep Diagnostics: 7-Step Decision Workflow
Navigate through the 7-Step Workflow on the BL-5702 cockpit:

1. **Step 1 (DATA)**:
   - Point to the 3 authoritative data foundations: 26 condition records, 720 hourly PI process tags, and 380 historical incident records.
2. **Step 2 (DETECT)**:
   - Highlight the **SCADA Operating Gauges** and **ISO 10816-3 Severity Matrix**:
     - Vibration: $\mathbf{11.22\text{ mm/s}}$ (Tripped $\ge 11.00\text{ mm/s}$, Zone D).
     - 2X Rotational Harmonic: $\mathbf{5.10\text{ mm/s}}$ (Tripped $\ge 5.00\text{ mm/s}$).
     - Radial Coupling Offset: $\mathbf{0.306\text{ mm}}$ (Tripped $\ge 0.300\text{ mm}$).
     - DE Bearing Temp: $\mathbf{96.9^\circ\text{C}}$ (Tripped $\ge 95.0^\circ\text{C}$).
3. **Step 3 (INVESTIGATE)**:
   - Review the **"What Changed from Baseline?" Table**:
     - $+173.7\%$ vibration surge from $4.10\text{ mm/s}$ baseline.
     - $+298.4\%$ 2X harmonic surge (classic misalignment signature).
     - $+827.3\%$ coupling offset leap.
4. **Step 4 (UNDERSTAND)**:
   - Review **4P Verification Matrix** (P1 Vibration NG, P2 Alignment NG, P4 Soft-Foot NG).
   - Review **4M+1E Gap Analysis** (X1 Method gap, X2 Material gap, X3 Measurement gap).
   - Showcase **Historical Incident Matching**: TF-IDF cosine retrieval matches past cases `PZ-3313B (94.2%)`, `PM-2566C (91.0%)`, `KO-2904 (88.5%)`.

---

### [3:30 – 4:30] CAPA / PAA Action Plan & Engineer Sign-Off
1. **Step 5 (RECOMMEND)**:
   - Sourced from Abnormality Report **AR-2026-OPP-0203**:
     - **Turnaround CAPA**: Replace cracked elastomer element, precision 304SS shimming to fix 0.12 mm soft-foot, laser alignment to $<0.05\text{ mm}$.
     - **Preventive PAA**: 6-monthly laser checks added to PM, 12-month elastomer life register, route interval shortened to weekly.
2. **Step 6 (REVIEW — Human-in-the-Loop)**:
   - Enter lead engineer instructions: *"Authorized for immediate turnaround. Mechanical technicians dispatched with laser alignment kit."*
   - Click **`ACCEPT & AUTHORIZE PLAN`**: Real-time database update records the authorization audit trail.

---

### [4:30 – 5:00] Closed-Loop Follow-Up & Verification ("Did It Work?")
1. **Step 7 (VERIFY)**:
   - Show the post-maintenance verification scorecard recorded at **Week 22 (24-Jun-2026)**:
     - Overall Vibration: $\mathbf{11.22\text{ mm/s}} \rightarrow \mathbf{3.782\text{ mm/s}}$ (**$-66.3\%$ drop**, returned to ISO Zone A).
     - 2X Rotational Harmonic: $\mathbf{5.10\text{ mm/s}} \rightarrow \mathbf{1.243\text{ mm/s}}$ (**$-75.6\%$ drop**).
     - Coupling Offset: $\mathbf{0.306\text{ mm}} \rightarrow \mathbf{0.030\text{ mm}}$ (**$-90.2\%$ drop**, within $<0.05\text{ mm}$ spec).
     - Bearing Temp: $\mathbf{96.9^\circ\text{C}} \rightarrow \mathbf{60.74^\circ\text{C}}$ (**$-37.3\%$ drop**).
   - Conclude: *"SERA closes the loop from data ingestion to detection, investigation, engineer sign-off, and verified recovery. Thank you."*

---

## 🎬 Master 5-Minute Demo Video Script (CALIBER 2026)

| Time | Screen Action | Voice-over | On-screen Text |
| :--- | :--- | :--- | :--- |
| **00:00–00:20** | Intro Title Card, transitioning to plant operations context. Show overview diagram of Orion Polypropylene plant. | "In heavy manufacturing, unexpected equipment trips cost thousands of dollars per hour. Today, maintenance teams are overwhelmed by raw sensor streams and disconnected inspection sheets, making it difficult to understand why a machine tripped and whether a repair actually fixed the root problem." | **SERA**<br>*System for Equipment Reliability Assessment*<br>CALIBER 2026 — Case 2 |
| **00:20–00:40** | Switch to **Fleet Dashboard (`/`)**. Mouse hovers over fleet table rows (`BL-5702`, `KO-3201`, `PM-4405B`, `PU-2101B`). Click row **BL-5702**. | "Meet SERA: the System for Equipment Reliability Assessment. SERA provides engineering decision support for plant machinery. It combines deterministic engineering thresholds, statistical regression, structured evidence, and human-in-the-loop review. Let's examine how SERA handles a live operational trip on Product Blower BL-5702." | **Fleet Reliability Monitoring**<br>Asset: BL-5702 (Product Blower)<br>Status: ATTENTION / TRIP |
| **00:40–01:00** | **Equipment Detail Page (`/equipment/BL-5702`)**. Show Equipment Train Schematic (Motor, Coupling, Blower). Scroll smoothly down to the **Trend Chart**. | "On the equipment detail view, SERA displays the physical mechanical train: the drive motor, the flexible coupling, and the centrifugal blower. Below, we see the vibration velocity history across 26 weeks of operational data." | **Asset Overview: BL-5702**<br>Location: Polymer Plant (OPP)<br>Criticality: HIGH |
| **01:00–01:20** | Zoom into Week 21 on the **Trend Chart**. Hover over the data point: `11.22 mm/s`. Highlight red dashed line at `11.0 mm/s`. | "Through Week 16, vibration remained within normal baseline limits. In Week 17, vibration breached the alarm threshold at 8.5 millimeters per second. By Week 21, it reached 11.22 millimeters per second, breaching the emergency trip limit of 11.0 under rule BL5702_VIB_TRIP. SERA flags this trip deterministically using calibrated engineering standards." | **Threshold Breach**<br>Observed: 11.220 mm/s<br>Trip Limit: 11.000 mm/s<br>Rule ID: BL5702_VIB_TRIP |
| **01:20–01:40** | Navigate via top menu to **Investigations (`/analysis?asset=BL-5702`)**. Display the **Investigation Workflow banner** (Steps 1–7) and scroll to **Parameter Change Analysis (What Changed)**. | "An alarm alone does not tell an engineer what happened. We navigate to the Investigation engine. Here, SERA automatically isolates a healthy baseline period—Weeks 1 through 5—and compares it directly against the critical Week 21 condition." | **Parameter Change Analysis**<br>Baseline: W01–W05<br>Critical: Week 21 (2026-06-17) |
| **01:40–02:00** | Cursor moves across the **What Changed Table**, highlighting the top 3 rows: Vibration, 2X Harmonic, and Coupling Offset. | "Notice what changed: Overall vibration surged by 169.5%. Crucially, the 2X rotational harmonic jumped by 298%, from 1.28 to 5.10 millimeters per second. At the same time, dial offset on the flexible coupling surged by 821%, reaching 0.306 millimeters. Secondary bearing temperature rose from 60.6 to 96.9 degrees Celsius." | **Multi-Parameter Surges**<br>• Vibration: +169.5%<br>• 2X Harmonic: +298.2% (5.10 mm/s)<br>• Coupling Offset: +821.7% (0.306 mm) |
| **02:00–02:20** | Scroll up to the **Engineering Observation (Evidence Layer)** table. Highlight `E-001`, `E-002`, `E-003`, and `E-004`. | "SERA converts these raw observations into traceable evidence items labeled E-001 through E-004. Each evidence item preserves its provenance: source workbook, observation timestamp, and explicit physical interpretation. Nothing is opaque or black-box." | **Structured Evidence Layer**<br>E-001: Vibration 11.22 mm/s (TRIP)<br>E-002: 2X Harmonic 5.10 mm/s (ALARM)<br>E-003: Coupling Offset 0.306 mm (TRIP)<br>Source: BL-5702_equipment_condition.xlsx |
| **02:20–02:40** | Scroll down to **Root Cause Analysis** and the **Fault Tree (5-Why Analysis)** component. | "Based on this synthesized evidence, SERA identifies Coupling Misalignment as the primary root-cause hypothesis. The combination of dominant twice-per-revolution 2X harmonic forcing and measured radial coupling offset confirms classic dynamic shaft misalignment, with motor soft-foot as a probable contributor." | **Root Cause Hypothesis**<br>Primary Cause: Coupling Misalignment<br>Mechanism: 2X Dynamic Forcing<br>Confidence: HIGH |
| **02:40–03:00** | Click top navigation **Recommendations (`/recommendations`)**. Filter to `BL-5702`. Click the recommendation item to open the detail panel. | "With the root cause identified, SERA formulates an evidence-backed maintenance recommendation. It does not recommend generic bearing replacement. Instead, it targets the root mechanism: precision laser realignment to under 0.05 millimeters, replacement of the fatigued flexible coupling insert, and feeler-gauge inspection of the motor baseplate." | **Corrective Action Plan**<br>1. Precision Laser Realignment (< 0.05 mm)<br>2. Replace Flexible Insert Element<br>3. Inspect Motor Soft-Foot |
| **03:00–03:20** | Scroll to the **Work Order Recommendation Preview** card inside the recommendation panel. Highlight the draft badge and reference `WO-REC-BL-5702-E50A71B5`. | "SERA prepares a Work Order Recommendation draft, detailing priority, required tools, safety precautions, and inspection scopes. SERA clearly marks this as an engineering recommendation preview—it does not autonomously alter external enterprise systems without engineer authorization." | **Work Order Draft Preview**<br>Ref: WO-REC-BL-5702-E50A71B5<br>Scope: Alignment & Coupling Overhaul<br>*Decision Support Only — No Blind Execution* |
| **03:20–03:45** | Highlight the **Lead Engineer Review Panel**. Show the status badge `ACCEPTED`, reviewer name `Chief Reliability Engineer`, and review notes. | "Crucially, SERA enforces human-in-the-loop governance. A Lead Reliability Engineer reviews the evidence, verifies the findings, and records formal approval. All reviews are permanently logged with audit timestamps, ensuring accountability before work in the field begins." | **Human-in-the-Loop Governance**<br>Review Status: ACCEPTED<br>Reviewer: Chief Reliability Engineer<br>Audit Trail: Timestamped & Logged |
| **03:45–04:10** | Click top navigation **Verification (`/follow-up`)**. Show KPI header strip, then scroll to the **BL-5702 Verification Card**. | "Now comes the most critical phase: Did the repair actually work? Maintenance was executed during Week 22. In the Follow-Up module, SERA performs post-turnaround verification by comparing the pre-repair critical condition against the restored baseline." | **Post-Maintenance Verification**<br>Module: /follow-up ("Did It Work?")<br>Asset: BL-5702 Product Blower |
| **04:10–04:30** | Zoom in on the **Physical Sensor Parameter Delta table** in the BL-5702 verification card. Highlight the `Before`, `After`, and `% Reduction` columns. | "Look at the numbers: Vibration dropped from 11.22 to 3.78 millimeters per second—a 66.3% reduction, returning well within ISO Zone A limits. Coupling offset recovered by 90.2% to 0.030 millimeters, within API 686 tolerance. 2X harmonic decreased by 75.6%, and bearing temperature returned to 60.7 degrees. SERA dynamically validates the status as VERIFIED_RECOVERED." | **Empirical Recovery Confirmed**<br>• Vibration: 11.22 → 3.78 mm/s (−66.3%)<br>• Coupling: 0.306 → 0.030 mm (−90.2%)<br>• 2X Harmonic: 5.10 → 1.24 mm/s (−75.6%)<br>**Status: VERIFIED_RECOVERED** |
| **04:30–04:45** | Display the **Architecture Summary Slide / Graphic** (Browser to FastAPI, Database, Analytics Engine, Nginx Docker stack). | "Under the hood, SERA runs on a modular stack: a high-performance FastAPI backend, PostgreSQL or SQLite database, and a responsive React frontend. Deterministic engineering algorithms execute locally with sub-second response times, and AI-assisted narrative explanations provide assistive context with reliable deterministic fallback." | **Production Architecture**<br>• FastAPI + Python 3.11/3.14<br>• React + Vite + TailwindCSS<br>• Deterministic Rule & Evidence Engines<br>• Docker Compose Production Stack |
| **04:45–05:00** | Return to the **Fleet Dashboard**. Pan across the screen and show the final takeaway title card. | "From detection to root-cause investigation, engineer approval, and post-maintenance verification: SERA bridges raw industrial data with sound reliability engineering. Thank you." | **SERA — CALIBER 2026**<br>Reliability Decision Support System<br>*Empirical • Traceable • Verified* |

