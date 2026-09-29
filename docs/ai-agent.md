# SERA — AI Investigation Agent Architecture

---

## 1. Role of AI in the SERA System

In the SERA architecture, **Artificial Intelligence is an Explanation and Reasoning Synthesis Layer**, NOT a calculation engine:

```
┌────────────────────────────────────────────────────────┐
│  ENGINEERING DATA = THE UNCOMPROMISING EVIDENCE        │
│  - Exact vibration velocity (11.22 mm/s)               │
│  - 2X Harmonic amplitude (5.10 mm/s)                   │
│  - Radial coupling offset (0.306 mm)                   │
│  - ISO 10816-3 rule triggers and mathematical slopes   │
├────────────────────────────────────────────────────────┤
│  AI INVESTIGATION AGENT = THE REASONING & SYNTHESIS    │
│  - Correlates multi-sensor symptoms into mechanical RCA│
│  - Synthesizes matched historical maintenance cases    │
│  - Drafts actionable SAP-style turnaround work orders  │
├────────────────────────────────────────────────────────┤
│  LEAD RELIABILITY ENGINEER = FINAL DECISION MAKER      │
│  - Reviews diagnostic reasoning and verifies tooling   │
│  - Signs off authorization (ACCEPT / MODIFY / REJECT)  │
└────────────────────────────────────────────────────────┘
```

---

## 2. Prompt Architecture & Constraints

The AI Investigation Agent prompt is engineered with strict industrial reliability constraints:

```
[SYSTEM INSTRUCTION]
You are SERA, a senior industrial rotating machinery reliability diagnostic agent.
You are evaluating telemetry, ISO standards, and historical records for equipment: {EQUIPMENT_ID}.

CRITICAL CONSTRAINTS:
1. Ground your analysis 100% in the provided EVIDENCE LAYER and TRIGGERED RULES.
2. DO NOT invent or hallucinate any sensor values, thresholds, or part numbers.
3. Formulate a deterministic 5-Why mechanical failure propagation sequence.
4. Reference verified historical incident {HISTORICAL_INCIDENT_ID} for turnaround actions.
5. Emphasize that the Lead Engineer is the final authorizing authority.

[PROVIDED EVIDENCE PAYLOAD]
{JSON_EVIDENCE_PAYLOAD}

[WHAT CHANGED BASELINE DELTAS]
{JSON_WHAT_CHANGED_PAYLOAD}

[TOP MATCHED HISTORICAL INCIDENT]
{JSON_HISTORICAL_INCIDENT_PAYLOAD}
```

---

## 3. Resilient Deterministic Fallback Mode

To guarantee **$100\%$ uptime in industrial plant environments** (where internet access or external LLM API availability may be restricted or intermittent):

1. The `investigation_agent.py` service wraps LLM API calls in a strict timeout ($8\text{ seconds}$).
2. If an API timeout, rate limit, or network disconnection occurs, the service automatically engages the **Rule-Based Deterministic Synthesis Engine**:
   - Deduces failure mode using harmonic dominance flags ($R_{2X} > 0.50 \rightarrow \text{Misalignment}$).
   - Extracts corrective steps directly from the highest-ranking historical incident in the local database.
   - Formulates the 5-Why Fault Tree and SAP Work Order deterministically.
3. The user receives an instant, verified response with zero downtime or crashing.
