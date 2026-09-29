
Build a working prototype of SERA (System for Equipment Reliability Assessment) for CALIBER 2026 Case 2: Intelligent Manufacturing Unified Dashboard.

PROJECT GOAL
SERA is an engineering decision-support system that integrates manufacturing data and helps engineers:

Detect → Investigate → Decide

The system must integrate:

1. Production Data
2. Equipment Performance
3. Downtime Data
4. Incident Database

The main workflow is:

Supporting Data
→ Data Ingestion
→ Data Cleaning & Standardization
→ Unified Database
→ Feature Engineering
→ Problem Detection
→ Root Cause Analysis
→ Historical Analysis
→ Corrective & Preventive Recommendation
→ Engineer Review
→ Unified Manufacturing Dashboard

IMPORTANT:
This is NOT only a predictive maintenance application.
Do not build it as a generic AI chatbot.
Do not claim unsupported RUL, failure prediction accuracy, or model accuracy.
The AI must be evidence-based and show the data/evidence behind its conclusions.

==================================================
TECH STACK
==========

Frontend:

- React
- TypeScript
- Tailwind CSS
- ECharts

Backend:

- Python
- FastAPI

Data:

- PostgreSQL
- Pandas
- OpenPyXL

Analytics:

- Python
- Scikit-learn where useful
- Engineering rules and threshold-based detection

AI:

- RAG / LLM layer for historical incident analysis and recommendation explanation
- AI must not override deterministic engineering evidence

Deployment:

- Docker

IMPORTANT ARCHITECTURE RULE:
Use ONE FastAPI application.

DO NOT create:

- microservices
- API gateway
- Kafka
- Kubernetes
- message queues
- distributed architecture

Keep the architecture lightweight and appropriate for a competition prototype.

==================================================
SYSTEM ARCHITECTURE
===================

Use this architecture:

React Dashboard
        ↓
FastAPI
        ↓
SERA Intelligence Engine
        ├── Data Processing
        ├── Feature Engineering
        ├── Problem Detection
        ├── RCA
        ├── Historical Retrieval
        └── Recommendation
        ↓
PostgreSQL

Python/Pandas/OpenPyXL handles the Supporting Data ingestion.

==================================================
DATA INGESTION
==============

The initial data source is the CALIBER Case 2 Supporting Data.

The prototype should support Excel ingestion.

Expected source categories:

/data
    /production
    /equipment
    /incidents
    /downtime

The system must NOT require manual entry of every row.

Build an ingestion pipeline that:

1. Reads Excel files automatically.
2. Detects sheets and columns.
3. Standardizes column names.
4. Converts timestamps into a consistent format.
5. Validates numeric fields.
6. Detects missing values.
7. Validates equipment IDs.
8. Stores cleaned records in PostgreSQL.

The ingestion pipeline should be reusable for multiple equipment.

==================================================
DATABASE DESIGN
===============

Create a simple relational schema.

TABLE: equipment_conditions

Fields:

- id
- equipment_id
- timestamp / week
- vibration
- harmonic_2x
- coupling_offset
- bearing_temperature
- status
- other available equipment parameters

TABLE: production_records

Fields:

- id
- equipment_id
- timestamp
- production_rate
- pressure
- feed
- run_status
- other available production parameters

TABLE: downtime_records

Fields:

- id
- equipment_id
- start_time
- end_time
- duration
- production_loss
- financial_loss

TABLE: incidents

Fields:

- id
- equipment_id
- incident
- problem
- root_cause
- downtime
- production_loss
- financial_loss
- corrective_action
- preventive_action
- incident_date

Do not invent columns that are not needed.
Adapt the schema to the actual Supporting Data structure.

==================================================
DATA PROCESSING
===============

Do NOT send all raw Excel rows directly to an LLM.

Create a processing layer.

Example:

Raw data:

Week 17:
Vibration = 8.50

Week 18:
Vibration = 9.12

Create derived features:

vibration_change = +0.62
trend = increasing

Possible features:

- vibration_change
- temperature_change
- coupling_offset_change
- harmonic_change
- trend_slope
- consecutive_alarm_count
- distance_to_alarm_threshold
- distance_to_trip_threshold

Only calculate features when the required source data exists.

==================================================
PROBLEM DETECTION
=================

Create a detection engine.

Use a hybrid approach:

1. Engineering thresholds
2. Trend analysis
3. Statistical/anomaly detection where appropriate

The detection engine should produce:

- problem
- severity
- affected equipment
- supporting parameters
- evidence
- timestamp

Example:

Equipment:
BL-5702

Detected problem:
High Vibration

Evidence:

- Vibration increased
- 2X harmonic increased
- Coupling offset increased
- Bearing temperature increased
- Equipment status = ALARM

The system must show WHY the alert was generated.

Do not create fake ML accuracy numbers.

==================================================
ROOT CAUSE ANALYSIS
===================

RCA should not rely only on an LLM.

Use:

Current equipment pattern
+
Engineering relationships
+
Historical incident data
+
Existing RCA information

Example:

High Vibration
+
High 2X Harmonic
+
Increasing Coupling Offset
        ↓
Historical/RCA evidence
        ↓
Possible Root Cause:
Coupling Misalignment

The UI must show the evidence supporting the RCA.

==================================================
HISTORICAL ANALYSIS
===================

Create a historical incident retrieval function.

When an issue is detected:

1. Search incident database.
2. Match equipment.
3. Match problem type.
4. Match relevant parameter patterns where possible.
5. Retrieve similar incidents.
6. Display previous root causes.
7. Display previous corrective actions.
8. Display previous preventive actions.

Example:

Current problem:
High Vibration

Historical results:
3 similar incidents

Common RCA:
Coupling Misalignment

Previous corrective action:
Alignment / inspection

Previous preventive action:
Periodic alignment and vibration trend review

Do not claim the historical match is a statistically validated similarity model unless one is actually implemented.

==================================================
AI / RAG LAYER
==============

The AI layer should receive structured evidence, not raw Excel files.

Input:

Current Condition
+
Detected Problem
+
Engineering Evidence
+
Historical Incidents
+
RCA Evidence
+
Previous Actions

Output:

1. Problem summary
2. Root cause explanation
3. Evidence
4. Corrective recommendation
5. Preventive recommendation
6. Confidence / evidence strength if implemented
7. Engineer review status

The AI must NOT invent maintenance actions that are unsupported by the available evidence.

If evidence is insufficient, explicitly state:

"Insufficient evidence for a reliable recommendation."

==================================================
ENGINEER-IN-THE-LOOP
====================

The engineer remains the final decision maker.

Recommendation interface:

[Accept]
[Modify]
[Reject]

Show:

AI Recommendation
↓
Supporting Evidence
↓
Engineer Review
↓
Final Action

Do not automatically execute maintenance actions.

==================================================
MAIN DASHBOARD
==============

Create an industrial professional dashboard.

Dashboard sections:

1. Plant Overview
2. Equipment Status
3. Production KPI
4. Active Problems
5. Downtime
6. Equipment Trends
7. Historical Incidents
8. AI Recommendations

Main KPI cards:

- Total Equipment
- Normal
- Warning / Alarm
- Critical
- Active Incidents
- Downtime
- Production Loss

Use realistic values only when derived from the actual Supporting Data.

==================================================
EQUIPMENT INVESTIGATION PAGE
============================

Create an equipment detail page.

Example:

BL-5702

Display:

Equipment status
Current condition
Vibration trend
2X harmonic trend
Bearing temperature trend
Coupling offset trend
Production impact
Downtime
Historical incidents

Then show:

PROBLEM DETECTED

ROOT CAUSE INVESTIGATION

HISTORICAL CASES

RECOMMENDED ACTION

ENGINEER REVIEW

==================================================
BL-5702 MVP
===========

Use BL-5702 as the main end-to-end demonstration equipment because its Supporting Data provides a clear progression:

NORMAL
→ ALARM
→ degradation
→ TRIP / FAILURE
→ recovery

Use actual available Supporting Data values.

The system should demonstrate:

1. Read BL-5702 data.
2. Display condition trend.
3. Detect abnormal condition.
4. Show supporting evidence.
5. Investigate root cause.
6. Retrieve historical incident information.
7. Show corrective action.
8. Show preventive action.
9. Allow engineer review.

Do not claim the model was trained on only the weekly BL-5702 records.

==================================================
API DESIGN
==========

Keep the API simple.

Example endpoints:

GET /api/dashboard/overview

GET /api/equipment

GET /api/equipment/{equipment_id}

GET /api/equipment/{equipment_id}/trend

GET /api/equipment/{equipment_id}/analysis

GET /api/incidents

GET /api/incidents/similar

POST /api/ingestion/upload

POST /api/analysis/detect

POST /api/analysis/rca

POST /api/recommendation

POST /api/recommendation/{id}/review

Do not create unnecessary endpoints.

==================================================
FRONTEND FLOW
=============

Main navigation:

Dashboard
Equipment
Incidents
Analysis
Recommendations

User flow:

Dashboard
→ Select Equipment
→ View Condition
→ View Problem
→ Investigate RCA
→ View Historical Cases
→ View Recommendation
→ Engineer Review

==================================================
VISUAL DESIGN
=============

Design language:

Industrial engineering + modern technology.

Use:

- dark navy / charcoal
- white
- gray
- subtle green/cyan
- red only for critical/alarm states

Use:

- KPI cards
- industrial charts
- equipment status indicators
- trend lines
- alert panels
- RCA evidence cards
- historical incident cards
- recommendation cards

Avoid:

- futuristic robots
- generic AI brain graphics
- excessive neon
- excessive glassmorphism
- excessive animations
- startup-style landing pages

The application should look like software used by manufacturing engineers.

==================================================
PROJECT STRUCTURE
=================

Use a simple monorepo:

/sera
    /frontend
        React + TypeScript

    /backend
        FastAPI
        /api
        /services
        /analytics
        /ingestion
        /models
        /database

    /data
        /raw
        /processed

    /scripts
        ingestion scripts

    docker-compose.yml

Do not create unnecessary services.

==================================================
DEMO REQUIREMENT
================

The prototype must work from start to finish.

Demo scenario:

1. Start application.
2. Dashboard loads.
3. Select BL-5702.
4. View equipment trend.
5. SERA detects high vibration.
6. Show evidence.
7. Open RCA investigation.
8. Show coupling misalignment evidence.
9. Show similar historical incidents.
10. Show corrective recommendation.
11. Show preventive recommendation.
12. Engineer reviews recommendation.

The evaluator must be able to see:

INPUT
→ PROCESSING
→ ANALYSIS
→ OUTPUT

Do not make a static dashboard where buttons only change screens.

==================================================
IMPORTANT CALIBER POSITIONING
=============================

SERA is:

"A unified manufacturing reliability decision-support system that connects equipment, production, downtime, and incident data into one investigation workflow."

Core principle:

"Engineering data is the evidence.
AI is the reasoning layer.
Engineers remain the decision makers."

Core workflow:

DETECT
→ INVESTIGATE
→ DECIDE

The system must support the official Case 2 functions:

- Problem Detection
- Root Cause Analysis
- Historical Analysis
- Corrective Action
- Preventive Action

Build the MVP first.
Prioritize working functionality over excessive architecture.
