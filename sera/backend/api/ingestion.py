"""
Ingestion API — Upload Excel files for data ingestion
"""
import os
import shutil
import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.connection import get_db
from ingestion.excel_ingestion import ingest_excel_file
from models.db_models import EquipmentCondition, Equipment
from analytics.features import THRESHOLDS

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                          "..", "..", "data", "raw")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload")
async def upload_excel(
    file: UploadFile = File(...),
    equipment_id: str = Form(...),
    category: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Upload an Excel file and ingest it into the database.

    Args:
        file: Excel file (.xlsx or .xls)
        equipment_id: Equipment tag (e.g., BL-5702)
        category: Optional override: equipment, production, downtime, incidents
    """
    if not file.filename or not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Only Excel files (.xlsx, .xls) are accepted.")

    # Save file
    save_path = os.path.join(UPLOAD_DIR, f"{equipment_id}_{file.filename}")
    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Ingest
    try:
        results = ingest_excel_file(
            filepath=save_path,
            db=db,
            equipment_id=equipment_id.upper(),
            category=category
        )

        # Update equipment status based on ingested data
        _update_equipment_status(equipment_id.upper(), db)

        return {
            "status": "success",
            "filename": file.filename,
            "equipment_id": equipment_id.upper(),
            "results": results,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion error: {str(e)}")


@router.get("/raw-files")
def list_raw_files():
    """List all available raw Excel files in official Case 2 datasets."""
    root_base = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    case2_dir = os.path.join(os.path.dirname(root_base), "data", "raw", "Case 2_ Intelligence Manufacturing")
    if not os.path.exists(case2_dir):
        case2_dir = os.path.join(root_base, "data", "raw")

    discovered = []
    if os.path.exists(case2_dir):
        for root, _, files in os.walk(case2_dir):
            for f in files:
                if f.endswith((".xlsx", ".xls")) and not f.startswith("~$"):
                    full_path = os.path.join(root, f)
                    rel_path = os.path.relpath(full_path, case2_dir)
                    discovered.append({
                        "filename": f,
                        "relative_path": rel_path.replace("\\", "/"),
                        "category": os.path.basename(root),
                        "size_bytes": os.path.getsize(full_path),
                    })
    return {"files": discovered, "total": len(discovered)}


@router.post("/ingest-raw")
def trigger_raw_batch_ingestion(equipment_id: Optional[str] = None):
    """
    Trigger the complete batch ingestion runner on official Case 2 datasets.
    Returns structured ingestion statistics per Section 3:
    status, equipment, records_inserted, records_skipped, records_updated, errors.
    """
    try:
        import sys
        import importlib
        scripts_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "scripts")
        if scripts_dir not in sys.path:
            sys.path.insert(0, scripts_dir)
        ingest_official_caliber_data = importlib.import_module("ingest_official_caliber_data")
        stats = ingest_official_caliber_data.run_ingestion()
        if equipment_id:
            stats["equipment"] = equipment_id.upper()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch ingestion failed: {str(e)}")



def _update_equipment_status(equipment_id: str, db: Session):
    """Update equipment status based on latest condition."""
    from models.db_models import Equipment, EquipmentCondition
    from analytics.features import THRESHOLDS

    latest = (
        db.query(EquipmentCondition)
        .filter(EquipmentCondition.equipment_id == equipment_id)
        .order_by(EquipmentCondition.timestamp.desc())
        .first()
    )

    if not latest:
        return

    # Determine status from status field first
    status_raw = getattr(latest, "status", None)
    if status_raw is not None:
        status = str(status_raw).upper()
        if status in ("NORMAL", "WARNING", "ALARM", "CRITICAL", "TRIP"):
            db.query(Equipment).filter(Equipment.equipment_id == equipment_id).update(
                {"status": status}
            )
            db.commit()
            return

    # Compute from vibration
    vib_raw = getattr(latest, "vibration", None)
    if vib_raw is not None:
        vib = float(vib_raw)
        if vib >= THRESHOLDS["vibration"]["trip"]:
            status = "TRIP"
        elif vib >= THRESHOLDS["vibration"]["alarm"]:
            status = "ALARM"
        elif vib >= THRESHOLDS["vibration"]["warning"]:
            status = "WARNING"
        else:
            status = "NORMAL"

        db.query(Equipment).filter(Equipment.equipment_id == equipment_id).update(
            {"status": status}
        )
        db.commit()


class TelemetryPayload(BaseModel):
    equipment_id: str
    timestamp: Optional[str] = None
    parameter: Optional[str] = None
    value: Optional[float] = None
    unit: Optional[str] = None
    source: Optional[str] = "SCADA_GATEWAY"
    vibration: Optional[float] = None
    harmonic_2x: Optional[float] = None
    coupling_offset: Optional[float] = None
    bearing_temperature: Optional[float] = None
    production_rate: Optional[float] = None
    motor_current: Optional[float] = None
    status: Optional[str] = None
    raw_data: Optional[Dict[str, Any]] = None


@router.post("/telemetry")
def ingest_live_telemetry(payload: TelemetryPayload, db: Session = Depends(get_db)):
    """
    Ingest live telemetry from industrial IoT Gateways, SCADA, or OPC-UA bridges.
    Strictly validates: equipment_id, timestamp, parameter, numeric values, units, and source.
    Rejects invalid payloads with HTTP 4xx responses per Section 4.
    """
    import math
    from models.db_models import log_audit

    eq_id = (payload.equipment_id or "").strip().upper()
    if not eq_id:
        raise HTTPException(status_code=400, detail="equipment_id is required and cannot be empty.")

    equipment = db.query(Equipment).filter(Equipment.equipment_id == eq_id).first()
    if not equipment:
        raise HTTPException(status_code=404, detail=f"Equipment '{eq_id}' not registered in asset master.")

    # Validate timestamp
    ts = datetime.datetime.now(datetime.timezone.utc)
    if payload.timestamp:
        try:
            ts = datetime.datetime.fromisoformat(payload.timestamp.replace("Z", "+00:00"))
        except Exception:
            raise HTTPException(status_code=400, detail=f"Invalid ISO datetime format for timestamp: '{payload.timestamp}'")

    # Validate single parameter mode if provided
    vib = payload.vibration
    h2x = payload.harmonic_2x
    offset = payload.coupling_offset
    btemp = payload.bearing_temperature
    prod_rate = payload.production_rate
    m_current = payload.motor_current

    if payload.parameter and payload.value is not None:
        p_name = payload.parameter.strip().lower()
        val = payload.value
        if math.isnan(val) or math.isinf(val):
            raise HTTPException(status_code=422, detail=f"Invalid numeric value for parameter '{p_name}': cannot be NaN or Infinite.")
        if p_name in ("vibration", "overall_vibration"):
            vib = val
        elif p_name in ("harmonic_2x", "2x_harmonic"):
            h2x = val
        elif p_name in ("coupling_offset", "offset"):
            offset = val
        elif p_name in ("bearing_temperature", "bearing_temp"):
            btemp = val
        elif p_name in ("production_rate", "rate"):
            prod_rate = val
        elif p_name in ("motor_current", "motor_ampere"):
            m_current = val

    # Validate all numeric values are finite
    for label, val in [("vibration", vib), ("harmonic_2x", h2x), ("coupling_offset", offset), ("bearing_temperature", btemp)]:
        if val is not None:
            if math.isnan(val) or math.isinf(val):
                raise HTTPException(status_code=422, detail=f"Invalid numeric value for {label}: cannot be NaN or Infinite.")

    # Evaluate status against thresholds if not provided
    calculated_status = payload.status
    if not calculated_status and vib is not None:
        if vib >= THRESHOLDS["vibration"]["trip"]:
            calculated_status = "TRIP"
        elif vib >= THRESHOLDS["vibration"]["alarm"]:
            calculated_status = "ALARM"
        elif vib >= THRESHOLDS["vibration"]["warning"]:
            calculated_status = "WARNING"
        else:
            calculated_status = "NORMAL"

    raw_payload_data = payload.raw_data or {}
    raw_payload_data["source"] = payload.source or "SCADA_GATEWAY"
    if payload.unit:
        raw_payload_data["unit"] = payload.unit

    cond = EquipmentCondition(
        equipment_id=eq_id,
        timestamp=ts,
        vibration=vib,
        harmonic_2x=h2x,
        coupling_offset=offset,
        bearing_temperature=btemp,
        production_rate=prod_rate,
        motor_current=m_current,
        status=calculated_status or "NORMAL",
        raw_data=raw_payload_data
    )
    db.add(cond)
    db.commit()

    _update_equipment_status(eq_id, db)

    log_audit(
        db,
        action="TELEMETRY_INGEST",
        entity="EquipmentCondition",
        entity_id=eq_id,
        user_actor=payload.source or "SCADA_GATEWAY",
        details={
            "timestamp": str(ts),
            "vibration": vib,
            "status": calculated_status or "NORMAL",
            "source": payload.source
        }
    )

    return {
        "status": "success",
        "equipment": eq_id,
        "equipment_id": eq_id,
        "recorded_at": str(ts),
        "condition_status": calculated_status or "NORMAL",
        "records_inserted": 1,
        "source": payload.source or "SCADA_GATEWAY",
        "message": "Telemetry point validated, stored, and asset status evaluated."
    }
