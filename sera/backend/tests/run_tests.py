"""
SERA Automated Test Runner
Runs all tests with unbuffered immediate reporting.
"""
import os
import sys

# Ensure backend directory is in sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from tests.test_sera_pipeline import (
    test_data_validation,
    test_data_ingestion_records,
    test_rule_engine_source_priority,
    test_iso_standard_disclaimer,
    test_threshold_detection,
    test_trend_calculation,
    test_status_calculation,
    test_bl5702_problem_detection,
    test_historical_incident_search,
    test_rca_evidence_generation,
    test_recommendation_generation,
    test_engineer_review_workflow,
    test_follow_up_verification,
    test_all_13_mandatory_api_endpoints,
    test_ai_failure_fallback,
    test_bl5702_integration_end_to_end,
    test_22_1_health_and_ready,
    test_22_2_database_connection,
    test_22_3_ingestion,
    test_22_4_invalid_ingestion,
    test_22_5_detection,
    test_22_6_rule_trace,
    test_22_7_what_changed,
    test_22_8_multi_window_trend,
    test_22_9_correlation,
    test_22_10_historical_similarity,
    test_22_11_rca,
    test_22_12_recommendation,
    test_22_13_engineer_review,
    test_22_14_work_order_recommendation,
    test_22_15_post_maintenance_verification,
    test_22_16_multi_equipment_support,
    test_cross_module_temporal_consistency,
)

tests = [
    ("1. Health & Ready Probes", test_22_1_health_and_ready),
    ("2. Database Connection & Asset Master", test_22_2_database_connection),
    ("3. Official Case 2 Ingestion & Stats", test_22_3_ingestion),
    ("4. Invalid Ingestion 4xx Rejection", test_22_4_invalid_ingestion),
    ("5. Traceable Problem Detection", test_22_5_detection),
    ("6. Explainable Rule Trace", test_22_6_rule_trace),
    ("7. Dynamic What Changed", test_22_7_what_changed),
    ("8. 4W/8W/12W Multi-Window Regression Trends", test_22_8_multi_window_trend),
    ("9. Statistical Correlations & Harmonic 1X Safety", test_22_9_correlation),
    ("10. TF-IDF & Cosine Historical Similarity", test_22_10_historical_similarity),
    ("11. RCA 5-Why & Fact/Interpretation/Cause", test_22_11_rca),
    ("12. Evidence-Grounded Recommendations", test_22_12_recommendation),
    ("13. Engineer Review (Accept/Modify/Reject)", test_22_13_engineer_review),
    ("14. Work Order Recommendation (Draft)", test_22_14_work_order_recommendation),
    ("15. Dynamic Post-Maintenance Verification", test_22_15_post_maintenance_verification),
    ("16. Multi-Equipment Support (PU-2101B, KO-3201, PM-4405B, HE-3301)", test_22_16_multi_equipment_support),
    ("17. Cross-Module Temporal Consistency (Regression)", test_cross_module_temporal_consistency),
    ("18. Data Validation Logic", test_data_validation),
    ("19. Ingested Records Queryability", test_data_ingestion_records),
    ("20. Rule Engine Source Priority", test_rule_engine_source_priority),
    ("21. ISO Standard Disclaimer Compliance", test_iso_standard_disclaimer),
    ("22. Deterministic Threshold Detection", test_threshold_detection),
    ("23. Trend Calculation & Slope", test_trend_calculation),
    ("24. Status Calculation", test_status_calculation),
    ("25. BL-5702 Problem Detection", test_bl5702_problem_detection),
    ("26. Historical Incident Search", test_historical_incident_search),
    ("27. RCA Evidence Pattern Match", test_rca_evidence_generation),
    ("28. Recommendation Generation", test_recommendation_generation),
    ("29. Engineer Review Workflow", test_engineer_review_workflow),
    ("30. Follow-Up Verification", test_follow_up_verification),
    ("31. AI Failure Fallback & Resiliency", test_ai_failure_fallback),
    ("32. BL-5702 Full End-to-End Flow", test_bl5702_integration_end_to_end),
]

passed = 0
failed = 0

print("=" * 70, flush=True)
print("SERA AUTOMATED TEST EXECUTION SUITE", flush=True)
print(f"Total Test Cases: {len(tests)}", flush=True)
print("=" * 70, flush=True)

for name, test_fn in tests:
    sys.stdout.write(f"[RUNNING] {name}... ")
    sys.stdout.flush()
    try:
        test_fn()
        sys.stdout.write("PASSED\n")
        sys.stdout.flush()
        passed += 1
    except Exception as e:
        sys.stdout.write(f"FAILED: {e}\n")
        sys.stdout.flush()
        import traceback
        traceback.print_exc()
        failed += 1

print("=" * 70, flush=True)
print(f"RESULTS: {passed} PASSED, {failed} FAILED (TOTAL {len(tests)})", flush=True)
print("=" * 70, flush=True)

if failed > 0:
    sys.exit(1)
else:
    print("ALL TESTS PASSED SUCCESSFULLY 100%!", flush=True)
