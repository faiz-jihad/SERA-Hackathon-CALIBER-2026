"""
Ingestion API — Upload Excel files for data ingestion
"""
import os
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from database.connection import get_db
from ingestion.excel_ingestion import ingest_excel_file

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
    if not file.filename.endswith((".xlsx", ".xls")):
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
def trigger_raw_batch_ingestion():
    """Trigger the complete batch ingestion runner on official Case 2 datasets."""
    try:
        import sys
        scripts_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "scripts")
        if scripts_dir not in sys.path:
            sys.path.insert(0, scripts_dir)
        import ingest_official_caliber_data
        ingest_official_caliber_data.run_ingestion()
        return {
            "status": "success",
            "message": "Official CALIBER Case 2 ingestion pipeline completed successfully. All database tables updated.",
        }
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
    if latest.status:
        status = latest.status.upper()
        if status in ("NORMAL", "WARNING", "ALARM", "CRITICAL", "TRIP"):
            db.query(Equipment).filter(Equipment.equipment_id == equipment_id).update(
                {"status": status}
            )
            db.commit()
            return

    # Compute from vibration
    vib = latest.vibration
    if vib is not None:
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
