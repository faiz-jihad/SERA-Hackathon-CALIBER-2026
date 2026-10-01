"""
SERA Excel Ingestion Pipeline
Authoritative ingestion pipeline for CALIBER 2026 Case 2 files & custom uploads.
Handles:
  - Equipment Performance (Condition History & Performance Summary)
  - Hourly Production Data (PI Tag sensor telemetry)
  - Incident Database (380 plant incident records & custom incident sheets)
  - Downtime & KPI summaries
"""
import os
import re
from datetime import datetime, date
from typing import Optional, Dict, Any, Tuple
import pandas as pd
import numpy as np
from sqlalchemy.orm import Session

from models.db_models import (
    Equipment, EquipmentCondition, ProductionRecord,
    DowntimeRecord, Incident, IngestionLog
)


# ─────────────────────────────────────────────────────────
# 1. Column Normalization
# ─────────────────────────────────────────────────────────

COLUMN_ALIASES: Dict[str, str] = {
    # Vibration & Mechanics
    "vibration": "vibration",
    "overall vibration": "vibration",
    "vib": "vibration",
    "overall_vibration": "vibration",
    "de radial vibration": "radial_vibration",
    "radial vibration": "radial_vibration",
    "radial_vibration": "radial_vibration",
    "axial vibration": "axial_vibration",
    "axial_vibration": "axial_vibration",
    "2x harmonic": "harmonic_2x",
    "harmonic 2x": "harmonic_2x",
    "harmonic_2x": "harmonic_2x",
    "2x": "harmonic_2x",
    "coupling offset": "coupling_offset",
    "coupling_offset": "coupling_offset",
    "coupling": "coupling_offset",

    # Temperatures
    "bearing temp": "bearing_temperature",
    "bearing temperature": "bearing_temperature",
    "bearing_temperature": "bearing_temperature",
    "bearing metal temp": "bearing_temperature",
    "bearing metal temperature": "bearing_temperature",
    "de bearing temp": "bearing_temperature",
    "de bearing temperature": "bearing_temperature",
    "motor de bearing temp": "bearing_temperature",
    "motor de bearing temperature": "bearing_temperature",
    "motor temp": "motor_temperature",
    "motor temperature": "motor_temperature",
    "motor_temperature": "motor_temperature",
    "winding temp": "winding_temperature",
    "winding temperature": "winding_temperature",
    "winding_temperature": "winding_temperature",

    # Equipment-Specific Physical Parameters
    "seal flush flow": "seal_flush_flow",
    "discharge pressure": "discharge_pressure",
    "lube oil water content": "lube_oil_water",
    "lube oil water": "lube_oil_water",
    "lube oil supply press": "lube_oil_supply_press",
    "lube oil supply pressure": "lube_oil_supply_press",
    "motor ampere": "motor_ampere",
    "motor current": "motor_ampere",
    "motor vibration": "motor_vibration",
    "tube-side dp": "tube_side_dp",
    "tube side dp": "tube_side_dp",
    "heat duty": "heat_duty_pct",
    "cold outlet temp": "cold_outlet_temp",
    "cold outlet temperature": "cold_outlet_temp",
    "feed heavy-ends": "feed_heavy_ends_pct",
    "feed heavy ends": "feed_heavy_ends_pct",

    # Status & Identifiers
    "health status": "status",
    "status": "status",
    "condition": "status",
    "equipment status": "status",
    "week": "week_number",
    "week number": "week_number",
    "week_number": "week_number",
    "week no": "week_number",
    "timestamp": "timestamp",
    "date": "timestamp",
    "datetime": "timestamp",
    "date/time": "timestamp",
    "time": "timestamp",
    "equipment_id": "equipment_id",
    "equipment id": "equipment_id",
    "tag": "equipment_id",
    "tag number": "equipment_id",
    "tag no": "equipment_id",
    "serial no": "serial_no",
    "serial number": "serial_no",
    "remark": "remark",
    "remarks": "remark",

    # Production & PI Tags
    "production_rate": "production_rate",
    "production rate": "production_rate",
    "plant rate": "production_rate",
    "plant_rate": "production_rate",
    "flow": "production_rate",
    "rate": "production_rate",
    "pressure": "pressure",
    "feed": "feed",
    "feed rate": "feed",
    "efficiency": "efficiency",
    "run_status": "run_status",
    "run status": "run_status",

    # Downtime & Loss
    "start_time": "start_time",
    "start time": "start_time",
    "end_time": "end_time",
    "end time": "end_time",
    "duration": "duration_hours",
    "duration hours": "duration_hours",
    "duration_hours": "duration_hours",
    "downtime": "downtime_hours",
    "downtime hours": "downtime_hours",
    "production_loss": "production_loss",
    "production loss": "production_loss",
    "financial_loss": "financial_loss",
    "financial loss": "financial_loss",
    "loss": "financial_loss",

    # Incidents
    "incident": "problem",
    "problem": "problem",
    "failure": "problem",
    "root_cause": "root_cause",
    "root cause": "root_cause",
    "root_cause_category": "root_cause_category",
    "root cause category": "root_cause_category",
    "category": "root_cause_category",
    "corrective_action": "corrective_action",
    "corrective action": "corrective_action",
    "preventive_action": "preventive_action",
    "preventive action": "preventive_action",
    "incident_date": "incident_date",
    "incident date": "incident_date",
    "severity": "severity",
    "incident_title": "incident_title",
    "incident title": "incident_title",
    "title": "incident_title",
    "ar no": "ar_number",
    "ar no.": "ar_number",
}


def clean_column_name(raw_name: Any) -> str:
    """Clean and standardize a single column name."""
    if raw_name is None:
        return "unnamed"
    s = str(raw_name).strip()
    # Replace newlines and multiple whitespace
    s = re.sub(r"[\r\n]+", " ", s)
    # Remove unit descriptions in parentheses: (mm/s), (°C), (barg), (hours), etc.
    s_no_units = re.sub(r"\(.*?\)", "", s).strip()
    s_no_units = re.sub(r"\[.*?\]", "", s_no_units).strip()
    key = s_no_units.lower()
    key = re.sub(r"\s+", " ", key).strip()

    if key in COLUMN_ALIASES:
        return COLUMN_ALIASES[key]

    # Check raw key before unit strip
    raw_lower = s.lower().strip()
    if raw_lower in COLUMN_ALIASES:
        return COLUMN_ALIASES[raw_lower]

    # Pattern checks for PI tags like BL5702_FEED, PU2101B_DISP
    if re.search(r"_(feed|rate)$", raw_lower):
        return "feed"
    if re.search(r"_(disp|press)$", raw_lower):
        return "pressure"
    if re.search(r"_vib$", raw_lower):
        return "vibration_sensor"
    if re.search(r"_temp$", raw_lower):
        return "temperature_sensor"
    if re.search(r"_amp$", raw_lower):
        return "motor_amp"

    # Default fallback: lowercase with underscores
    clean = re.sub(r"[^a-zA-Z0-9]+", "_", key).strip("_")
    return clean or "col"


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize DataFrame column names using clean_column_name."""
    df.columns = [clean_column_name(c) for c in df.columns]
    return df


# ─────────────────────────────────────────────────────────
# 2. Parsing Helpers
# ─────────────────────────────────────────────────────────

def parse_timestamp(val: Any) -> Optional[datetime]:
    """Robustly parse timestamp into datetime."""
    if pd.isna(val) or val is None or str(val).strip() == "":
        return None
    if isinstance(val, pd.Timestamp):
        return val.to_pydatetime()
    if isinstance(val, datetime):
        return val
    if isinstance(val, date):
        return datetime.combine(val, datetime.min.time())

    s = str(val).strip()
    formats = [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d",
        "%d/%m/%Y %H:%M:%S",
        "%d/%m/%Y",
        "%m/%d/%Y",
        "%d-%m-%Y",
        "%Y%m%d",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            pass
    try:
        ts = pd.to_datetime(s, errors="coerce")
        if pd.notna(ts):
            return ts.to_pydatetime()
    except Exception:
        pass
    return None


def safe_float(val: Any) -> Optional[float]:
    """Safely convert value to float, handling NaNs, percentages, and strings."""
    if val is None or pd.isna(val):
        return None
    try:
        if isinstance(val, str):
            s = val.strip().replace(",", "")
            if s.endswith("%"):
                return float(s[:-1])
            return float(s)
        f = float(val)
        return None if (np.isnan(f) or np.isinf(f)) else f
    except (ValueError, TypeError):
        return None


def safe_int(val: Any) -> Optional[int]:
    """Safely convert value to integer."""
    f = safe_float(val)
    return int(round(f)) if f is not None else None


def safe_json_dict(row: Any) -> dict:
    """Sanitize row dictionary for database JSON storage."""
    result = {}
    items = row.items() if hasattr(row, "items") else {}
    for k, v in items:
        k_str = str(k)
        if pd.isna(v) or v is None:
            result[k_str] = None
        elif isinstance(v, (datetime, pd.Timestamp, date)):
            result[k_str] = str(v)
        elif isinstance(v, (np.integer, int)):
            result[k_str] = int(v)
        elif isinstance(v, (np.floating, float)):
            result[k_str] = None if (np.isnan(v) or np.isinf(v)) else round(float(v), 4)
        elif isinstance(v, (np.bool_, bool)):
            result[k_str] = bool(v)
        else:
            result[k_str] = str(v)
    return result


def ensure_equipment(db: Session, equipment_id: str) -> Equipment:
    """Ensure equipment record exists in database."""
    tag = str(equipment_id).strip().upper()
    if not tag:
        tag = "UNKNOWN-ASSET"
    existing = db.query(Equipment).filter(Equipment.equipment_id == tag).first()
    if not existing:
        equip = Equipment(
            equipment_id=tag,
            name=f"Equipment {tag}",
            status="NORMAL"
        )
        db.add(equip)
        try:
            db.commit()
            return equip
        except Exception:
            db.rollback()
            return db.query(Equipment).filter(Equipment.equipment_id == tag).first()
    return existing


# ─────────────────────────────────────────────────────────
# 3. Ingestion Functions
# ─────────────────────────────────────────────────────────

def ingest_equipment_conditions(df: pd.DataFrame, db: Session, equipment_id: str) -> dict:
    """
    Ingest Condition History into equipment_conditions.
    Maps physical parameters accurately for all 5 Case 2 assets.
    """
    df = normalize_columns(df)
    eq_id = equipment_id.strip().upper()
    ensure_equipment(db, eq_id)

    rows_ok = 0
    rows_fail = 0
    errors = []

    latest_status = None

    for _, row in df.iterrows():
        try:
            # Skip rows where week_number and measurements are all null (e.g. blank rows)
            wk = safe_int(row.get("week_number"))
            vib = safe_float(row.get("vibration"))
            radial_vib = safe_float(row.get("radial_vibration"))
            harmonic = safe_float(row.get("harmonic_2x"))
            offset = safe_float(row.get("coupling_offset"))
            temp = safe_float(row.get("bearing_temperature"))

            # Specific equipment physical parameters
            seal_flush = safe_float(row.get("seal_flush_flow"))
            discharge_press = safe_float(row.get("discharge_pressure"))
            lube_water = safe_float(row.get("lube_oil_water"))
            lube_press = safe_float(row.get("lube_oil_supply_press"))
            motor_vib = safe_float(row.get("motor_vibration"))
            motor_amp = safe_float(row.get("motor_ampere"))
            winding_temp = safe_float(row.get("winding_temperature"))
            tube_dp = safe_float(row.get("tube_side_dp"))
            heat_duty = safe_float(row.get("heat_duty_pct"))
            cold_temp = safe_float(row.get("cold_outlet_temp"))
            feed_heavy = safe_float(row.get("feed_heavy_ends_pct"))

            # If no week number and no metrics at all, skip
            all_metrics = [vib, radial_vib, harmonic, offset, temp, seal_flush, discharge_press,
                           lube_water, lube_press, motor_vib, motor_amp, winding_temp, tube_dp, heat_duty]
            if wk is None and all(m is None for m in all_metrics):
                continue

            ts = parse_timestamp(row.get("timestamp"))
            if ts is None:
                if wk is not None:
                    # Default week date calculation
                    ts = datetime(2026, 1, 1) + pd.Timedelta(weeks=wk - 1)
                else:
                    ts = datetime.now()

            # Format raw_data dictionary
            raw_dict = safe_json_dict(row)

            # Map parameters by equipment type
            col_vibration = vib
            col_harmonic = harmonic
            col_offset = offset
            col_bearing = temp

            if eq_id == "PU-2101B":
                # PU-2101B: Vibration, Seal Flush Flow, Discharge Pressure, Bearing Temp
                col_harmonic = seal_flush if seal_flush is not None else harmonic
                col_offset = discharge_press if discharge_press is not None else offset
                raw_dict["seal_flush_flow"] = col_harmonic
                raw_dict["discharge_pressure"] = col_offset
            elif eq_id == "KO-3201":
                # KO-3201: Radial Vibration, Lube Oil Water, Lube Oil Supply Press, Bearing Temp
                col_vibration = radial_vib if radial_vib is not None else vib
                col_harmonic = lube_water if lube_water is not None else harmonic
                col_offset = lube_press if lube_press is not None else offset
                raw_dict["radial_vibration"] = col_vibration
                raw_dict["lube_oil_water"] = col_harmonic
                raw_dict["lube_oil_supply_press"] = col_offset
            elif eq_id == "PM-4405B":
                # PM-4405B: Motor DE Bearing Temp, Motor Vibration, Motor Ampere, Winding Temp
                col_vibration = temp if temp is not None else vib
                col_harmonic = motor_vib if motor_vib is not None else harmonic
                col_offset = motor_amp if motor_amp is not None else offset
                col_bearing = winding_temp if winding_temp is not None else temp
                raw_dict["bearing_temperature"] = col_vibration
                raw_dict["vibration"] = col_harmonic
                raw_dict["motor_ampere"] = col_offset
                raw_dict["winding_temperature"] = col_bearing
            elif eq_id == "HE-3301":
                # HE-3301: Tube-side dP, Heat Duty, Cold Outlet Temp, Feed Heavy-ends
                col_vibration = tube_dp if tube_dp is not None else vib
                col_harmonic = heat_duty if heat_duty is not None else harmonic
                col_offset = cold_temp if cold_temp is not None else offset
                col_bearing = feed_heavy if feed_heavy is not None else temp
                raw_dict["tube_side_dp"] = col_vibration
                raw_dict["heat_duty_pct"] = col_harmonic
                raw_dict["cold_outlet_temp"] = col_offset
                raw_dict["feed_heavy_ends_pct"] = col_bearing

            stat_val = str(row.get("status", "")).strip().upper()
            if stat_val in ["NORMAL", "WARNING", "ALARM", "TRIP", "CRITICAL"]:
                status = stat_val
            else:
                status = "NORMAL"

            latest_status = status

            record = EquipmentCondition(
                equipment_id=eq_id,
                timestamp=ts,
                week_number=wk,
                vibration=col_vibration,
                harmonic_2x=col_harmonic,
                coupling_offset=col_offset,
                bearing_temperature=col_bearing,
                motor_temperature=safe_float(row.get("motor_temperature")),
                overall_vibration=col_vibration,
                axial_vibration=safe_float(row.get("axial_vibration")),
                radial_vibration=col_vibration if eq_id == "KO-3201" else safe_float(row.get("radial_vibration")),
                status=status,
                raw_data=raw_dict,
            )
            db.add(record)
            rows_ok += 1
        except Exception as e:
            rows_fail += 1
            errors.append(str(e))

    # Update equipment status if we got any valid records
    if latest_status:
        eq = db.query(Equipment).filter(Equipment.equipment_id == eq_id).first()
        if eq:
            setattr(eq, "status", latest_status)

    db.commit()
    return {"rows_ok": rows_ok, "rows_fail": rows_fail, "errors": errors[:5]}


def ingest_production_records(df: pd.DataFrame, db: Session, equipment_id: str) -> dict:
    """
    Ingest hourly production sensor data into production_records.
    """
    df = normalize_columns(df)
    eq_id = equipment_id.strip().upper()
    ensure_equipment(db, eq_id)

    rows_ok = 0
    rows_fail = 0
    errors = []

    for _, row in df.iterrows():
        try:
            ts = parse_timestamp(row.get("timestamp"))
            if ts is None:
                continue

            rate = safe_float(row.get("production_rate"))
            feed = safe_float(row.get("feed"))
            if rate is None and feed is not None:
                rate = feed

            press = safe_float(row.get("pressure"))
            run_s = str(row.get("run_status", "1")).strip().upper()
            if run_s in ["1", "RUN", "ON", "TRUE"]:
                run_status = "ON"
            else:
                run_status = "OFF"

            eff = safe_float(row.get("efficiency"))
            if eff is None:
                eff = 95.0 if run_status == "ON" else 0.0

            raw_dict = safe_json_dict(row)
            if "vibration_sensor" in row:
                raw_dict["vibration_sensor"] = safe_float(row.get("vibration_sensor"))
            if "temperature_sensor" in row:
                raw_dict["temperature_sensor"] = safe_float(row.get("temperature_sensor"))
            if "motor_amp" in row:
                raw_dict["motor_amp"] = safe_float(row.get("motor_amp"))

            record = ProductionRecord(
                equipment_id=eq_id,
                timestamp=ts,
                production_rate=rate,
                pressure=press,
                feed=feed,
                flow_rate=feed,
                efficiency=eff,
                run_status=run_status,
                raw_data=raw_dict,
            )
            db.add(record)
            rows_ok += 1
        except Exception as e:
            rows_fail += 1
            errors.append(str(e))

    db.commit()
    return {"rows_ok": rows_ok, "rows_fail": rows_fail, "errors": errors[:5]}


def ingest_downtime_records(df: pd.DataFrame, db: Session, equipment_id: str) -> dict:
    """
    Ingest Performance Summary or downtime records into downtime_records.
    """
    eq_id = equipment_id.strip().upper()
    ensure_equipment(db, eq_id)

    rows_ok = 0
    rows_fail = 0
    errors = []

    # Check if this is the Case 2 "Performance Summary" layout (KPI | Value | Basis)
    is_summary_layout = False
    for col in df.columns:
        if "kpi" in str(col).lower() or "basis" in str(col).lower():
            is_summary_layout = True
            break

    if is_summary_layout:
        # Extract downtime hours, production loss, financial loss from KPI rows
        hours = None
        prod_loss = None
        fin_loss = None
        for _, row in df.iterrows():
            kpi_name = str(row.iloc[0]).lower()
            val = safe_float(row.iloc[1])
            if "downtime" in kpi_name:
                hours = val
            elif "production loss" in kpi_name:
                prod_loss = val
            elif "loss" in kpi_name and ("usd" in kpi_name or "est" in kpi_name):
                # Convert kUSD to USD if value is small
                fin_loss = val * 1000.0 if (val and val < 10000) else val

        if hours is not None or prod_loss is not None:
            record = DowntimeRecord(
                equipment_id=eq_id,
                start_time=datetime.now() - pd.Timedelta(days=30),
                end_time=datetime.now(),
                duration_hours=hours or 0.0,
                cause=f"Dominant failure mode downtime window for {eq_id}",
                production_loss=prod_loss or 0.0,
                financial_loss=fin_loss or 0.0,
            )
            db.add(record)
            db.commit()
            return {"rows_ok": 1, "rows_fail": 0, "errors": []}
        return {"rows_ok": 0, "rows_fail": 0, "errors": ["No KPI metrics found in summary sheet"]}

    # Standard tabular downtime records
    df = normalize_columns(df)
    for _, row in df.iterrows():
        try:
            start_ts = parse_timestamp(row.get("start_time")) or datetime.now()
            end_ts = parse_timestamp(row.get("end_time"))
            record = DowntimeRecord(
                equipment_id=eq_id,
                start_time=start_ts,
                end_time=end_ts,
                duration_hours=safe_float(row.get("duration_hours")),
                cause=str(row.get("cause", "")).strip() or f"Downtime event for {eq_id}",
                production_loss=safe_float(row.get("production_loss")),
                financial_loss=safe_float(row.get("financial_loss")),
            )
            db.add(record)
            rows_ok += 1
        except Exception as e:
            rows_fail += 1
            errors.append(str(e))

    db.commit()
    return {"rows_ok": rows_ok, "rows_fail": rows_fail, "errors": errors[:5]}


def ingest_incidents(df: pd.DataFrame, db: Session, default_equipment_id: str) -> dict:
    """
    Ingest Incident Database records into incidents table.
    """
    df = normalize_columns(df)
    rows_ok = 0
    rows_fail = 0
    errors = []

    for _, row in df.iterrows():
        try:
            # Equipment tag from sheet row or default
            raw_tag = str(row.get("equipment_id", "")).strip().upper()
            tag = raw_tag if raw_tag and raw_tag != "NAN" else default_equipment_id.upper()
            if not tag:
                continue

            ensure_equipment(db, tag)

            # Date
            raw_date = row.get("incident_date")
            ts = parse_timestamp(raw_date)
            inc_date = ts.date() if ts else date.today()

            prob = str(row.get("problem", "")).strip()
            if not prob or prob.upper() == "NAN":
                # Check title
                prob = str(row.get("incident_title", "")).strip()
            if not prob or prob.upper() == "NAN":
                continue

            record = Incident(
                equipment_id=tag,
                incident_date=inc_date,
                incident_title=str(row.get("incident_title", "")).strip() or prob,
                problem=prob,
                root_cause=str(row.get("root_cause", "")).strip() or None,
                root_cause_category=str(row.get("root_cause_category", "")).strip() or "MECHANICAL",
                downtime_hours=safe_float(row.get("downtime_hours")),
                production_loss=safe_float(row.get("production_loss")),
                financial_loss=safe_float(row.get("financial_loss")),
                corrective_action=str(row.get("corrective_action", "")).strip() or None,
                preventive_action=str(row.get("preventive_action", "")).strip() or None,
                severity=str(row.get("severity", "MEDIUM")).strip().upper() or "MEDIUM",
                status="CLOSED",
            )
            db.add(record)
            rows_ok += 1
        except Exception as e:
            rows_fail += 1
            errors.append(str(e))

    db.commit()
    return {"rows_ok": rows_ok, "rows_fail": rows_fail, "errors": errors[:5]}


# ─────────────────────────────────────────────────────────
# 4. Sheet Categorization & Discovery
# ─────────────────────────────────────────────────────────

def detect_category(sheet_name: str, sample_df: Optional[pd.DataFrame] = None) -> Optional[str]:
    """
    Intelligently detect sheet category from sheet name and sample columns.
    Returns: 'equipment' | 'production' | 'downtime' | 'incidents' | 'skip'
    """
    name = sheet_name.lower().strip()

    # Skip sheets that are metadata or non-tabular dashboards
    if name in ["equipment info", "pi tag", "dashboard"]:
        return "skip"

    # Exact sheet name heuristics
    if "condition history" in name:
        return "equipment"
    if "performance summary" in name:
        return "downtime"
    if "incident" in name:
        return "incidents"
    if name == "sheet2":
        return "production"

    # General keywords
    if any(kw in name for kw in ["condition", "vibration"]):
        return "equipment"
    if any(kw in name for kw in ["production", "hourly", "sensor", "pi_tag"]):
        return "production"
    if any(kw in name for kw in ["downtime", "summary", "kpi"]):
        return "downtime"

    # If sheet name is ambiguous, check columns
    if sample_df is not None and not sample_df.empty:
        cols = [str(c).lower() for c in sample_df.columns]
        if any("week" in c for c in cols) and any("status" in c or "vib" in c or "temp" in c for c in cols):
            return "equipment"
        if any("incident" in c or "root" in c or "problem" in c for c in cols):
            return "incidents"
        if any("feed" in c or "disp" in c or "plant_rate" in c or "run_status" in c for c in cols):
            return "production"

    return None


def find_header_row(xl: pd.ExcelFile, sheet_name: str) -> Tuple[int, pd.DataFrame]:
    """
    Search first 5 rows to locate the real column header row.
    Handles sheets with title banners (e.g. Incident Database row 1 title, row 3 headers).
    """
    raw_preview = xl.parse(sheet_name, header=None, nrows=6)
    preview = pd.DataFrame(raw_preview) if not isinstance(raw_preview, pd.DataFrame) else raw_preview
    if preview.empty:
        return 0, pd.DataFrame()

    header_row = 0
    header_keywords = [
        "week", "date", "vibration", "timestamp", "serial no",
        "tag number", "problem", "incident", "kpi", "name", "feed"
    ]

    for r_idx in range(min(5, len(preview))):
        row_vals = [str(v).lower().strip() for v in preview.iloc[r_idx] if pd.notna(v)]
        matches = sum(1 for kw in header_keywords if any(kw in val for val in row_vals))
        if matches >= 2:
            header_row = r_idx
            break

    raw_df = xl.parse(sheet_name, header=header_row)
    df = pd.DataFrame(raw_df) if not isinstance(raw_df, pd.DataFrame) else raw_df
    return header_row, df


# ─────────────────────────────────────────────────────────
# 5. Main Ingestion Entry Point
# ─────────────────────────────────────────────────────────

def ingest_excel_file(
    filepath: str,
    db: Session,
    equipment_id: str,
    category: Optional[str] = None
) -> list:
    """
    Reads an Excel file, auto-detects or uses provided category,
    and ingests each sheet into the appropriate database table.
    """
    eq_id = equipment_id.strip().upper()
    ensure_equipment(db, eq_id)

    xl = pd.ExcelFile(filepath)
    results = []

    for sheet_name in xl.sheet_names:
        header_row, df = find_header_row(xl, sheet_name)
        if df.empty:
            continue

        cat = category or detect_category(sheet_name, df)

        # If detected as skip (e.g. metadata banner), record and continue
        if cat == "skip":
            results.append({
                "sheet": sheet_name,
                "category": "metadata_skipped",
                "rows_ok": 0,
                "rows_fail": 0,
                "errors": ["Metadata or summary sheet skipped from raw telemetry insertion."]
            })
            continue

        if cat is None:
            # Fallback based on column check
            cols_str = " ".join([str(c).lower() for c in df.columns])
            if "feed" in cols_str or "timestamp" in cols_str:
                cat = "production"
            elif "incident" in cols_str or "problem" in cols_str:
                cat = "incidents"
            else:
                cat = "equipment"

        try:
            if cat == "equipment":
                res = ingest_equipment_conditions(df, db, eq_id)
            elif cat == "production":
                res = ingest_production_records(df, db, eq_id)
            elif cat == "downtime":
                res = ingest_downtime_records(df, db, eq_id)
            elif cat == "incidents":
                res = ingest_incidents(df, db, eq_id)
            else:
                res = {"rows_ok": 0, "rows_fail": 0, "errors": [f"Unknown category: {cat}"]}

            # Record Ingestion Log
            log = IngestionLog(
                filename=os.path.basename(filepath),
                data_category=cat,
                rows_processed=res["rows_ok"],
                rows_failed=res["rows_fail"],
                status="SUCCESS" if res["rows_fail"] == 0 else "PARTIAL",
                error_details={"errors": res["errors"]} if res["errors"] else None
            )
            db.add(log)
            db.commit()

            results.append({
                "sheet": sheet_name,
                "category": cat,
                **res
            })
        except Exception as e:
            db.rollback()
            results.append({
                "sheet": sheet_name,
                "category": cat,
                "rows_ok": 0,
                "rows_fail": 1,
                "errors": [str(e)]
            })

    return results
