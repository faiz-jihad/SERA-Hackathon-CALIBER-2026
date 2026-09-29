# DATA DICTIONARY — SERA CALIBER 2026 Case 2

> **Source of Truth:** All entries verified against actual Case 2 XLSX files.  
> **Last Verified:** 2026-09-29  
> **Status:** Complete — 5 equipment, 4 data categories, 23 incident columns

---

## Overview

| Category | Files | Records | Date Range |
|---|---|---|---|
| Equipment Performance | 5 XLSX | 26 weeks × 5 = 130 records | 2025-10-23 to 2026-08-12 |
| Production Data (PI Tags) | 5 XLSX | 720 hourly × 5 = 3,600 records | 2026-03-01 to 2026-06-30 |
| Incident Database | 1 XLSX | 380 incidents | 2024-06-18 to 2026-07-08 |
| RCA Documents | 5 PPTX | 5 root cause analyses | 2026-03-12 to 2026-07-08 |

---

## 1. Equipment Performance Files

### 1.1 Equipment Info Sheet (all 5 files)

| Column | Row | Type | Unit | Description |
|---|---|---|---|---|
| Equipment Tag | R4-C2 | String | — | Equipment identifier (e.g., BL-5702) |
| Equipment Name | R5-C2 | String | — | Full descriptive name |
| Equipment Type | R6-C2 | String | — | Class (Centrifugal Blower, Centrifugal Pump, etc.) |
| Equipment Class | R7-C2 | String | — | Risk class A or B |
| Plant / Unit | R8-C2 | String | — | Plant and unit name |
| Discipline | R9-C2 | String | — | ROT / ELE / STA |
| Criticality | R10-C2 | String | — | High / Medium |
| Design Life | R11-C2 | String | — | Bearing/seal element design life |
| Monitoring Method | R12-C2 | String | — | Online DCS + monthly vibration/thermography |
| Linked RCA / AR No. | R13-C2 | String | — | AR reference number |
| Failure Date | R14-C2 | Date | — | Date of dominant failure |
| Dominant Failure Mode | R15-C2 | String | — | Primary failure description |
| Parameter (Col 3) | R4-R8 C3 | String | — | Monitored parameter name |
| Alarm / Trip (Col 4) | R4-R8 C4 | String | — | Threshold values (Alarm / Trip) |

---

### 1.2 Condition History — Per-Equipment Column Mapping

#### BL-5702 — Product Blower (Centrifugal Blower, OPP)
**File:** `Equipment Performance - RCA5 BL-5702.xlsx` | **Rows:** 27 (header + 26 weeks)  
**Date Range:** 2026-01-28 to 2026-07-22 | **AR:** AR-2026-OPP-0203

| Col | Column Header (raw) | Internal Name | Unit | Alarm | Trip | Direction |
|---|---|---|---|---|---|---|
| 1 | Week | week_number | — | — | — | — |
| 2 | Date | timestamp | — | — | — | — |
| 3 | Overall Vibration (mm/s) | vibration | mm/s | 7.0 | 11.0 | > high |
| 4 | 2X Harmonic (mm/s) | harmonic_2x | mm/s | 3.0 | 5.0 | > high |
| 5 | Coupling Offset (mm) | coupling_offset | mm | 0.05 | 0.30 | > high |
| 6 | Bearing Temp (°C) | bearing_temperature | °C | 80.0 | 95.0 | > high |
| 7 | Health Status | status | — | — | — | — |
| 8 | Remark | remark | — | — | — | — |

**Key Verified Data Points (from actual XLSX):**

| Week | Date | Vibration (mm/s) | 2X (mm/s) | Offset (mm) | Bearing (°C) | Status |
|---|---|---|---|---|---|---|
| 1 | 2026-01-28 | 4.004 | 1.143 | 0.025 | 60.72 | NORMAL |
| 5 | 2026-02-25 | 4.268 | 1.311 | 0.036 | 60.44 | NORMAL |
| 6 | 2026-03-04 | 4.435 | 1.470 | 0.051 | 60.92 | ALARM |
| 15 | 2026-05-06 | 7.425 | 2.960 | 0.163 | 77.14 | ALARM |
| 20 | 2026-06-10 | 10.376 | 4.671 | 0.277 | 92.41 | ALARM |
| **21** | **2026-06-17** | **11.220** | **5.100** | **0.306** | **96.90** | **TRIP** |
| 22 | 2026-06-24 | 3.782 | 1.243 | 0.030 | 60.74 | NORMAL |
| 26 | 2026-07-22 | 4.001 | 1.155 | 0.001 | 60.78 | NORMAL |

---

#### PU-2101B — Feed Charge Pump (Centrifugal Pump, ARP)
**File:** `Equipment Performance - RCA1 PU-2101B.xlsx` | **Rows:** 27 (header + 26 weeks)  
**Date Range:** 2025-10-23 to 2026-04-16 | **AR:** AR-2026-ARP-0117

| Col | Column Header (raw) | Internal Name | Unit | Alarm | Trip | Direction |
|---|---|---|---|---|---|---|
| 1 | Week | week_number | — | — | — | — |
| 2 | Date | timestamp | — | — | — | — |
| 3 | Overall Vibration (mm/s) | vibration | mm/s | 7.0 | 11.0 | > high |
| 4 | Seal Flush Flow (L/min) | seal_flush_flow | L/min | 5.0 | 4.0 | < low min |
| 5 | Discharge Pressure (barg) | discharge_pressure | barg | 8.5 | 7.5 | < low min |
| 6 | Bearing Temp (°C) | bearing_temperature | °C | 80.0 | 95.0 | > high |
| 7 | Health Status | status | — | — | — | — |
| 8 | Remark | remark | — | — | — | — |

---

#### KO-3201 — Cracked Gas Compressor (Centrifugal Compressor, ZCU)
**File:** `Equipment Performance - RCA2 KO-3201.xlsx` | **Rows:** 27 (header + 26 weeks)  
**Date Range:** 2025-12-10 to 2026-06-03 | **AR:** AR-2026-ZCU-0142

| Col | Column Header (raw) | Internal Name | Unit | Alarm | Trip | Direction |
|---|---|---|---|---|---|---|
| 1 | Week | week_number | — | — | — | — |
| 2 | Date | timestamp | — | — | — | — |
| 3 | DE Radial Vibration (micron) | radial_vibration | micron | 45 | 75 | > high |
| 4 | Lube Oil Water Content (ppm) | lube_oil_water | ppm | 500 | 1500 | > high |
| 5 | Lube Oil Supply Press (barg) | lube_oil_supply_press | barg | 1.4 | 1.1 | < low min |
| 6 | Bearing Metal Temp (°C) | bearing_temperature | °C | 95 | 110 | > high |
| 7 | Health Status | status | — | — | — | — |
| 8 | Remark | remark | — | — | — | — |

**Key Verified Data (Wk21 TRIP):** Vibration 76.5 micron, Water 1530 ppm, Press 1.078 barg, Temp 112.2°C

---

#### PM-4405B — Cooling Water Pump Motor (Centrifugal Pump / Electric Motor, NUP)
**File:** `Equipment Performance - RCA3 PM-4405B.xlsx` | **Rows:** 27 (header + 26 weeks)  
**Date Range:** 2026-02-18 to 2026-08-12 | **AR:** AR-2026-NUP-0089

| Col | Column Header (raw) | Internal Name | Unit | Alarm | Trip | Direction |
|---|---|---|---|---|---|---|
| 1 | Week | week_number | — | — | — | — |
| 2 | Date | timestamp | — | — | — | — |
| 3 | Motor DE Bearing Temp (°C) | bearing_temperature | °C | 75 | 90 | > high |
| 4 | Motor Vibration (mm/s) | vibration | mm/s | 5.0 | 8.0 | > high |
| 5 | Motor Ampere (A) | motor_ampere | A | 150 | 165 | > high |
| 6 | Winding Temp (°C) | winding_temperature | °C | 120 | 140 | > high |
| 7 | Health Status | status | — | — | — | — |
| 8 | Remark | remark | — | — | — | — |

---

#### HE-3301 — Feed/Effluent Heat Exchanger (Shell & Tube, BDX)
**File:** `Equipment Performance - RCA4 HE-3301.xlsx` | **Rows:** 27 (header + 26 weeks)  
**Date Range:** 2026-01-01 to 2026-06-25 | **AR:** AR-2026-ZCU-0165

| Col | Column Header (raw) | Internal Name | Unit | Alarm | Trip | Direction |
|---|---|---|---|---|---|---|
| 1 | Week | week_number | — | — | — | — |
| 2 | Date | timestamp | — | — | — | — |
| 3 | Tube-side dP (bar) | tube_side_dp | bar | 0.6 | 0.9 | > high |
| 4 | Heat Duty (% design) | heat_duty_pct | % design | 90 (min) | 70 (min) | < low min |
| 5 | Cold Outlet Temp (°C) | cold_outlet_temp | °C | 110 (min) | 95 (min) | < low min |
| 6 | Feed Heavy-ends (%) | feed_heavy_ends_pct | % | 1.5 | 2.4 | > high |
| 7 | Health Status | status | — | — | — | — |
| 8 | Remark | remark | — | — | — | — |

---

### 1.3 Performance Summary — Verified KPI Values

| Equipment | Downtime (h) | Availability (%) | ALARM wks | TRIP wks | Prod Loss (ton) | Est Loss (k USD) |
|---|---|---|---|---|---|---|
| BL-5702 | 14.0 | 99.68% | 15 | 1 | 532 | 478.8 |
| PU-2101B | 18.5 | 99.58% | 6 | 1 | 251.6 | 226.44 |
| KO-3201 | 32.0 | 99.27% | 11 | 1 | 1760 | 1584 |
| PM-4405B | 8.0 | 99.82% | 6 | 1 | 160 | 112 |
| HE-3301 | 12.0 | 99.73% | 10 | 1 | 216 | 183.6 |

---

## 2. Production Data — PI Tag Metadata

**BL-5702 PI Tags (source: `Production Data - RCA5 BL-5702.xlsx`, Sheet `PI Tag`):**

| PI Tag Name | Description | Unit | Span | Typical | Instrument Tag |
|---|---|---|---|---|---|
| BL5702_FEED | BL-5702 Feed Rate | T/H | 57 | 28.5 | BL5702F.PV |
| BL5702_DISP | BL-5702 Discharge Pressure | BARG | 20 | 10 | BL5702P.PV |
| BL5702_VIB | BL-5702 Vibration | MM/S | 20 | 10 | BL5702V.PV |
| BL5702_TEMP | BL-5702 Temperature | — | — | — | BL5702T.PV |
| BL5702_AMP | BL-5702 Motor Ampere | — | — | — | BL5702A.PV |
| PLANT_RATE | OPP Production Rate | T/H | 49.4 | 24.7 | PLTRMT.PV |
| RUN_STATUS | BL-5702 Run Status | ON_OFF | 1 | 0.5 | BL5702S.PV |

**PU-2101B PI Tags (source: `Production Data - RCA1 PU-2101B.xlsx`, Sheet `PI Tag`):**

| PI Tag Name | Description | Unit | Span | Typical | Instrument Tag |
|---|---|---|---|---|---|
| PU2101B_FEED | PU-2101B Feed Rate | T/H | 20.4 | 10.2 | PU2101BF.PV |
| PU2101B_DISP | PU-2101B Discharge Pressure | BARG | 20 | 10 | PU2101BP.PV |
| PU2101B_VIB | PU-2101B Vibration | MM/S | 20 | 10 | PU2101BV.PV |
| PU2101B_TEMP | PU-2101B Temperature | — | — | — | PU2101BT.PV |
| PU2101B_AMP | PU-2101B Motor Ampere | — | — | — | PU2101BA.PV |
| PLANT_RATE | ARP Production Rate | T/H | 17.68 | 8.8 | PLTRMT.PV |
| RUN_STATUS | PU-2101B Run Status | ON_OFF | 1 | 0.5 | PU2101BS.PV |

**Hourly PI Sensor Data (Sheet2) — All 5 equipment:**

| Column | Type | Unit | Description |
|---|---|---|---|
| Timestamp | DateTime | — | Hourly timestamp |
| {EQ}_FEED | Float | T/H | Equipment feed rate |
| {EQ}_DISP | Float | BARG | Discharge pressure |
| {EQ}_VIB | Float | MM/S | Vibration sensor (real-time) |
| {EQ}_TEMP | Float | — | Temperature sensor |
| {EQ}_AMP | Float | A | Motor current |
| PLANT_RATE | Float | T/H | Plant production rate |
| RUN_STATUS | String | ON/OFF | Equipment run status |

---

## 3. Incident Database — Column Reference

**File:** `Incident Database.xlsx` | **Sheet:** `Incident Database` | **380 records**

| Col | Header | Internal Name | Type | Unit | Description |
|---|---|---|---|---|---|
| 1 | Serial No | serial_no | Integer | — | Sequential number (1–380) |
| 2 | MTO No. | mto_no | String | — | Maintenance Task Order |
| 3 | AR No. | ar_no | String | — | Action Request (e.g., AR-2026-OPP-0203) |
| 4 | Plant | plant | String | — | Plant code (ARP, OPP, ZCU, NUP, BDX, etc.) |
| 5 | Tag Number | tag_number | String | — | Equipment tag (links to Equipment master) |
| 6 | Eq. Class | equipment_class | String | — | A or B |
| 7 | Date of Occur. | incident_date | Date | — | Failure date |
| 8 | Risk Case Title | incident_title | String | — | Short description |
| 9 | Highest Impact | impact | String | — | Uptime Loss / Equipment Bad Actor |
| 10 | Pre-Risk | pre_risk | String | — | Risk level I–V |
| 11 | Risk Score | risk_score | Integer | — | Numerical risk score |
| 12 | PIC (RCA) | pic_rca | String | — | RCA owner (ROT-01, REL-05, etc.) |
| 13 | Overall Status | overall_status | String | — | CA/PA EXECUTION / RISK CLOSED / MONITORING RESULT |
| 14 | Discipline | discipline | String | — | ROT / ELE / STA / INS |
| 15 | Eq. Type | equipment_type | String | — | PU / CO / BL / EM / HE |
| 16 | Component | component | String | — | Mechanical Seal / Coupling / Bearing / Tube |
| 17 | F Mechanism | failure_mechanism | String | — | Mechanical / Leakage / Crack / Fouling |
| 18 | Downtime (hrs) | downtime_hours | Float | hours | Actual downtime |
| 19 | Act. Loss (k US$) | actual_loss_kusd | Float | k USD | Actual financial loss |
| 20 | Pot. Loss (k US$) | potential_loss_kusd | Float | k USD | Potential loss |
| 21 | Total Loss (k US$) | total_loss_kusd | Float | k USD | Act. + Pot. |
| 22 | RCA Due Date | rca_due_date | Date | — | RCA completion deadline |
| 23 | Month - Year | month_year | String | — | e.g., Mar-2026 |

---

## 4. RCA Document Registry

| RCA | Equipment | AR No. | Failure Date | Failure Mode |
|---|---|---|---|---|
| RCA1 | PU-2101B | AR-2026-ARP-0117 | 2026-03-12 | Mechanical Seal Leakage |
| RCA2 | KO-3201 | AR-2026-ZCU-0142 | 2026-04-29 | High Radial Vibration Trip (Bearing Distress) |
| RCA3 | PM-4405B | AR-2026-NUP-0089 | 2026-07-08 | Motor Bearing Failure (Overheating) |
| RCA4 | HE-3301 | AR-2026-ZCU-0165 | 2026-05-21 | High Fouling — Duty Loss & High dP |
| RCA5 | BL-5702 | AR-2026-OPP-0203 | 2026-06-17 | High Vibration (Coupling Misalignment) |

---

## 5. Internal SERA Database

| Table | Current Rows | Description |
|---|---|---|
| equipment | 5 | Equipment master |
| equipment_conditions | 130 | 26 weekly readings × 5 equipment |
| production_records | 3600 | 720 hourly PI records × 5 equipment |
| downtime_records | 5 | 1 per equipment |
| incidents | 380 | Full incident database |
| detected_problems | 1 | BL-5702 TRIP event |
| rca_results | 1 | BL-5702 AR-2026-OPP-0203 |
| recommendations | 1 | BL-5702 CAPA |
| follow_ups | 1 | BL-5702 Week 22 recovery |
| rules | 0 | (awaiting seed from equipment info) |
| ingestion_log | 1 | Full ingestion record |

---

*All values verified from actual Case 2 XLSX files. No values invented.*
