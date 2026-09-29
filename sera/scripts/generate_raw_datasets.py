"""
Generate Supporting Data Excel files for CALIBER 2026 Case 2 in sera/data/raw/
Creates structured Excel workbooks corresponding to:
- /data/raw/equipment/BL-5702_equipment_condition.xlsx
- /data/raw/equipment/plant_equipment_fleet.xlsx
- /data/raw/production/BL-5702_production_records.xlsx
- /data/raw/downtime/BL-5702_downtime_records.xlsx
- /data/raw/incidents/historical_incidents.xlsx

Canonical scenario for BL-5702:
NORMAL → ALARM → DEGRADATION → TRIP/FAILURE → RECOVERY
Week 17: Vibration = 8.50 mm/s
Week 18: Vibration = 9.12 mm/s
Week 20: Vibration = 10.376 mm/s
Week 21: Vibration = 11.220 mm/s, Status = TRIP/FAILURE
Week 22: Vibration = 3.782 mm/s, Status = NORMAL

Fleet Equipment:
- BL-5702 (Blower 5702)
- PU-2101B (Process Pump 2101B)
- KO-3201 (Knock-out Drum Compressor 3201)
- PM-4405B (Product Pump 4405B)
- HE-3301 (Heat Exchanger 3301)
"""
import os
import pandas as pd
from datetime import datetime, timedelta

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_RAW = os.path.join(BASE_DIR, "data", "raw")

os.makedirs(os.path.join(DATA_RAW, "equipment"), exist_ok=True)
os.makedirs(os.path.join(DATA_RAW, "production"), exist_ok=True)
os.makedirs(os.path.join(DATA_RAW, "downtime"), exist_ok=True)
os.makedirs(os.path.join(DATA_RAW, "incidents"), exist_ok=True)

current_date = datetime.now()
start_date = current_date - timedelta(weeks=22)

# ─────────────────────────────────────────────────────────────
# 1. BL-5702 Equipment Condition Excel (Exact Canonical Scenario)
# ─────────────────────────────────────────────────────────────
bl5702_conditions = [
    # wk, vib,  2x,   coupling, bearing_temp, motor_temp, status
    (1,  2.10, 0.45, 0.008, 52.0, 48.0, "NORMAL"),
    (2,  2.15, 0.48, 0.009, 52.3, 48.2, "NORMAL"),
    (3,  2.22, 0.50, 0.010, 52.8, 48.5, "NORMAL"),
    (4,  2.30, 0.55, 0.012, 53.0, 48.8, "NORMAL"),
    (5,  2.45, 0.60, 0.014, 53.8, 49.2, "NORMAL"),
    (6,  2.85, 0.72, 0.018, 55.0, 50.1, "NORMAL"),
    (7,  3.20, 0.88, 0.022, 56.5, 51.5, "NORMAL"),
    (8,  3.65, 1.05, 0.028, 58.0, 52.8, "NORMAL"),
    (9,  4.10, 1.25, 0.034, 60.0, 54.0, "NORMAL"),
    (10, 4.60, 1.50, 0.040, 62.0, 55.5, "NORMAL"),
    (11, 5.20, 1.85, 0.048, 64.5, 57.0, "WARNING"),
    (12, 5.85, 2.15, 0.056, 67.0, 59.2, "WARNING"),
    (13, 6.60, 2.60, 0.065, 70.0, 61.5, "WARNING"),
    (14, 7.20, 3.10, 0.072, 72.8, 63.8, "WARNING"),
    (15, 7.85, 3.65, 0.080, 75.5, 66.0, "WARNING"),
    (16, 8.20, 4.10, 0.086, 78.0, 68.2, "WARNING"),
    # Week 17: Vibration = 8.50 mm/s (ALARM)
    (17, 8.50, 4.80, 0.092, 80.5, 70.5, "ALARM"),
    # Week 18: Vibration = 9.12 mm/s (ALARM)
    (18, 9.12, 5.60, 0.104, 83.2, 73.0, "ALARM"),
    (19, 9.75, 6.25, 0.118, 86.0, 75.5, "ALARM"),
    # Week 20: Vibration = 10.376 mm/s (ALARM)
    (20, 10.376, 7.10, 0.132, 89.5, 78.0, "ALARM"),
    # Week 21: Vibration = 11.220 mm/s (TRIP/FAILURE)
    (21, 11.220, 8.45, 0.155, 94.0, 82.5, "TRIP"),
    # Week 22: Vibration = 3.782 mm/s (NORMAL, Recovered post-repair!)
    (22, 3.782, 0.95, 0.022, 58.5, 52.0, "NORMAL"),
]

bl_cond_rows = []
for wk, vib, h2x, coupling, btemp, mtemp, status in bl5702_conditions:
    ts = start_date + timedelta(weeks=wk - 1)
    bl_cond_rows.append({
        "Equipment ID": "BL-5702",
        "Timestamp": ts.strftime("%Y-%m-%d %H:%M:%S"),
        "Week Number": wk,
        "Vibration": vib,
        "2X Harmonic": h2x,
        "Coupling Offset": coupling,
        "Bearing Temperature": btemp,
        "Motor Temperature": mtemp,
        "Status": status,
    })

df_bl_cond = pd.DataFrame(bl_cond_rows)
bl_cond_path = os.path.join(DATA_RAW, "equipment", "BL-5702_equipment_condition.xlsx")
with pd.ExcelWriter(bl_cond_path, engine="openpyxl") as writer:
    df_bl_cond.to_excel(writer, sheet_name="Equipment Condition", index=False)
print(f"Created: {bl_cond_path} ({len(df_bl_cond)} rows)")

# ─────────────────────────────────────────────────────────────
# 2. Plant Fleet Equipment Condition Excel (PU-2101B, KO-3201, PM-4405B, HE-3301)
# ─────────────────────────────────────────────────────────────
fleet_data = [
    # PU-2101B Process Pump (WARNING - coupling offset trend)
    ("PU-2101B", 3.10, 0.85, 0.032, 64.0, 56.0, "NORMAL"),
    ("PU-2101B", 3.25, 0.92, 0.038, 65.2, 57.1, "NORMAL"),
    ("PU-2101B", 3.42, 1.05, 0.045, 67.5, 59.0, "WARNING"),
    # KO-3201 Knock-Out Compressor (NORMAL)
    ("KO-3201", 1.75, 0.42, 0.011, 53.0, 48.0, "NORMAL"),
    ("KO-3201", 1.80, 0.44, 0.012, 53.5, 48.4, "NORMAL"),
    ("KO-3201", 1.85, 0.46, 0.013, 54.0, 48.8, "NORMAL"),
    # PM-4405B Product Pump (NORMAL)
    ("PM-4405B", 1.55, 0.38, 0.009, 50.5, 46.2, "NORMAL"),
    ("PM-4405B", 1.58, 0.40, 0.009, 51.0, 46.5, "NORMAL"),
    ("PM-4405B", 1.62, 0.41, 0.010, 51.5, 47.0, "NORMAL"),
    # HE-3301 Heat Exchanger (NORMAL)
    ("HE-3301", 0.90, 0.15, 0.005, 47.0, 43.0, "NORMAL"),
    ("HE-3301", 0.92, 0.16, 0.005, 47.5, 43.2, "NORMAL"),
    ("HE-3301", 0.95, 0.18, 0.006, 48.0, 43.5, "NORMAL"),
]

fleet_rows = []
for i, (eid, vib, h2x, coupling, btemp, mtemp, status) in enumerate(fleet_data):
    ts = start_date + timedelta(weeks=20 + (i % 3))
    fleet_rows.append({
        "Equipment ID": eid,
        "Timestamp": ts.strftime("%Y-%m-%d %H:%M:%S"),
        "Week Number": 20 + (i % 3),
        "Vibration": vib,
        "2X Harmonic": h2x,
        "Coupling Offset": coupling,
        "Bearing Temperature": btemp,
        "Motor Temperature": mtemp,
        "Status": status,
    })

df_fleet = pd.DataFrame(fleet_rows)
fleet_path = os.path.join(DATA_RAW, "equipment", "plant_equipment_fleet.xlsx")
with pd.ExcelWriter(fleet_path, engine="openpyxl") as writer:
    df_fleet.to_excel(writer, sheet_name="Fleet Monitoring", index=False)
print(f"Created: {fleet_path} ({len(df_fleet)} rows)")

# ─────────────────────────────────────────────────────────────
# 3. Production Records Excel
# ─────────────────────────────────────────────────────────────
prod_data = [
    (1, 850, 4.2, 125, 96.5, "RUNNING"),
    (5, 848, 4.2, 124, 96.0, "RUNNING"),
    (10, 845, 4.3, 124, 95.2, "RUNNING"),
    (14, 820, 4.5, 122, 92.5, "RUNNING"),
    (17, 795, 4.8, 116, 88.5, "RUNNING"),
    (18, 770, 5.0, 112, 85.0, "RUNNING"),
    (20, 720, 5.2, 105, 78.0, "RUNNING"),
    (21, 0, 0.0, 0, 0.0, "TRIPPED"),
    (22, 840, 4.3, 123, 95.0, "RUNNING"),
]
prod_rows = []
for wk, rate, press, feed, eff, rstat in prod_data:
    ts = start_date + timedelta(weeks=wk - 1)
    prod_rows.append({
        "Equipment ID": "BL-5702",
        "Timestamp": ts.strftime("%Y-%m-%d %H:%M:%S"),
        "Week Number": wk,
        "Production Rate": rate,
        "Pressure": press,
        "Feed": feed,
        "Efficiency": eff,
        "Run Status": rstat,
    })

df_prod = pd.DataFrame(prod_rows)
prod_path = os.path.join(DATA_RAW, "production", "BL-5702_production_records.xlsx")
with pd.ExcelWriter(prod_path, engine="openpyxl") as writer:
    df_prod.to_excel(writer, sheet_name="Production Data", index=False)
print(f"Created: {prod_path} ({len(df_prod)} rows)")

# ─────────────────────────────────────────────────────────────
# 4. Downtime Records Excel
# ─────────────────────────────────────────────────────────────
downtime_records = [
    {
        "Equipment ID": "BL-5702",
        "Start Time": (current_date - timedelta(days=7)).strftime("%Y-%m-%d %H:%M:%S"),
        "End Time": (current_date - timedelta(days=6, hours=5, minutes=30)).strftime("%Y-%m-%d %H:%M:%S"),
        "Duration Hours": 18.5,
        "Downtime Type": "UNPLANNED_TRIP",
        "Cause": "Emergency trip on vibration interlock (11.22 mm/s) - Coupling failure & soft-foot",
        "Production Loss": 15725.0,
        "Financial Loss": 47175.0,
    },
    {
        "Equipment ID": "PU-2101B",
        "Start Time": (current_date - timedelta(days=18)).strftime("%Y-%m-%d %H:%M:%S"),
        "End Time": (current_date - timedelta(days=18, hours=6)).strftime("%Y-%m-%d %H:%M:%S"),
        "Duration Hours": 6.0,
        "Downtime Type": "PLANNED",
        "Cause": "Shaft alignment verification and shim adjustment",
        "Production Loss": 3600.0,
        "Financial Loss": 10800.0,
    },
]

df_dt = pd.DataFrame(downtime_records)
dt_path = os.path.join(DATA_RAW, "downtime", "BL-5702_downtime_records.xlsx")
with pd.ExcelWriter(dt_path, engine="openpyxl") as writer:
    df_dt.to_excel(writer, sheet_name="Downtime Records", index=False)
print(f"Created: {dt_path} ({len(df_dt)} rows)")

# ─────────────────────────────────────────────────────────────
# 5. Incident Database Excel
# ─────────────────────────────────────────────────────────────
incidents_records = [
    {
        "Equipment ID": "BL-5702",
        "Incident Date": (current_date - timedelta(days=6)).strftime("%Y-%m-%d"),
        "Incident Title": "Catastrophic Vibration Trip — Coupling Misalignment & Soft-Foot",
        "Problem": "High radial vibration surge (11.22 mm/s) with prominent 2X harmonic and high coupling offset",
        "Root Cause": "Coupling misalignment, soft-foot condition, and over-aged elastomer coupling element. Vibration route interval too long to capture rapid rise.",
        "Root Cause Category": "MECHANICAL",
        "Downtime Hours": 18.5,
        "Production Loss": 15725.0,
        "Financial Loss": 47175.0,
        "Corrective Action": "Check and correct coupling alignment. Check soft-foot condition. Inspect and replace elastomer coupling element.",
        "Preventive Action": "Periodic laser alignment checks. Regular soft-foot checks. Track coupling element life. Review vibration trends more frequently.",
        "Severity": "CRITICAL",
        "Status": "CLOSED",
    },
    {
        "Equipment ID": "PU-2101B",
        "Incident Date": (current_date - timedelta(days=75)).strftime("%Y-%m-%d"),
        "Incident Title": "Pump Coupling Angular Misalignment",
        "Problem": "High vibration with 2X harmonic signature and elevated drive-end bearing temperature",
        "Root Cause": "Coupling misalignment caused by foundation settling and soft-foot",
        "Root Cause Category": "MECHANICAL",
        "Downtime Hours": 12.0,
        "Production Loss": 9600.0,
        "Financial Loss": 28800.0,
        "Corrective Action": "Corrected coupling alignment using laser alignment tool. Replaced worn elastomer insert.",
        "Preventive Action": "Conduct quarterly laser alignment checks and track coupling element operating hours.",
        "Severity": "HIGH",
        "Status": "CLOSED",
    },
    {
        "Equipment ID": "KO-3201",
        "Incident Date": (current_date - timedelta(days=160)).strftime("%Y-%m-%d"),
        "Incident Title": "Compressor Coupling Failure — Late Route Detection",
        "Problem": "High vibration trip after route interval missed accelerated degradation trend",
        "Root Cause": "Vibration route interval was too long to capture the fast-rising trend before trip",
        "Root Cause Category": "MONITORING_PROCESS",
        "Downtime Hours": 24.0,
        "Production Loss": 20400.0,
        "Financial Loss": 61200.0,
        "Corrective Action": "Overhauled coupling assembly, reset baseplate shims, replaced flexible element.",
        "Preventive Action": "Increase vibration route frequency from monthly to bi-weekly during elevated load periods.",
        "Severity": "HIGH",
        "Status": "CLOSED",
    },
    {
        "Equipment ID": "PM-4405B",
        "Incident Date": (current_date - timedelta(days=280)).strftime("%Y-%m-%d"),
        "Incident Title": "Bearing Fatigue Spall from Misalignment",
        "Problem": "Bearing temperature rise to 88°C and high frequency acceleration spikes",
        "Root Cause": "Coupling misalignment causing excessive radial load onto DE bearing",
        "Root Cause Category": "MECHANICAL",
        "Downtime Hours": 16.0,
        "Production Loss": 12800.0,
        "Financial Loss": 38400.0,
        "Corrective Action": "Replaced bearing set and realigned motor to pump shaft.",
        "Preventive Action": "Add soft-foot checks to all PM inspection schedules.",
        "Severity": "MEDIUM",
        "Status": "CLOSED",
    },
    {
        "Equipment ID": "HE-3301",
        "Incident Date": (current_date - timedelta(days=380)).strftime("%Y-%m-%d"),
        "Incident Title": "Tube Bundle Vibration & Looseness",
        "Problem": "Acoustic vibration resonance at baffle plates",
        "Root Cause": "Flow-induced vibration causing mechanical baffle plate looseness",
        "Root Cause Category": "MECHANICAL",
        "Downtime Hours": 8.0,
        "Production Loss": 4800.0,
        "Financial Loss": 14400.0,
        "Corrective Action": "Installed anti-vibration damping stakes in tube bundle.",
        "Preventive Action": "Monitor differential pressure and shell flow rate.",
        "Severity": "LOW",
        "Status": "CLOSED",
    },
]

df_inc = pd.DataFrame(incidents_records)
inc_path = os.path.join(DATA_RAW, "incidents", "historical_incidents.xlsx")
with pd.ExcelWriter(inc_path, engine="openpyxl") as writer:
    df_inc.to_excel(writer, sheet_name="Incidents", index=False)
print(f"Created: {inc_path} ({len(df_inc)} rows)")

print("\nAll Supporting Data Excel files successfully generated in sera/data/raw/ with canonical data!")
