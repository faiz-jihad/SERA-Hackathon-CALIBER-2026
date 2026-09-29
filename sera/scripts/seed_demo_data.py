"""
SERA Seed Script — Creates demo data for BL-5702 based on realistic progressive deterioration
Run this when no Supporting Data Excel is available, or to pre-populate with demo data.

Usage:
  cd sera/backend
  python -m scripts.seed_demo_data
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))

from datetime import datetime, timedelta, date
from database.connection import SessionLocal, init_db
from models.db_models import Equipment, EquipmentCondition, DowntimeRecord, Incident, ProductionRecord

def seed():
    init_db()
    db = SessionLocal()
    try:
        # Clear existing demo data
        for model in [Incident, DowntimeRecord, ProductionRecord, EquipmentCondition, Equipment]:
            db.query(model).delete()
        db.commit()

        # ─── Register BL-5702 ───
        bl5702 = Equipment(
            equipment_id="BL-5702",
            name="Blower 5702",
            equipment_type="Centrifugal Blower",
            location="Unit 5 - Process Building",
            unit="Unit 5",
            status="TRIP",
        )
        db.add(bl5702)

        # Additional equipment
        for eid, name, loc, status in [
            ("CP-3301", "Compressor 3301", "Unit 3 - Compression Area", "NORMAL"),
            ("PP-2101", "Process Pump 2101", "Unit 2 - Feed Section", "WARNING"),
            ("FN-4402", "Fan 4402", "Unit 4 - Cooling Tower", "NORMAL"),
            ("AG-1501", "Agitator 1501", "Unit 1 - Reactor", "NORMAL"),
        ]:
            db.add(Equipment(
                equipment_id=eid,
                name=name,
                equipment_type=name.split(" ")[0],
                location=loc,
                status=status,
            ))

        db.commit()

        # ─── BL-5702 Condition Data (Week 1-26, realistic deterioration) ───
        # Phase 1 (Wk 1-10): NORMAL
        # Phase 2 (Wk 11-18): WARNING → ALARM
        # Phase 3 (Wk 19-22): ALARM → degradation
        # Phase 4 (Wk 23-24): TRIP / FAILURE
        # Phase 5 (Wk 25-26): Recovery

        base_date = datetime(2024, 1, 1)

        week_data = [
            # wk, vib,  2x,   coupling, bearing_temp, status
            (1,  4.12, 1.02, 0.008, 58.2, "NORMAL"),
            (2,  4.25, 1.05, 0.009, 58.5, "NORMAL"),
            (3,  4.18, 1.08, 0.010, 59.0, "NORMAL"),
            (4,  4.32, 1.10, 0.012, 59.3, "NORMAL"),
            (5,  4.55, 1.15, 0.014, 60.0, "NORMAL"),
            (6,  5.10, 1.22, 0.018, 61.2, "NORMAL"),
            (7,  5.82, 1.35, 0.025, 63.0, "NORMAL"),
            (8,  6.20, 1.48, 0.031, 64.5, "NORMAL"),
            (9,  6.75, 1.62, 0.038, 66.2, "NORMAL"),
            (10, 6.98, 1.80, 0.042, 67.5, "NORMAL"),
            (11, 7.25, 2.10, 0.052, 69.8, "WARNING"),
            (12, 7.80, 2.45, 0.065, 71.2, "WARNING"),
            (13, 8.20, 2.88, 0.078, 73.5, "WARNING"),
            (14, 8.50, 3.12, 0.085, 74.8, "ALARM"),
            (15, 8.92, 3.55, 0.092, 76.2, "ALARM"),
            (16, 9.12, 3.80, 0.098, 78.0, "ALARM"),
            (17, 9.45, 4.10, 0.105, 79.5, "ALARM"),
            (18, 10.20, 4.85, 0.118, 82.0, "ALARM"),
            (19, 11.30, 5.62, 0.128, 85.5, "ALARM"),
            (20, 12.80, 6.20, 0.142, 88.2, "ALARM"),
            (21, 14.50, 7.15, 0.155, 90.8, "CRITICAL"),
            (22, 16.20, 8.02, 0.168, 93.2, "TRIP"),
        ]

        for wk, vib, h2x, coupling, temp, status in week_data:
            ts = base_date + timedelta(weeks=wk - 1)
            db.add(EquipmentCondition(
                equipment_id="BL-5702",
                timestamp=ts,
                week_number=wk,
                vibration=vib,
                harmonic_2x=h2x,
                coupling_offset=coupling,
                bearing_temperature=temp,
                motor_temperature=temp - 8.0,
                status=status,
                raw_data={"week": wk, "source": "demo"},
            ))

        # ─── Production data for BL-5702 ───
        prod_data = [
            (1, 850, 4.2, 125, "RUNNING"),
            (10, 845, 4.3, 124, "RUNNING"),
            (14, 820, 4.5, 122, "RUNNING"),
            (18, 790, 4.8, 115, "RUNNING"),
            (22, 740, 5.2, 108, "RUNNING"),
        ]
        for wk, rate, pressure, feed, rstat in prod_data:
            ts = base_date + timedelta(weeks=wk - 1)
            db.add(ProductionRecord(
                equipment_id="BL-5702",
                timestamp=ts,
                production_rate=rate,
                pressure=pressure,
                feed=feed,
                run_status=rstat,
            ))

        # ─── Downtime Record ───
        db.add(DowntimeRecord(
            equipment_id="BL-5702",
            start_time=base_date + timedelta(weeks=20),
            end_time=base_date + timedelta(weeks=20, hours=18),
            duration_hours=18,
            downtime_type="UNPLANNED",
            cause="High vibration warning inspection",
            production_loss=15300,
            financial_loss=45900,
        ))

        # ─── Historical Incidents for BL-5702 ───
        incidents = [
            {
                "equipment_id": "BL-5702",
                "incident_date": date(2022, 3, 15),
                "incident_title": "High Vibration — Trip Event",
                "problem": "Excessive vibration leading to equipment trip",
                "root_cause": "Coupling misalignment due to thermal expansion after piping modification",
                "root_cause_category": "MECHANICAL",
                "downtime_hours": 48.0,
                "production_loss": 40800.0,
                "financial_loss": 122400.0,
                "corrective_action": "Performed precision laser alignment on coupling. Replaced coupling insert. Reset soft-foot.",
                "preventive_action": "Implement quarterly laser alignment checks. Monitor vibration trend weekly.",
                "severity": "HIGH",
            },
            {
                "equipment_id": "BL-5702",
                "incident_date": date(2021, 8, 22),
                "incident_title": "Bearing Overtemperature",
                "problem": "DE bearing temperature exceeded 90°C during operation",
                "root_cause": "Lubrication deficiency — grease interval exceeded",
                "root_cause_category": "MECHANICAL",
                "downtime_hours": 12.0,
                "production_loss": 10200.0,
                "financial_loss": 30600.0,
                "corrective_action": "Replaced DE bearing. Replenished grease to specification. Inspected NDE bearing — acceptable.",
                "preventive_action": "Implement 3-monthly lubrication schedule. Install bearing temperature transmitter with DCS alarm.",
                "severity": "MEDIUM",
            },
            {
                "equipment_id": "BL-5702",
                "incident_date": date(2020, 5, 10),
                "incident_title": "Rotor Unbalance — High 1X Vibration",
                "problem": "Elevated 1X vibration component — rotor unbalance detected",
                "root_cause": "Material buildup on impeller blades causing dynamic imbalance",
                "root_cause_category": "MECHANICAL",
                "downtime_hours": 24.0,
                "production_loss": 20400.0,
                "financial_loss": 61200.0,
                "corrective_action": "Cleaned impeller blades. Performed on-site dynamic balancing. Balanced to ISO 1940 G2.5.",
                "preventive_action": "Schedule impeller inspection and cleaning every 6 months. Implement vibration spectrum analysis trend.",
                "severity": "MEDIUM",
            },
            {
                "equipment_id": "BL-5702",
                "incident_date": date(2023, 11, 5),
                "incident_title": "2X Harmonic — Foundation Looseness",
                "problem": "Elevated 2X vibration component — mechanical looseness investigation",
                "root_cause": "Foundation bolt looseness on NDE side bearing housing",
                "root_cause_category": "MECHANICAL",
                "downtime_hours": 8.0,
                "production_loss": 6800.0,
                "financial_loss": 20400.0,
                "corrective_action": "Torqued all foundation bolts to 120 Nm specification. Verified soft-foot.",
                "preventive_action": "Include foundation bolt torque verification in 6-monthly PM checklist.",
                "severity": "LOW",
            },
            # Incidents from other equipment (for cross-equipment learning)
            {
                "equipment_id": "CP-3301",
                "incident_date": date(2023, 4, 18),
                "incident_title": "Coupling Misalignment — High Vibration",
                "problem": "High vibration with elevated 2X harmonic — misalignment signature",
                "root_cause": "Coupling misalignment due to pipe strain after process modification",
                "root_cause_category": "MECHANICAL",
                "downtime_hours": 36.0,
                "production_loss": 30600.0,
                "financial_loss": 91800.0,
                "corrective_action": "Performed 3-plane laser alignment. Realigned piping supports. Replaced coupling flexelement.",
                "preventive_action": "Periodic laser alignment every 6 months or after any piping work.",
                "severity": "HIGH",
            },
            {
                "equipment_id": "PP-2101",
                "incident_date": date(2022, 9, 12),
                "incident_title": "Bearing Failure — Overtemperature",
                "problem": "DE bearing temperature exceeded 95°C — bearing failure",
                "root_cause": "Bearing lubrication failure — contaminated lubricant",
                "root_cause_category": "MECHANICAL",
                "downtime_hours": 20.0,
                "production_loss": 17000.0,
                "financial_loss": 51000.0,
                "corrective_action": "Replaced DE and NDE bearings. Flushed lubricant system. Replaced oil with fresh stock.",
                "preventive_action": "Implement oil analysis program. Sample oil every 6 months.",
                "severity": "MEDIUM",
            },
        ]

        for inc_data in incidents:
            db.add(Incident(**inc_data))

        db.flush()

        # ─── Automatically seed Detection, RCA, and AI Recommendation for BL-5702 ───
        from analytics.detection import detect_problems
        from analytics.rca import run_rca, find_similar_incidents
        from services.ai_recommendation import generate_recommendation
        from models.db_models import DetectedProblem, RCAResult, Recommendation

        cond_dicts = [
            {
                "timestamp": str(base_date + timedelta(weeks=wk - 1)),
                "week_number": wk,
                "vibration": vib,
                "harmonic_2x": h2x,
                "coupling_offset": coupling,
                "bearing_temperature": temp,
                "status": status,
            }
            for wk, vib, h2x, coupling, temp, status in week_data
        ]

        detected_list = detect_problems(cond_dicts)
        saved_problem_ids = []
        for prob in detected_list:
            dp = DetectedProblem(
                equipment_id="BL-5702",
                problem_type=prob["problem_type"],
                severity=prob["severity"],
                evidence=prob["evidence"],
                parameters=prob["parameters"],
                status="OPEN",
            )
            db.add(dp)
            db.flush()
            saved_problem_ids.append(dp.id)

        prob_types = [d["problem_type"] for d in detected_list]
        parameters = {}
        for d in detected_list:
            parameters.update(d.get("parameters", {}))

        similar = find_similar_incidents(prob_types, "BL-5702", incidents)
        rca_res = run_rca(prob_types, parameters, similar)

        rca_record = RCAResult(
            problem_id=saved_problem_ids[0] if saved_problem_ids else None,
            equipment_id="BL-5702",
            possible_root_causes=rca_res.get("possible_root_causes"),
            primary_root_cause=rca_res.get("primary_root_cause"),
            confidence_level=rca_res.get("confidence_level"),
            evidence=rca_res.get("evidence"),
            similar_incidents=similar,
        )
        db.add(rca_record)
        db.flush()

        ai_rec = generate_recommendation(
            equipment_id="BL-5702",
            problem_types=prob_types,
            detection_evidence=detected_list[0]["evidence"] if detected_list else [],
            rca_result=rca_res,
            similar_incidents=similar,
        )

        rec_record = Recommendation(
            problem_id=saved_problem_ids[0] if saved_problem_ids else None,
            rca_id=rca_record.id,
            equipment_id="BL-5702",
            problem_summary=ai_rec.get("problem_summary"),
            root_cause_explanation=rca_res.get("explanation"),
            corrective_action=ai_rec.get("corrective_action"),
            preventive_action=ai_rec.get("preventive_action"),
            evidence=rca_res.get("evidence"),
            confidence_level=ai_rec.get("evidence_strength", "HIGH"),
            review_status="PENDING",
        )
        db.add(rec_record)

        db.commit()
        print("[SEED] Demo data created successfully!")
        print(f"[SEED] Equipment: BL-5702 (ALARM), CP-3301, PP-2101, FN-4402, AG-1501")
        print(f"[SEED] BL-5702: 22 weeks of condition data with active ALARM deterioration")
        print(f"[SEED] Active Detected Problems: {len(saved_problem_ids)}")
        print(f"[SEED] RCA Result: {rca_res.get('primary_root_cause')} (Confidence: {rca_res.get('confidence_level')})")
        print(f"[SEED] Incidents: {len(incidents)} historical incidents loaded")

    except Exception as e:
        db.rollback()
        print(f"[SEED ERROR] {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
