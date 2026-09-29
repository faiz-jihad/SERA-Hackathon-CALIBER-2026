"""
SERA API Verification Test Script
Tests all required endpoints of the FastAPI backend.
"""
import sys
import os

backend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_endpoints():
    print("\n--- 1. Testing GET / ---")
    r = client.get("/")
    assert r.status_code == 200, f"Root failed: {r.text}"
    print("✓ Root OK:", r.json())

    print("\n--- 2. Testing GET /api/dashboard/overview ---")
    r = client.get("/api/dashboard/overview")
    assert r.status_code == 200, f"Dashboard overview failed: {r.text}"
    data = r.json()
    print("✓ Dashboard Overview OK:")
    print(f"  Total equipment: {data['total_equipment']}")
    print(f"  Status summary: {data['status_summary']}")
    print(f"  Active problems: {data['active_problems']}")

    print("\n--- 3. Testing GET /api/equipment ---")
    r = client.get("/api/equipment")
    assert r.status_code == 200, f"List equipment failed: {r.text}"
    eqs = r.json()
    print(f"✓ Equipment List OK: {len(eqs)} items found")
    assert len(eqs) >= 1, "Expected at least 1 equipment"

    print("\n--- 4. Testing GET /api/equipment/BL-5702 ---")
    r = client.get("/api/equipment/BL-5702")
    assert r.status_code == 200, f"BL-5702 detail failed: {r.text}"
    bl = r.json()
    print("✓ BL-5702 Detail OK:")
    print(f"  Name: {bl['name']}, Status: {bl['status']}")
    print(f"  Total readings: {bl['total_readings']}")
    print(f"  Condition summary: {bl.get('condition_summary', {})}")

    print("\n--- 5. Testing GET /api/equipment/BL-5702/trend ---")
    r = client.get("/api/equipment/BL-5702/trend")
    assert r.status_code == 200, f"Trend failed: {r.text}"
    trend = r.json()
    print(f"✓ BL-5702 Trend OK: {len(trend.get('trend', []))} data points")

    print("\n--- 6. Testing GET /api/equipment/BL-5702/analysis ---")
    r = client.get("/api/equipment/BL-5702/analysis")
    assert r.status_code == 200, f"Analysis failed: {r.text}"
    analysis = r.json()
    print("✓ BL-5702 Analysis OK:")
    print(f"  Detected problems: {[p['problem_type'] for p in analysis.get('detected_problems', [])]}")
    print(f"  Primary RCA: {analysis.get('rca', {}).get('primary_root_cause')}")
    print(f"  RCA Confidence: {analysis.get('rca', {}).get('confidence_level')}")
    print(f"  Similar incidents: {len(analysis.get('similar_incidents', []))}")

    print("\n--- 7. Testing GET /api/incidents ---")
    r = client.get("/api/incidents")
    assert r.status_code == 200, f"Incidents failed: {r.text}"
    incs = r.json()
    print(f"✓ Incidents List OK: {len(incs)} incidents")

    print("\n--- 8. Testing POST /api/recommendation ---")
    r = client.post("/api/recommendation?equipment_id=BL-5702")
    assert r.status_code == 200, f"Create recommendation failed: {r.text}"
    rec = r.json()
    rec_id = rec.get("recommendation_id")
    print(f"✓ Recommendation Generated OK: ID={rec_id}")
    print(f"  Summary: {rec.get('problem_summary')[:60]}...")
    print(f"  Corrective Action: {rec.get('corrective_action')[:60]}...")
    print(f"  Preventive Action: {rec.get('preventive_action')[:60]}...")
    print(f"  Evidence Strength: {rec.get('confidence_level')}")

    print("\n--- 9. Testing POST /api/recommendation/{id}/review ---")
    r = client.post(
        f"/api/recommendation/{rec_id}/review",
        json={
            "review_status": "ACCEPTED",
            "engineer_notes": "Reviewed and approved by Chief Reliability Engineer.",
            "reviewed_by": "Eng. Budi",
            "final_action": "Schedule immediate laser alignment during weekend turnaround."
        }
    )
    assert r.status_code == 200, f"Review failed: {r.text}"
    review_res = r.json()
    print("✓ Engineer Review OK:")
    print(f"  Status: {review_res.get('review_status')}")
    print(f"  Reviewer: {review_res.get('reviewed_by')}")

    print("\n==========================================")
    print("ALL API ENDPOINTS TESTED AND PASSED 100%!")
    print("==========================================")

if __name__ == "__main__":
    test_endpoints()
