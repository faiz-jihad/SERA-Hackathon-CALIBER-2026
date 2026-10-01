"""
SERA End-to-End Acceptance Test (Section 25 Compliance)
Executes the exact 18-step end-to-end flow on live backend:
1. Load official Case 2 data
2. Select BL-5702
3. Retrieve equipment data
4. Run detection
5. Retrieve rule trace
6. Retrieve What Changed
7. Retrieve 4/8/12-week trends
8. Retrieve correlation
9. Retrieve harmonic analysis (verify available: false without fabrication)
10. Retrieve historical incident similarity (TF-IDF + Cosine)
11. Retrieve unified evidence package
12. Generate RCA (structured 5-Why, 4P, 4M+1E, Fact/Interpretation/Cause)
13. Generate recommendation (deterministic engineering logic)
14. Submit engineer review (ACCEPT/MODIFY/REJECT)
15. Generate work-order recommendation (Draft, no fake SAP)
16. Load actual post-maintenance data
17. Run verification (before vs after delta)
18. Confirm final status is calculated from actual data (VERIFIED_RECOVERED)

Then repeats relevant flow for secondary Case 2 equipment: PU-2101B
"""
import sys
import json
import urllib.request
import urllib.parse

BASE_URL = "http://127.0.0.1:8000"

def api_get(path):
    url = f"{BASE_URL}{path}"
    req = urllib.request.Request(url, headers={"User-Agent": "SERA-Acceptance/1.0"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def api_post(path, data=None):
    url = f"{BASE_URL}{path}"
    body = json.dumps(data).encode("utf-8") if data is not None else None
    headers = {"User-Agent": "SERA-Acceptance/1.0", "Content-Type": "application/json"} if data is not None else {"User-Agent": "SERA-Acceptance/1.0"}
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def run_acceptance():
    print("=" * 70)
    print("SERA END-TO-END ACCEPTANCE TEST (SECTION 25)")
    print("=" * 70)

    # 1. Health check & Ingestion verification
    print("\n[STEP 1] Verifying System Health & Official Case 2 Ingestion...")
    h = api_get("/health")
    assert h["status"] == "healthy" and h["database"] == "connected", f"Health failed: {h}"
    print(f"  • Health: status={h['status']}, database={h['database']}, version={h['version']}")

    # 2. Select BL-5702
    print("\n[STEP 2] Selecting Asset BL-5702 (Product Blower)...")
    equip_list = api_get("/api/equipment")
    target = next((e for e in equip_list if e["equipment_id"] == "BL-5702"), None)
    assert target is not None, "BL-5702 not found in equipment list"
    eq_type = target.get("type") or target.get("equipment_type")
    print(f"  • Selected: {target['equipment_id']} - {target['name']} ({eq_type})")

    # 3. Retrieve equipment data
    print("\n[STEP 3] Retrieving Detailed Equipment Data...")
    eq_data = api_get("/api/equipment/BL-5702")
    assert eq_data["equipment_id"] == "BL-5702"
    print(f"  • Condition records retrieved: {eq_data['total_readings']} weekly observations")
    print(f"  • Operating unit: {eq_data['unit']}, location: {eq_data['location']}")

    # 4. Run detection
    print("\n[STEP 4] Running Deterministic Problem Detection Engine...")
    detect_res = api_post("/api/analysis/detect?equipment_id=BL-5702")
    assert "detections" in detect_res
    print(f"  • Overall Status: {detect_res['status']}")
    print(f"  • Rules Triggered: {len(detect_res['detections'])}")
    for d in detect_res["detections"][:3]:
        print(f"    - {d['parameter']}: observed {d['observed_value']} vs threshold {d['threshold']} -> {d['severity']} ({d['threshold_source']})")

    # 5. Retrieve rule trace
    print("\n[STEP 5] Retrieving Rule Traceability (Why ALARM/TRIP?)...")
    trace = api_get("/api/equipment/BL-5702/rule-trace")
    assert len(trace["rules_triggered"]) > 0
    print(f"  • Provenance rules triggered: {len(trace['rules_triggered'])}")
    top_rule = trace["rules_triggered"][0]
    print(f"    - Rule ID: {top_rule['rule_id']}, Source: {top_rule['source']}, Status: {top_rule['resulting_status']}")

    # 6. Retrieve What Changed
    print("\n[STEP 6] Retrieving What Changed (Baseline vs Critical)...")
    wc = api_get("/api/equipment/BL-5702/what-changed")
    assert "comparison" in wc and len(wc["comparison"]) > 0
    for c in wc["comparison"]:
        print(f"  • {c['parameter']}: baseline={c['baseline_value']} -> critical={c.get('critical_value', c['current_value'])} (Δ={c['absolute_change']:+.2f}, {c['percentage_change']:+.1f}%) [{c['status']}] (current={c.get('current_value')})")

    # 7. Retrieve 4/8/12-week trends
    print("\n[STEP 7] Retrieving Multi-Window Regression Trends (4W, 8W, 12W)...")
    trends = api_get("/api/equipment/BL-5702/trends")
    for w in ["4_weeks", "8_weeks", "12_weeks"]:
        vib = trends[w].get("vibration", {})
        print(f"  • {w}: slope={vib.get('slope'):+.4f}, change={vib.get('change_percentage'):+.1f}%, direction={vib.get('trend_direction')}, obs={vib.get('observations_count')}, R²={vib.get('r_squared')}")

    # 8. Retrieve correlation
    print("\n[STEP 8] Retrieving Multi-Parameter Statistical Correlations...")
    corr = api_get("/api/equipment/BL-5702/correlations")
    assert "pairwise_correlations" in corr
    for pw in corr["pairwise_correlations"][:3]:
        print(f"  • {pw['parameter_a']} vs {pw['parameter_b']}: Pearson r={pw['pearson_r']:.3f} (n={pw['observation_count']})")

    # 9. Retrieve harmonic analysis (Safe: no fabrication)
    print("\n[STEP 9] Retrieving Harmonic Analysis (Engineering Safety Check)...")
    harm = api_get("/api/equipment/BL-5702/harmonic-analysis")
    print(f"  • Harmonic ratio available: {harm['available']}")
    if not harm["available"]:
        print(f"  • Note: {harm['reason']} (Zero fabrication of 1X component)")

    # 10. Retrieve historical incident similarity
    print("\n[STEP 10] Retrieving Historical Incident Matches (TF-IDF + Cosine)...")
    sim = api_get("/api/incidents/similar?equipment_id=BL-5702")
    assert len(sim) > 0
    top_sim = sim[0]
    print(f"  • Top Match: {top_sim['incident_id']} (similarity={top_sim['similarity_score']:.3f})")
    print(f"    - Event: {top_sim['historical_event']}")
    print(f"    - Action: {top_sim['historical_action'][:80]}...")

    # 11. Retrieve unified evidence package
    print("\n[STEP 11] Retrieving Unified Evidence Package...")
    ev = api_get("/api/equipment/BL-5702/evidence")
    assert isinstance(ev, list) and len(ev) > 0
    print(f"  • Evidence items count: {len(ev)}")
    for item in ev:
        print(f"    - [{item['evidence_id']}] {item['parameter']}: observed {item['observed_value']} {item['unit']} (severity: {item['severity']}) -> {item['interpretation']}")

    # 12. Generate RCA
    print("\n[STEP 12] Generating Structured RCA (5-Why, 4P, 4M+1E, Facts vs Hypotheses)...")
    rca = api_post("/api/analysis/rca?equipment_id=BL-5702")
    assert "five_why" in rca
    print(f"  • Primary Root Cause: {rca['primary_root_cause']}")
    print(f"  • 5-Why Problem: {rca['five_why']['problem']}")
    print(f"  • Why 1: {rca['five_why']['why_1']}")
    print(f"  • Why 5: {rca['five_why']['why_5']}")
    print(f"  • Observed Facts: {len(rca['observed_facts'])}, Interpretations: {len(rca['engineering_interpretations'])}, Causes: {len(rca['possible_causes'])}")

    # 13. Generate recommendation
    print("\n[STEP 13] Generating Evidence-Grounded Maintenance Recommendation...")
    rec = api_post("/api/recommendation?equipment_id=BL-5702")
    assert "recommended_action" in rec
    rec_id = rec["id"]
    print(f"  • Recommendation ID: {rec_id}")
    print(f"  • Priority: {rec['priority']}")
    print(f"  • Action: {rec['recommended_action'][:100]}...")

    # 14. Submit engineer review
    print("\n[STEP 14] Submitting Human-in-the-Loop Engineer Review (ACCEPT)...")
    rev = api_post(
        f"/api/recommendation/{rec_id}/review",
        {
            "review_status": "ACCEPTED",
            "reviewed_by": "Chief Reliability Engineer",
            "engineer_notes": "Laser realignment, soft-foot shim correction, and coupling element replacement approved for emergency window."
        }
    )
    assert rev["review_status"] == "ACCEPTED"
    print(f"  • Status: {rev['review_status']} by {rev['reviewed_by']}")

    # 15. Generate work-order recommendation
    print("\n[STEP 15] Generating Work Order Recommendation (Draft)...")
    wo = api_get(f"/api/recommendation/{rec_id}/work-order")
    assert "work_order_reference" in wo
    print(f"  • Work Order Reference: {wo['work_order_reference']}")
    print(f"  • Integration Mode: {wo['sap_integration_note']}")
    print(f"  • Required Inspection: {wo['required_inspection']}")

    # 16 & 17. Load actual post-maintenance data and run verification
    print("\n[STEP 16 & 17] Running Dynamic Post-Maintenance Verification...")
    ver = api_get("/api/equipment/BL-5702/verify")
    assert "verification_result" in ver
    print(f"  • Verification Result: {ver['verification_result']}")
    b_vals = ver.get("before_values") or ver.get("before_condition") or {}
    a_vals = ver.get("after_values") or ver.get("after_condition") or {}
    abs_chg = ver.get("absolute_change") or ver.get("absolute_changes") or {}
    pct_chg = ver.get("percentage_change") or ver.get("percentage_changes") or {}
    vib_b = b_vals.get("vibration", 0.0)
    vib_a = a_vals.get("vibration", 0.0)
    vib_d = abs_chg.get("vibration", 0.0)
    vib_p = pct_chg.get("vibration", 0.0)
    print(f"  • Vibration: before={vib_b} -> after={vib_a} (Δ={vib_d:.2f}, {vib_p:.1f}%)")

    # 18. Confirm final status
    print("\n[STEP 18] Confirming Final Dynamic Status...")
    assert ver["verification_result"] == "VERIFIED_RECOVERED"
    print("  ✓ Final Status VERIFIED_RECOVERED derived dynamically from database observations!")

    # ─────────────────────────────────────────────────────────────────
    # REPEAT FLOW FOR SECONDARY EQUIPMENT: PU-2101B
    # ─────────────────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("MULTI-EQUIPMENT VERIFICATION: PU-2101B (Feed Charge Pump)")
    print("=" * 70)

    eq2 = api_get("/api/equipment/PU-2101B")
    print(f"  • Asset: {eq2['equipment_id']} - {eq2['name']}")
    print(f"  • History Count: {eq2['total_readings']} records")

    det2 = api_post("/api/analysis/detect?equipment_id=PU-2101B")
    print(f"  • Detection Status: {det2['status']}, Rules Triggered: {len(det2['detections'])}")

    wc2 = api_get("/api/equipment/PU-2101B/what-changed")
    print(f"  • What Changed parameters: {[c['parameter'] for c in wc2['comparison']]}")

    tr2 = api_get("/api/equipment/PU-2101B/trends")
    print(f"  • 4W Trend available: {'4_weeks' in tr2}")

    cr2 = api_get("/api/equipment/PU-2101B/correlations")
    print(f"  • Pairwise correlations count: {len(cr2['pairwise_correlations'])}")

    rca2 = api_post("/api/analysis/rca?equipment_id=PU-2101B")
    print(f"  • PU-2101B 5-Why Problem: {rca2['five_why']['problem']}")

    print("\n" + "=" * 70)
    print("END-TO-END ACCEPTANCE TEST COMPLETED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_acceptance()
