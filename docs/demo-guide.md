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
