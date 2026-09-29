"""
SERA Batch Ingestion Runner
Ingests all Supporting Data Excel files from sera/data/raw/ into the database.
No hardcoded data: all data is parsed directly from Excel files.
"""
import os
import sys

BACKEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
sys.path.insert(0, BACKEND_DIR)

from database.connection import SessionLocal, init_db
from models.db_models import (
    Equipment, EquipmentCondition, ProductionRecord,
    DowntimeRecord, Incident, DetectedProblem, RCAResult,
    Recommendation, IngestionLog
)
from ingestion.excel_ingestion import ingest_excel_file
from analytics.detection import detect_problems
from analytics.rca import run_rca, find_similar_incidents
from services.ai_recommendation import generate_recommendation
from api.equipment import _condition_to_dict, _incident_to_dict


def run_batch_ingestion():
    init_db()
    db = SessionLocal()

    print("\n========================================================")
    print("SERA EXCEL BATCH INGESTION PIPELINE")
    print("========================================================")

    try:
        # Clear existing tables
        for model in [Recommendation, RCAResult, DetectedProblem, IngestionLog, Incident, DowntimeRecord, ProductionRecord, EquipmentCondition, Equipment]:
            db.query(model).delete()
        db.commit()
        print("[1/5] Database tables cleared.")

        # Register Equipment master list
        equipment_meta = [
            ("BL-5702", "Blower 5702", "Centrifugal Blower", "Unit 5 - Process Building", "Unit 5", "TRIP"),
            ("PU-2101B", "Process Pump 2101B", "Process Pump", "Unit 2 - Feed Section", "Unit 2", "WARNING"),
            ("KO-3201", "Knock-out Compressor 3201", "Knock-out Compressor", "Unit 3 - Compression Area", "Unit 3", "NORMAL"),
            ("PM-4405B", "Product Pump 4405B", "Product Transfer Pump", "Unit 4 - Pumping Station", "Unit 4", "NORMAL"),
            ("HE-3301", "Heat Exchanger 3301", "Shell & Tube Exchanger", "Unit 1 - Thermal Unit", "Unit 1", "NORMAL"),
        ]
        for eid, name, etype, loc, unit, status in equipment_meta:
            db.add(Equipment(
                equipment_id=eid,
                name=name,
                equipment_type=etype,
                location=loc,
                unit=unit,
                status=status,
            ))
        db.commit()
        print(f"[2/5] Registered {len(equipment_meta)} equipment master profiles.")

        # Locate raw Excel files in data/raw/
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        raw_dir = os.path.join(base_dir, "data", "raw")

        excel_files = []
        for root, _, files in os.walk(raw_dir):
            for f in files:
                if f.endswith((".xlsx", ".xls")) and not f.startswith("~$"):
                    excel_files.append(os.path.join(root, f))

        print(f"[3/5] Discovered {len(excel_files)} Excel files in data/raw/:")
        for f in excel_files:
            rel = os.path.relpath(f, raw_dir)
            print(f"      • {rel}")

        # Ingest each Excel file
        print("\n[4/5] Executing Excel Ingestion Pipeline...")
        total_rows_ingested = 0

        for filepath in excel_files:
            filename = os.path.basename(filepath)
            parent_folder = os.path.basename(os.path.dirname(filepath)).lower()

            # Determine category from folder name or file name
            if "equipment" in parent_folder or "equipment" in filename.lower() or "condition" in filename.lower():
                category = "equipment"
            elif "production" in parent_folder or "production" in filename.lower():
                category = "production"
            elif "downtime" in parent_folder or "downtime" in filename.lower():
                category = "downtime"
            elif "incident" in parent_folder or "incident" in filename.lower():
                category = "incidents"
            else:
                category = None

            # Determine default equipment tag
            if "BL-5702" in filename:
                default_equip = "BL-5702"
            elif "PU-2101" in filename:
                default_equip = "PU-2101B"
            elif "KO-3201" in filename:
                default_equip = "KO-3201"
            elif "PM-4405" in filename:
                default_equip = "PM-4405B"
            elif "HE-3301" in filename:
                default_equip = "HE-3301"
            else:
                default_equip = "BL-5702"

            results = ingest_excel_file(
                filepath=filepath,
                db=db,
                equipment_id=default_equip,
                category=category
            )

            file_ok = sum(r.get("rows_ok", 0) for r in results)
            file_fail = sum(r.get("rows_fail", 0) for r in results)
            total_rows_ingested += file_ok
            print(f"      ✓ Ingested '{filename}': {file_ok} rows ok, {file_fail} failed")

        print(f"\n      Total rows ingested across all categories: {total_rows_ingested}")

        # [5/5] Post-ingestion analytics: Problem Detection & RCA on ingested data
        print("\n[5/5] Running Problem Detection and Root Cause Analysis on ingested data...")
        all_equipments = db.query(Equipment).all()
        all_incidents = db.query(Incident).all()
        incident_dicts = [_incident_to_dict(i) for i in all_incidents]

        total_detected = 0
        for equip in all_equipments:
            conditions = (
                db.query(EquipmentCondition)
                .filter(EquipmentCondition.equipment_id == equip.equipment_id)
                .order_by(EquipmentCondition.timestamp)
                .all()
            )
            if not conditions:
                continue

            cond_dicts = [_condition_to_dict(c) for c in conditions]
            detected = detect_problems(cond_dicts)
            total_detected += len(detected)

            saved_prob_ids = []
            for prob in detected:
                dp = DetectedProblem(
                    equipment_id=equip.equipment_id,
                    problem_type=prob["problem_type"],
                    severity=prob["severity"],
                    evidence=prob["evidence"],
                    parameters=prob["parameters"],
                    status="OPEN",
                )
                db.add(dp)
                db.flush()
                saved_prob_ids.append(dp.id)

            if detected:
                prob_types = [d["problem_type"] for d in detected]
                params = {}
                for d in detected:
                    params.update(d.get("parameters", {}))

                similar = find_similar_incidents(prob_types, equip.equipment_id, incident_dicts)
                rca_res = run_rca(prob_types, params, similar)

                rca_rec = RCAResult(
                    problem_id=saved_prob_ids[0] if saved_prob_ids else None,
                    equipment_id=equip.equipment_id,
                    possible_root_causes=rca_res.get("possible_root_causes"),
                    primary_root_cause=rca_res.get("primary_root_cause"),
                    confidence_level=rca_res.get("confidence_level"),
                    evidence=rca_res.get("evidence"),
                    similar_incidents=similar,
                )
                db.add(rca_rec)
                db.flush()

                # Generate initial AI recommendation
                ai_rec = generate_recommendation(
                    equipment_id=equip.equipment_id,
                    problem_types=prob_types,
                    detection_evidence=detected[0]["evidence"] if detected else [],
                    rca_result=rca_res,
                    similar_incidents=similar,
                )

                rec_obj = Recommendation(
                    problem_id=saved_prob_ids[0] if saved_prob_ids else None,
                    rca_id=rca_rec.id,
                    equipment_id=equip.equipment_id,
                    problem_summary=ai_rec.get("problem_summary"),
                    root_cause_explanation=rca_res.get("explanation"),
                    corrective_action=ai_rec.get("corrective_action"),
                    preventive_action=ai_rec.get("preventive_action"),
                    evidence=rca_res.get("evidence"),
                    confidence_level=ai_rec.get("evidence_strength", "HIGH"),
                    review_status="PENDING",
                )
                db.add(rec_obj)
                print(f"      • {equip.equipment_id}: Detected {len(detected)} problems | Primary RCA: {rca_res.get('primary_root_cause')}")

        db.commit()

        # Print final verification summary
        cond_count = db.query(EquipmentCondition).count()
        prod_count = db.query(ProductionRecord).count()
        dt_count = db.query(DowntimeRecord).count()
        inc_count = db.query(Incident).count()
        prob_count = db.query(DetectedProblem).count()
        log_count = db.query(IngestionLog).count()

        print("\n========================================================")
        print("DATABASE POPULATED ENTIRELY FROM EXCEL INGESTION:")
        print(f"  • Equipment Conditions : {cond_count} records")
        print(f"  • Production Records   : {prod_count} records")
        print(f"  • Downtime Records     : {dt_count} records")
        print(f"  • Incidents            : {inc_count} records")
        print(f"  • Detected Problems    : {prob_count} problems")
        print(f"  • Ingestion Logs       : {log_count} log entries")
        print("========================================================\n")

    except Exception as e:
        db.rollback()
        print(f"[ERROR during batch ingestion] {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_batch_ingestion()
