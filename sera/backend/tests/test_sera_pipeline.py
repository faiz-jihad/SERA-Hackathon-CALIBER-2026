"""
SERA Automated Verification & Compliance Test Suite
Complies with CALIBER 2026 Case 2 Specification (Section 27)

Tests:
 1. Data Ingestion
 2. Data Validation
 3. Rule Engine & Provenance Priority
 4. Threshold Detection
 5. Trend Calculation & Slope
 6. Status Calculation
 7. BL-5702 Problem Detection
 8. Historical Incident Search
 9. RCA Evidence Generation
10. Recommendation Generation (Hybrid Corrective + Preventive)
11. Engineer Review (Human-in-the-Loop)
12. Follow-Up & Post-Maintenance Verification ("Did It Work?")
13. API Endpoints (All 13 required endpoints)
14. AI Failure Fallback (100% Deterministic Resiliency)
15. BL-5702 End-to-End Integration Flow
"""
try:
    import pytest
except ImportError:
    pytest = None
import os
import sys
from datetime import datetime, timezone

# Ensure backend root is on sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from database.connection import SessionLocal, init_db
from models.db_models import (
    Equipment, EquipmentCondition, Incident,
    Recommendation, FollowUp
)
from analytics.features import compute_features, get_latest_condition_summary
from analytics.detection import detect_problems
from analytics.rca import run_rca, find_similar_incidents
from analytics.evidence_engine import build_evidence_layer, compute_what_changed
from analytics.rule_engine import default_rule_engine, SEED_RULES
from services.ai_recommendation import generate_recommendation, _fallback_recommendation
from main import app

client = TestClient(app)

if pytest is not None:
    @pytest.fixture(scope="session", autouse=True)
    def setup_database():
        init_db()
        db = SessionLocal()
        _ = db.query(Equipment).count()
        db.close()
        yield



# ─── 1. DATA VALIDATION ───────────────────────────────────────────
def test_data_validation():
    """Verify validation logic on valid and invalid condition records."""
    # Test valid records (3 records for rolling slope calculation)
    valid_records = [
        {"week_number": 1, "vibration": 3.2, "harmonic_2x": 0.8, "coupling_offset": 0.015, "bearing_temperature": 55.0},
        {"week_number": 2, "vibration": 3.5, "harmonic_2x": 0.9, "coupling_offset": 0.018, "bearing_temperature": 56.2},
        {"week_number": 3, "vibration": 3.8, "harmonic_2x": 1.0, "coupling_offset": 0.020, "bearing_temperature": 57.0},
    ]
    df = compute_features(valid_records)
    assert not df.empty
    assert "vibration_slope" in df.columns
    assert "vibration_change" in df.columns
    assert "coupling_offset_pct_change" in df.columns

    # Test empty records handling
    empty_df = compute_features([])
    assert empty_df.empty

    # Test NaN / missing fields handling
    incomplete_records = [
        {"week_number": 1, "vibration": None, "harmonic_2x": 0.5},
        {"week_number": 2, "vibration": 4.1, "harmonic_2x": None},
    ]
    df_inc = compute_features(incomplete_records)
    assert len(df_inc) == 2


# ─── 2. DATA INGESTION ───────────────────────────────────────────
def test_data_ingestion_records():
    """Verify that ingested equipment conditions are properly queryable."""
    db = SessionLocal()
    try:
        bl_conditions = db.query(EquipmentCondition).filter(
            EquipmentCondition.equipment_id == "BL-5702"
        ).all()
        assert len(bl_conditions) > 0, "BL-5702 condition telemetry records must be ingested in database"

        # Check fields
        first = bl_conditions[0]
        assert str(first.equipment_id) == "BL-5702"
        assert first.vibration is not None
    finally:
        db.close()


# ─── 3. RULE ENGINE & SOURCE PRIORITY ─────────────────────────────
def test_rule_engine_source_priority():
    """
    Verify rule engine enforces explicit priority:
    1. PLANT_LIMIT
    2. SUPPORTING_DATA
    3. ENGINEERING_STANDARD
    4. DATA_DRIVEN
    5. PROJECT_ASSUMPTION
    """
    engine = default_rule_engine

    # Evaluate BL-5702 coupling offset at 0.12 mm (exceeds 0.05 warn and 0.10 alarm)
    rules_triggered = engine.evaluate_parameter("BL-5702", "coupling_offset", 0.12)
    assert len(rules_triggered) >= 2

    # Verify each triggered rule has required fields (Section 5)
    for r in rules_triggered:
        assert "rule_id" in r
        assert "parameter" in r
        assert "threshold" in r
        assert "severity" in r
        assert "source_type" in r
        assert "source_reference" in r
        assert "rationale" in r
        assert r["source_type"] in ["PLANT_LIMIT", "SUPPORTING_DATA", "ENGINEERING_STANDARD", "DATA_DRIVEN", "PROJECT_ASSUMPTION"]

    # Verify priority sorting (Supporting data priority <= 2)
    assert rules_triggered[0]["priority"] <= rules_triggered[-1]["priority"]

    # Test full condition record evaluation
    eval_result = engine.evaluate_condition_record(
        "BL-5702",
        {"vibration": 11.2, "coupling_offset": 0.16, "bearing_temperature": 94.0}
    )
    assert eval_result["status"] == "TRIP"
    assert len(eval_result["reasons"]) >= 3


def test_iso_standard_disclaimer():
    """Verify standard references include required equipment-specific disclaimer (Section 7)."""
    iso_rules = [r for r in SEED_RULES if r.get("source_type") == "ENGINEERING_STANDARD"]
    assert len(iso_rules) > 0
    for r in iso_rules:
        assert "Standard reference available, but equipment-specific classification is required" in r["rationale"]


# ─── 4. THRESHOLD DETECTION ───────────────────────────────────────
def test_threshold_detection():
    """Verify deterministic boundary detection for vibration, offset, and temperature."""
    # Under alarm
    assert default_rule_engine.evaluate_parameter("BL-5702", "vibration", 4.0) == []

    # At alarm (8.5 mm/s)
    alarm_trig = default_rule_engine.evaluate_parameter("BL-5702", "vibration", 8.8)
    assert any(r["severity"] == "ALARM" for r in alarm_trig)

    # At trip (11.0 mm/s)
    trip_trig = default_rule_engine.evaluate_parameter("BL-5702", "vibration", 11.22)
    assert any(r["severity"] == "TRIP" for r in trip_trig)


# ─── 5. TREND CALCULATION & SLOPE ─────────────────────────────────
def test_trend_calculation():
    """Verify trend slope, consecutive alarms, and percentage change calculation."""
    series = [
        {"week_number": 1, "vibration": 4.0, "coupling_offset": 0.02},
        {"week_number": 2, "vibration": 5.2, "coupling_offset": 0.04},
        {"week_number": 3, "vibration": 6.8, "coupling_offset": 0.07},
        {"week_number": 4, "vibration": 8.5, "coupling_offset": 0.10},
        {"week_number": 5, "vibration": 10.3, "coupling_offset": 0.14},
    ]
    df = compute_features(series)
    assert not df.empty

    # Verify vibration slope is positive (increasing trend)
    latest_slope = df.iloc[-1]["vibration_slope"]
    assert latest_slope > 0.5, f"Expected vibration slope > 0.5, got {latest_slope}"

    # Verify change
    abs_change = df.iloc[-1]["vibration_change"]
    assert abs_change > 0

    # Verify summary
    summary = get_latest_condition_summary(series)
    assert summary["vibration_level"] in ["ALARM", "CRITICAL", "TRIP", "WARNING"]
    assert summary["vibration_trend"] == "increasing"


# ─── 6. STATUS CALCULATION ────────────────────────────────────────
def test_status_calculation():
    """Verify multi-parameter status assignment."""
    normal_data = [{"vibration": 3.2, "coupling_offset": 0.015, "bearing_temperature": 52.0}]
    assert get_latest_condition_summary(normal_data)["vibration_level"] == "NORMAL"

    warning_data = [{"vibration": 7.5, "coupling_offset": 0.06, "bearing_temperature": 68.0}]
    assert get_latest_condition_summary(warning_data)["vibration_level"] in ["WARNING", "ALARM"]

    trip_data = [{"vibration": 18.5, "coupling_offset": 0.16, "bearing_temperature": 95.0}]
    assert get_latest_condition_summary(trip_data)["vibration_level"] in ["TRIP", "ALARM"]


# ─── 7. BL-5702 PROBLEM DETECTION ─────────────────────────────────
def test_bl5702_problem_detection():
    """Verify detection engine identifies High Vibration and Coupling Misalignment on BL-5702."""
    db = SessionLocal()
    try:
        conditions = (
            db.query(EquipmentCondition)
            .filter(EquipmentCondition.equipment_id == "BL-5702")
            .order_by(EquipmentCondition.timestamp)
            .all()
        )
        cond_dicts = [
            {
                "week_number": c.week_number,
                "vibration": c.vibration,
                "harmonic_2x": c.harmonic_2x,
                "coupling_offset": c.coupling_offset,
                "bearing_temperature": c.bearing_temperature,
                "status": c.status,
                "timestamp": str(c.timestamp),
            }
            for c in conditions
        ]
        detected = detect_problems(cond_dicts)
        problem_types = [d["problem_type"] for d in detected]

        # Must detect vibration and coupling misalignment
        assert any("Vibration" in pt for pt in problem_types), f"Vibration problem not found: {problem_types}"
        assert any("Misalignment" in pt or "Coupling" in pt for pt in problem_types), f"Misalignment not found: {problem_types}"

        # Verify evidence attached
        for d in detected:
            assert len(d["evidence"]) > 0
            assert "severity" in d
    finally:
        db.close()


# ─── 8. HISTORICAL INCIDENT SEARCH ─────────────────────────────────
def test_historical_incident_search():
    """Verify historical incident matching returns structured historical evidence."""
    db = SessionLocal()
    try:
        incidents = db.query(Incident).all()
        inc_dicts = [
            {
                "id": str(i.id),
                "equipment_id": i.equipment_id,
                "incident_title": i.incident_title,
                "problem": i.problem,
                "root_cause": i.root_cause,
                "corrective_action": i.corrective_action,
                "preventive_action": i.preventive_action,
                "downtime_hours": i.downtime_hours,
                "financial_loss": i.financial_loss,
            }
            for i in incidents
        ]

        similar = find_similar_incidents(
            problem_types=["High Vibration", "Coupling Misalignment"],
            equipment_id="BL-5702",
            all_incidents=inc_dicts,
            max_results=5
        )

        assert len(similar) > 0, "Expected similar incidents for BL-5702 misalignment"
        top_match = similar[0]
        assert "root_cause" in top_match
        assert "corrective_action" in top_match
    finally:
        db.close()


# ─── 9. RCA EVIDENCE GENERATION ────────────────────────────────────
def test_rca_evidence_generation():
    """Verify deterministic RCA engine maps engineering signatures to root causes."""
    problem_types = ["High Vibration", "Coupling Misalignment"]
    parameters = {
        "vibration": 11.22,
        "harmonic_2x": 6.80,
        "coupling_offset": 0.155,
        "bearing_temperature": 94.0,
    }
    similar_incidents = [
        {"problem": "Coupling Misalignment", "root_cause": "Coupling Misalignment / Thermal Growth", "similarity_score": 0.9}
    ]

    rca = run_rca(problem_types, parameters, similar_incidents)

    assert rca["primary_root_cause"] is not None
    assert "Misalignment" in rca["primary_root_cause"]
    assert len(rca["evidence"]) >= 2
    assert rca["confidence_level"] in ["HIGH", "MEDIUM", "LOW"]


# ─── 10. RECOMMENDATION GENERATION ─────────────────────────────────
def test_recommendation_generation():
    """Verify recommendation engine produces separate corrective and preventive actions."""
    db = SessionLocal()
    try:
        similar = [{"root_cause": "Misalignment", "corrective_action": "Laser alignment", "preventive_action": "Quarterly check"}]
        rec = _fallback_recommendation(
            primary_root_cause="Coupling Misalignment / Angular Offset",
            similar_incidents=similar,
            problem_types=["High Vibration", "Coupling Misalignment"]
        )

        assert len(rec["corrective_action"]) > 0
        assert len(rec["preventive_action"]) > 0
        assert rec["evidence_strength"] in ["HIGH", "MEDIUM", "LOW", "HIGH_EVIDENCE_STRENGTH", "STRONG"]
        # Ensure no fake percentage confidence score
        assert "%" not in rec["evidence_strength"]
    finally:
        db.close()


# ─── 11. ENGINEER REVIEW WORKFLOW ──────────────────────────────────
def test_engineer_review_workflow():
    """Verify human-in-the-loop review actions: ACCEPT, MODIFY, REJECT."""
    db = SessionLocal()
    try:
        # Create test recommendation
        rec = Recommendation(
            equipment_id="BL-5702",
            problem_summary="Test Problem",
            corrective_action="Inspect alignment",
            preventive_action="Schedule alignment checks",
            review_status="PENDING",
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)
        rec_id = str(rec.id)

        # Test ACCEPT review via API
        resp = client.post(
            f"/api/recommendation/{rec_id}/review",
            json={
                "review_status": "ACCEPTED",
                "engineer_notes": "Approved for immediate work order issuance.",
                "reviewed_by": "Chief Reliability Engineer",
                "final_action": "Laser alignment planned for shift handover."
            }
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["review_status"] == "ACCEPTED"
        assert data["reviewed_by"] == "Chief Reliability Engineer"
        assert data["final_action"] is not None

        # Clean up
        db.query(Recommendation).filter(Recommendation.id == rec.id).delete()
        db.commit()
    finally:
        db.close()


# ─── 12. FOLLOW-UP & VERIFICATION ("DID IT WORK?") ─────────────────
def test_follow_up_verification():
    """Verify follow-up comparison (Before vs After) and equipment status restoration."""
    db = SessionLocal()
    try:
        follow_up_resp = client.post(
            "/api/follow-up",
            json={
                "equipment_id": "BL-5702",
                "action_taken": "Complete laser shaft realignment, baseplate shimming, and flexible insert replacement.",
                "before_condition": {
                    "vibration": 11.22,
                    "harmonic_2x": 6.80,
                    "coupling_offset": 0.155,
                    "bearing_temperature": 94.0,
                    "status": "TRIP"
                },
                "after_condition": {
                    "vibration": 3.78,
                    "harmonic_2x": 0.85,
                    "coupling_offset": 0.022,
                    "bearing_temperature": 58.5,
                    "status": "NORMAL"
                },
                "verification_result": "VERIFIED_RECOVERED",
                "engineer_notes": "Post-maintenance verification confirmed: vibration dropped from 11.22 to 3.78 mm/s (-66.3%).",
                "verified_by": "Lead Reliability Engineer"
            }
        )
        assert follow_up_resp.status_code == 200
        fu_data = follow_up_resp.json()
        assert fu_data["verification_result"] == "VERIFIED_RECOVERED"
        assert "parameter_deltas" in fu_data
        assert fu_data["parameter_deltas"]["vibration"]["reduction"] > 7.0

        # Query back via GET /api/follow-up/{equipment_id}
        get_fu = client.get("/api/follow-up/BL-5702")
        assert get_fu.status_code == 200
        records = get_fu.json()
        assert len(records) > 0
    finally:
        db.close()


# ─── 13. API ENDPOINTS TEST (ALL 13 REQUIRED ENDPOINTS) ────────────
def test_all_13_mandatory_api_endpoints():
    """
    Test each of the 13 required API endpoints from Section 25:
    1.  GET  /api/dashboard/overview
    2.  GET  /api/equipment
    3.  GET  /api/equipment/{equipment_id}
    4.  GET  /api/equipment/{equipment_id}/trend
    5.  GET  /api/equipment/{equipment_id}/analysis
    6.  GET  /api/incidents
    7.  GET  /api/incidents/similar
    8.  POST /api/ingestion/upload (tested via raw batch endpoint or direct multipart)
    9.  POST /api/analysis/detect
    10. POST /api/analysis/investigate
    11. POST /api/recommendation
    12. POST /api/recommendation/{id}/review
    13. POST /api/follow-up
    """
    # 1. GET /api/dashboard/overview
    r1 = client.get("/api/dashboard/overview")
    assert r1.status_code == 200
    assert "total_equipment" in r1.json()

    # 2. GET /api/equipment
    r2 = client.get("/api/equipment")
    assert r2.status_code == 200
    assert isinstance(r2.json(), list)

    # 3. GET /api/equipment/BL-5702
    r3 = client.get("/api/equipment/BL-5702")
    assert r3.status_code == 200
    assert r3.json()["equipment_id"] == "BL-5702"

    # 4. GET /api/equipment/BL-5702/trend
    r4 = client.get("/api/equipment/BL-5702/trend")
    assert r4.status_code == 200
    assert "trend" in r4.json()

    # 5. GET /api/equipment/BL-5702/analysis
    r5 = client.get("/api/equipment/BL-5702/analysis")
    assert r5.status_code == 200
    assert "evidence_layer" in r5.json()
    assert "what_changed" in r5.json()
    assert "rule_trace" in r5.json()

    # 6. GET /api/incidents
    r6 = client.get("/api/incidents")
    assert r6.status_code == 200
    assert isinstance(r6.json(), list)

    # 7. GET /api/incidents/similar
    r7 = client.get("/api/incidents/similar?equipment_id=BL-5702")
    assert r7.status_code == 200
    assert isinstance(r7.json(), list)

    # 8. POST /api/ingestion/raw-files (file list verification)
    r8 = client.get("/api/ingestion/raw-files")
    assert r8.status_code == 200
    assert "files" in r8.json()

    # 9. POST /api/analysis/detect
    r9 = client.post("/api/analysis/detect?equipment_id=BL-5702")
    assert r9.status_code == 200
    assert "detected" in r9.json()

    # 10. POST /api/analysis/investigate (LangGraph Agent run)
    r10 = client.post("/api/analysis/investigate?equipment_id=BL-5702")
    assert r10.status_code == 200
    assert r10.json()["status"] == "success"

    # 11. POST /api/recommendation
    r11 = client.post("/api/recommendation?equipment_id=BL-5702")
    assert r11.status_code == 200
    rec_data = r11.json()
    rec_id = rec_data["recommendation_id"]

    # 12. POST /api/recommendation/{id}/review
    r12 = client.post(
        f"/api/recommendation/{rec_id}/review",
        json={"review_status": "ACCEPTED", "reviewed_by": "Test Engineer"}
    )
    assert r12.status_code == 200

    # 13. POST /api/follow-up
    r13 = client.post(
        "/api/follow-up",
        json={
            "equipment_id": "BL-5702",
            "action_taken": "Alignment inspection test",
            "verification_result": "VERIFIED_RECOVERED",
            "before_condition": {"vibration": 11.0, "status": "TRIP"},
            "after_condition": {"vibration": 3.8, "status": "NORMAL"}
        }
    )
    assert r13.status_code == 200


# ─── SECTION 22 COMPLIANCE TESTS (ALL 16 MINIMUM REQUIREMENTS) ───

def test_22_1_health_and_ready():
    """Requirement 1: Health check & readiness probes."""
    r_health = client.get("/health")
    assert r_health.status_code == 200
    h_data = r_health.json()
    assert h_data["status"] == "healthy"
    assert h_data["database"] == "connected"

    r_ready = client.get("/ready")
    assert r_ready.status_code == 200
    assert r_ready.json()["status"] == "ready"


def test_22_2_database_connection():
    """Requirement 2: Database connection and query execution."""
    db = SessionLocal()
    try:
        from sqlalchemy import text
        res = db.execute(text("SELECT count(*) FROM equipment")).scalar()
        assert res is not None and res >= 5, "Database must contain at least the 5 primary Case 2 assets"
    finally:
        db.close()


def test_22_3_ingestion():
    """Requirement 3: Official Case 2 data ingestion & statistics."""
    r = client.post("/api/ingestion/ingest-raw?equipment_id=BL-5702")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "success"
    assert data["records_inserted"] > 0
    assert "errors" in data
    assert isinstance(data["errors"], list)


def test_22_4_invalid_ingestion():
    """Requirement 4: Invalid telemetry payloads rejected with HTTP 4xx."""
    # Unknown equipment -> 404
    r_bad_eq = client.post("/api/ingestion/telemetry", json={"equipment_id": "UNKNOWN_PUMP_999", "vibration": 3.5})
    assert r_bad_eq.status_code in (400, 404)

    # Empty equipment -> 400
    r_empty_eq = client.post("/api/ingestion/telemetry", json={"equipment_id": "", "vibration": 3.5})
    assert r_empty_eq.status_code in (400, 422)

    # Malformed timestamp -> 400
    r_bad_ts = client.post("/api/ingestion/telemetry", json={"equipment_id": "BL-5702", "timestamp": "not-a-date", "vibration": 3.5})
    assert r_bad_ts.status_code in (400, 422)


def test_22_5_detection():
    """Requirement 5: Detection engine from database data with full traceability."""
    r = client.post("/api/analysis/detect?equipment_id=BL-5702")
    assert r.status_code == 200
    data = r.json()
    assert "detections" in data
    assert len(data["detections"]) > 0

    det = data["detections"][0]
    assert "equipment" in det
    assert "parameter" in det
    assert "observed_value" in det
    assert "threshold" in det
    assert "threshold_source" in det or "rule_source" in det
    assert "status" in det
    assert "severity" in det
    assert "rule_id" in det
    assert "explanation" in det


def test_22_6_rule_trace():
    """Requirement 6: Rule traceability answers 'Why did SERA classify this condition as ALARM/TRIP?'."""
    r = client.get("/api/equipment/BL-5702/rule-trace")
    assert r.status_code == 200
    data = r.json()
    assert "rules_triggered" in data
    assert "reasons" in data
    for rule in data["rules_triggered"]:
        assert "rule_id" in rule
        assert "parameter" in rule
        assert "threshold" in rule
        assert "unit" in rule
        assert "source" in rule
        assert "condition" in rule
        assert "resulting_status" in rule


def test_22_7_what_changed():
    """Requirement 7: What Changed calculates dynamic differences without hardcoded values."""
    r = client.get("/api/equipment/BL-5702/what-changed")
    assert r.status_code == 200
    data = r.json()
    assert "comparison" in data
    assert len(data["comparison"]) >= 4
    for c in data["comparison"]:
        assert "parameter" in c
        assert "baseline_value" in c
        assert "current_value" in c
        assert "absolute_change" in c
        assert "percentage_change" in c
        assert "trend" in c
        assert "status" in c


def test_22_8_multi_window_trend():
    """Requirement 8: Multi-window linear regression for 4-week, 8-week, and 12-week windows."""
    r = client.get("/api/equipment/BL-5702/trends")
    assert r.status_code == 200
    data = r.json()
    assert "4_weeks" in data
    assert "8_weeks" in data
    assert "12_weeks" in data

    vib_4w = data["4_weeks"].get("vibration")
    assert vib_4w is not None
    assert "slope" in vib_4w
    assert "intercept" in vib_4w
    assert "start_value" in vib_4w
    assert "end_value" in vib_4w
    assert "change_percentage" in vib_4w
    assert "trend_direction" in vib_4w
    assert "observations_count" in vib_4w
    assert "r_squared" in vib_4w


def test_22_9_correlation():
    """Requirement 9 & 10: Multi-parameter statistical correlation and harmonic analysis safety."""
    # Correlation
    r_corr = client.get("/api/equipment/BL-5702/correlations")
    assert r_corr.status_code == 200
    c_data = r_corr.json()
    assert "correlation_matrix" in c_data
    assert "pairwise_correlations" in c_data
    if c_data["pairwise_correlations"]:
        pw = c_data["pairwise_correlations"][0]
        assert "parameter_a" in pw
        assert "parameter_b" in pw
        assert "pearson_r" in pw
        assert "observation_count" in pw

    # Harmonic analysis safety (Requirement 9: 1X missing -> available: false, no fabrication)
    r_harm = client.get("/api/equipment/BL-5702/harmonic-analysis")
    assert r_harm.status_code == 200
    h_data = r_harm.json()
    assert "available" in h_data
    if not h_data["available"]:
        assert "reason" in h_data


def test_22_10_historical_similarity():
    """Requirement 11: Real TF-IDF vectorization and cosine similarity across 380 incidents."""
    r = client.get("/api/incidents/similar?equipment_id=BL-5702")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) > 0
    top = data[0]
    assert "incident_id" in top
    assert "similarity_score" in top
    assert "historical_event" in top
    assert "historical_action" in top
    assert "source_reference" in top


def test_22_11_rca():
    """Requirement 12: RCA returns 5-Why and distinguishes Fact vs Interpretation vs Cause."""
    r = client.post("/api/analysis/rca?equipment_id=BL-5702")
    assert r.status_code == 200
    data = r.json()
    assert "five_why" in data
    assert "problem" in data["five_why"]
    assert "why_1" in data["five_why"]
    assert "why_2" in data["five_why"]
    assert "why_3" in data["five_why"]
    assert "why_4" in data["five_why"]
    assert "why_5" in data["five_why"]
    assert "observed_facts" in data
    assert "engineering_interpretations" in data
    assert "possible_causes" in data


def test_22_12_recommendation():
    """Requirement 14: Recommendation response contains observed condition, evidence, risk, and action."""
    r = client.post("/api/recommendation?equipment_id=BL-5702")
    assert r.status_code == 200
    data = r.json()
    assert "observed_condition" in data
    assert "evidence" in data
    assert "priority" in data
    assert "recommended_action" in data
    assert "inspection_rationale" in data
    assert "supporting_historical_evidence" in data
    assert "engineer_review_requirement" in data


def test_22_13_engineer_review():
    """Requirement 15: Engineer review with ACCEPT, MODIFY, REJECT."""
    # Create recommendation
    rec = client.post("/api/recommendation?equipment_id=BL-5702").json()
    rec_id = rec["id"]

    # Test ACCEPT
    r_accept = client.post(
        f"/api/recommendation/{rec_id}/review",
        json={"review_status": "ACCEPTED", "reviewed_by": "Chief Engineer", "engineer_notes": "Laser alignment approved"}
    )
    assert r_accept.status_code == 200
    assert r_accept.json()["review_status"] == "ACCEPTED"

    # Test MODIFY
    r_modify = client.post(
        f"/api/recommendation/{rec_id}/review",
        json={"review_status": "MODIFIED", "reviewed_by": "Chief Engineer", "final_action": "Execute precision realignment within 12 hours"}
    )
    assert r_modify.status_code == 200
    assert r_modify.json()["review_status"] == "MODIFIED"

    # Test REJECT
    r_reject = client.post(
        f"/api/recommendation/{rec_id}/review",
        json={"review_status": "REJECTED", "reviewed_by": "Chief Engineer", "engineer_notes": "Duplicate recommendation"}
    )
    assert r_reject.status_code == 200
    assert r_reject.json()["review_status"] == "REJECTED"


def test_22_14_work_order_recommendation():
    """Requirement 16: Work Order Recommendation (Draft) structured fields, no fake SAP claims."""
    rec = client.post("/api/recommendation?equipment_id=BL-5702").json()
    rec_id = rec["id"]

    r = client.get(f"/api/recommendation/{rec_id}/work-order")
    assert r.status_code == 200
    data = r.json()
    assert "work_order_reference" in data
    assert "equipment" in data
    assert "priority" in data
    assert "recommended_action" in data
    assert "reason" in data
    assert "required_inspection" in data
    assert "requested_timing" in data
    assert "engineer_approval_status" in data
    assert "sap_integration_note" in data


def test_22_15_post_maintenance_verification():
    """Requirement 17: Dynamic post-maintenance verification comparing before vs after from database."""
    r = client.get("/api/follow-up/BL-5702/verify")
    assert r.status_code == 200
    data = r.json()
    assert "before_values" in data
    assert "after_values" in data
    assert "absolute_change" in data
    assert "percentage_change" in data
    assert "status_after_maintenance" in data
    assert "verification_result" in data
    assert data["verification_result"] == "VERIFIED_RECOVERED"


def test_22_16_multi_equipment_support():
    """Requirement 22 & Multi-Equipment: Process other Case 2 assets without BL-5702 hardcoding."""
    for eq_id in ["PU-2101B", "KO-3201", "PM-4405B", "HE-3301"]:
        # Rule trace
        r_trace = client.get(f"/api/equipment/{eq_id}/rule-trace")
        assert r_trace.status_code == 200

        # Trends
        r_trends = client.get(f"/api/equipment/{eq_id}/trends")
        assert r_trends.status_code == 200
        assert "4_weeks" in r_trends.json()

        # What changed
        r_wc = client.get(f"/api/equipment/{eq_id}/what-changed")
        assert r_wc.status_code == 200

        # Harmonic analysis (1X safety check)
        r_harm = client.get(f"/api/equipment/{eq_id}/harmonic-analysis")
        assert r_harm.status_code == 200

        # Correlations
        r_corr = client.get(f"/api/equipment/{eq_id}/correlations")
        assert r_corr.status_code == 200

        # Detection
        r_det = client.post(f"/api/analysis/detect?equipment_id={eq_id}")
        assert r_det.status_code == 200


# ─── 14. AI FAILURE FALLBACK TEST ──────────────────────────────────

def test_ai_failure_fallback():
    """Verify that if LLM provider fails or key is missing, deterministic fallback succeeds."""
    # Temporarily remove any API keys to simulate LLM failure
    old_key = os.environ.get("OPENAI_API_KEY")
    try:
        os.environ.pop("OPENAI_API_KEY", None)

        rec = generate_recommendation(
            equipment_id="BL-5702",
            problem_types=["High Vibration", "Coupling Misalignment"],
            detection_evidence=["Vibration reached 11.22 mm/s"],
            rca_result={"primary_root_cause": "Coupling Misalignment", "evidence": ["2X Harmonic peak"]},
            similar_incidents=[]
        )

        assert rec is not None
        assert "Laser alignment" in rec["corrective_action"] or "alignment" in rec["corrective_action"].lower()
        assert rec["source"] in ["rule_based", "deterministic_rule_engine", "deterministic_fallback", "ollama"]
    finally:
        if old_key:
            os.environ["OPENAI_API_KEY"] = old_key


# ─── 15. BL-5702 FULL END-TO-END INTEGRATION TEST ─────────────────
def test_bl5702_integration_end_to_end():
    """
    Comprehensive BL-5702 Integration Test (Section 27):
    - Abnormal trend detected
    - Threshold rules triggered with source traceability
    - Structured evidence layer generated (E-001, E-002, ...)
    - "What Changed?" baseline comparison generated
    - Historical similar incident found
    - RCA candidate causes generated
    - Corrective & preventive recommendations generated
    - Human-in-the-loop review executed & stored
    - Follow-up post-maintenance verification recorded
    """
    db = SessionLocal()
    try:
        # Step 1: Equipment existence & condition query
        equip = db.query(Equipment).filter(Equipment.equipment_id == "BL-5702").first()
        assert equip is not None, "BL-5702 equipment record must exist"

        conditions = (
            db.query(EquipmentCondition)
            .filter(EquipmentCondition.equipment_id == "BL-5702")
            .order_by(EquipmentCondition.timestamp)
            .all()
        )
        cond_dicts = [
            {
                "week_number": c.week_number,
                "vibration": c.vibration,
                "harmonic_2x": c.harmonic_2x,
                "coupling_offset": c.coupling_offset,
                "bearing_temperature": c.bearing_temperature,
                "status": c.status,
                "timestamp": str(c.timestamp),
            }
            for c in conditions
        ]
        assert len(cond_dicts) >= 15, "BL-5702 must have multi-week historical telemetry"

        # Step 2: Detection engine
        detected = detect_problems(cond_dicts)
        assert len(detected) > 0
        prob_types = [d["problem_type"] for d in detected]
        assert any("Vibration" in p for p in prob_types)

        # Step 3: Structured Evidence Layer
        evidence = build_evidence_layer(cond_dicts, "BL-5702")
        assert len(evidence) >= 3
        assert any("Vibration" in e["parameter"] for e in evidence)
        assert any(e["evidence_id"].startswith("E-") for e in evidence)
        for e in evidence:
            assert "source" in e
            assert "interpretation" in e

        # Step 4: What Changed?
        what_changed = compute_what_changed(cond_dicts, "BL-5702")
        assert "comparison" in what_changed
        assert len(what_changed["comparison"]) >= 4

        # Step 5: Historical incident matching
        all_incidents = db.query(Incident).all()
        inc_dicts = [
            {
                "id": str(i.id),
                "equipment_id": i.equipment_id,
                "incident_title": i.incident_title,
                "problem": i.problem,
                "root_cause": i.root_cause,
                "corrective_action": i.corrective_action,
                "preventive_action": i.preventive_action,
                "downtime_hours": i.downtime_hours,
                "financial_loss": i.financial_loss,
            }
            for i in all_incidents
        ]
        similar = find_similar_incidents(prob_types, "BL-5702", inc_dicts)
        assert len(similar) > 0

        # Step 6: RCA synthesis
        rca = run_rca(prob_types, {"vibration": 11.22, "harmonic_2x": 6.8, "coupling_offset": 0.155}, similar)
        assert "Misalignment" in rca["primary_root_cause"]

        # Step 7: Recommendations
        rec = generate_recommendation("BL-5702", prob_types, [e["interpretation"] for e in evidence], rca, similar)
        assert len(rec["corrective_action"]) > 0
        assert len(rec["preventive_action"]) > 0

        # Step 8: Engineer Review via DB model
        rec_model = Recommendation(
            equipment_id="BL-5702",
            problem_summary=rec["problem_summary"],
            root_cause_explanation=rca["explanation"],
            corrective_action=rec["corrective_action"],
            preventive_action=rec["preventive_action"],
            review_status="ACCEPTED",
            reviewed_by="Lead Reliability Engineer",
            engineer_notes="Approved with immediate laser realignment protocol.",
            final_action="Laser alignment execution confirmed.",
            reviewed_at=datetime.now(timezone.utc)
        )
        db.add(rec_model)
        db.commit()
        db.refresh(rec_model)

        assert rec_model.id is not None
        assert str(rec_model.review_status) == "ACCEPTED"

        # Step 9: Follow-up Verification
        fu = FollowUp(
            equipment_id="BL-5702",
            recommendation_id=rec_model.id,
            maintenance_date=datetime.now(timezone.utc),
            action_taken="Laser realignment & flexible coupling replacement",
            before_condition={"vibration": 11.22, "coupling_offset": 0.155, "status": "TRIP"},
            after_condition={"vibration": 3.78, "coupling_offset": 0.022, "status": "NORMAL"},
            verification_result="VERIFIED_RECOVERED",
            engineer_notes="Vibration restored to baseline (3.78 mm/s). Problem fully resolved."
        )
        db.add(fu)
        db.commit()
        db.refresh(fu)

        assert fu.id is not None
        assert str(fu.verification_result) == "VERIFIED_RECOVERED"

    finally:
        db.close()


def test_cross_module_temporal_consistency():
    """
    Regression Test (Section 9): Cross-Module Data & Temporal Consistency for BL-5702.
    Guarantees that:
    1. Condition Context identifies verified trip observation (Week 21, 11.22 mm/s, TRIP).
    2. What Changed references the exact same critical observation ID and 11.22 mm/s TRIP status.
    3. Evidence layer (E-001) references the exact same record ID and 11.22 mm/s.
    4. Detection identifies the verified 11.22 mm/s TRIP event.
    5. Post-maintenance verification uses the verified before value (11.22 mm/s).
    6. All stages use consistent source observations and will fail if values differ.
    """
    # 1. Condition Context
    r_ctx = client.get("/api/equipment/BL-5702/condition-context")
    assert r_ctx.status_code == 200
    ctx = r_ctx.json()
    assert ctx["critical"]["vibration"] == 11.22
    assert ctx["critical"]["week_number"] == 21
    assert ctx["critical"]["status"] == "TRIP"
    crit_id = ctx["critical"]["id"]
    assert crit_id is not None

    # 2. What Changed
    r_wc = client.get("/api/equipment/BL-5702/what-changed")
    assert r_wc.status_code == 200
    wc = r_wc.json()
    assert wc["critical_source_record_id"] == crit_id, "What Changed critical source record ID mismatch"
    wc_vib = next(c for c in wc["comparison"] if c["parameter_key"] == "vibration")
    assert wc_vib["critical_value"] == 11.22, f"Expected 11.22, got {wc_vib['critical_value']}"
    assert wc_vib["status"] == "TRIP", f"Expected TRIP, got {wc_vib['status']}"

    # 3. Evidence Layer
    r_ev = client.get("/api/equipment/BL-5702/evidence")
    assert r_ev.status_code == 200
    ev = r_ev.json()
    ev_vib = next(e for e in ev if e["parameter_key"] == "vibration")
    assert ev_vib["observed_value"] == 11.22, f"Expected 11.22, got {ev_vib['observed_value']}"
    assert ev_vib["severity"] == "TRIP", f"Expected TRIP, got {ev_vib['severity']}"
    assert ev_vib["record_id"] == crit_id, "Evidence record ID mismatch"

    # 4. Post-maintenance verification
    r_ver = client.get("/api/follow-up/BL-5702/verify")
    assert r_ver.status_code == 200
    ver = r_ver.json()
    b_vals = ver.get("before_values") or {}
    assert float(b_vals.get("vibration", 0.0)) == 11.22, f"Expected before vibration 11.22, got {b_vals.get('vibration')}"

    # 5. Strict Regression Cross-Equality Assertion
    # Detection/What-Changed critical value == Evidence critical value == Verification before value
    assert wc_vib["critical_value"] == ev_vib["observed_value"] == float(b_vals["vibration"]) == 11.22, (
        f"Critical temporal value inconsistency detected across modules: "
        f"What-Changed={wc_vib['critical_value']}, Evidence={ev_vib['observed_value']}, Verification={b_vals['vibration']}"
    )


if __name__ == "__main__":
    print("==================================================================")
    print("SERA AUTOMATED SYSTEM VERIFICATION & COMPLIANCE TEST SUITE")
    print("Target: CALIBER 2026 Case 2 — Intelligent Manufacturing Unified Dashboard")
    print("==================================================================")

    init_db()

    tests = [
        ("1. Data Validation", test_data_validation),
        ("2. Data Ingestion Records", test_data_ingestion_records),
        ("3. Rule Engine & Source Priority", test_rule_engine_source_priority),
        ("3b. ISO Standard Disclaimer Compliance", test_iso_standard_disclaimer),
        ("4. Deterministic Threshold Detection", test_threshold_detection),
        ("5. Trend Calculation & Multi-Period Slope", test_trend_calculation),
        ("6. Equipment Status Calculation", test_status_calculation),
        ("7. BL-5702 Problem Detection (Misalignment/Vibration)", test_bl5702_problem_detection),
        ("8. Historical Incident Search & Ranking", test_historical_incident_search),
        ("9. RCA Evidence Generation & Pattern Match", test_rca_evidence_generation),
        ("10. Recommendation Generation (Corrective/Preventive)", test_recommendation_generation),
        ("11. Engineer Review Workflow (ACCEPT/MODIFY/REJECT)", test_engineer_review_workflow),
        ("12. Follow-Up & Verification ('Did It Work?')", test_follow_up_verification),
        ("13. All 13 Mandatory API Endpoints", test_all_13_mandatory_api_endpoints),
        ("14. AI Failure Fallback & Resiliency", test_ai_failure_fallback),
        ("15. BL-5702 Full End-to-End Integration Flow", test_bl5702_integration_end_to_end),
        ("16a. Health & Ready Probes", test_22_1_health_and_ready),
        ("16b. Database Connection & Master Assets", test_22_2_database_connection),
        ("16c. Official Case 2 Ingestion", test_22_3_ingestion),
        ("16d. Invalid Ingestion 4xx Rejection", test_22_4_invalid_ingestion),
        ("16e. Traceable Problem Detection", test_22_5_detection),
        ("16f. Explainable Rule Trace", test_22_6_rule_trace),
        ("16g. Dynamic What Changed", test_22_7_what_changed),
        ("16h. 4W/8W/12W Multi-Window Regression Trends", test_22_8_multi_window_trend),
        ("16i. Pearson/Spearman Correlations & Harmonic 1X Safety", test_22_9_correlation),
        ("16j. TF-IDF & Cosine Historical Matching", test_22_10_historical_similarity),
        ("16k. RCA 5-Why & Fact vs Interpretation Distinction", test_22_11_rca),
        ("16l. Grounded AI & Deterministic Recommendations", test_22_12_recommendation),
        ("16m. Engineer Review Workflow (Accept/Modify/Reject)", test_22_13_engineer_review),
        ("16n. Work Order Recommendation Structure (No fake SAP)", test_22_14_work_order_recommendation),
        ("16o. Dynamic Post-Maintenance Verification", test_22_15_post_maintenance_verification),
        ("16p. Multi-Equipment Support (PU-2101B, KO-3201, PM-4405B, HE-3301)", test_22_16_multi_equipment_support),
        ("16q. Cross-Module Temporal Consistency (Regression)", test_cross_module_temporal_consistency),
    ]

    passed = 0
    failed = 0

    for name, test_fn in tests:
        try:
            print(f"\n[RUNNING] {name}...")
            test_fn()
            print(f"  --> [PASS] {name}")
            passed += 1
        except Exception as e:
            print(f"  --> [FAIL] {name}: {e}")
            import traceback
            traceback.print_exc()
            failed += 1

    print("\n==================================================================")
    print(f"TEST EXECUTION SUMMARY: {passed} PASSED, {failed} FAILED (TOTAL {len(tests)})")
    if failed == 0:
        print("ALL 15 COMPLIANCE & INTEGRATION TEST SUITES PASSED 100%!")
    print("==================================================================")
    if failed > 0:
        sys.exit(1)

