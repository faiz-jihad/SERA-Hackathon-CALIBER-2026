# SERA — Frequently Asked Questions (FAQ)

---

## 1. Questions from Hackathon Judges & Evaluators

### Q1: Is SERA dependent on an LLM for calculating vibration thresholds or slopes?
**No.** All numerical calculations, linear regression trend slopes, 2X harmonic energy ratios, and threshold checks are executed in **$100\%$ deterministic Python code**. AI operates strictly as an explanation and reasoning synthesis layer over structured evidence.

### Q2: What happens if the internet connection goes down or the AI API times out?
SERA features an automatic **Deterministic Fallback Engine**. If an LLM API call exceeds 8 seconds or fails, the system automatically uses deterministic rule-based algorithms to construct the 5-Why Fault Tree and SAP Work Order without breaking the user experience.

### Q3: Why is the Lead Engineer review mandatory?
In heavy industrial plants, improper maintenance or unverified shutdowns can cost hundreds of thousands of dollars and present serious safety hazards. SERA enforces human-in-the-loop governance: only a licensed Lead Reliability Engineer can authorize work orders for field execution.

---

## 2. Questions from Plant Engineers & Technicians

### Q4: How are ISO 10816-3 vibration limits configured?
ISO 10816-3 limits are mapped based on machine classification (Class III/IV large machines with rigid foundation: Good $< 2.3\text{ mm/s}$, Satisfactory $2.3–4.5\text{ mm/s}$, Unsatisfactory $4.5–7.1\text{ mm/s}$, Unacceptable/Trip $> 7.1\text{ mm/s}$). Limits are stored in `threshold_rules` and can be customized per machine.

### Q5: Can we ingest data directly from SCADA or OSIsoft PI?
Yes. The prototype currently ingests Excel historian exports, and the Phase 2 roadmap includes native OPC-UA and MQTT connectors for direct streaming from plant DCS systems.
