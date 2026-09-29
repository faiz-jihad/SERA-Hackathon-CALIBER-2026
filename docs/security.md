# SERA — Security & Role-Based Access Control (RBAC)

---

## 1. Security Architecture

SERA implements a defense-in-depth security model tailored for critical industrial operations:
1. **Authentication Layer**: JWT-compatible session credentials and client-side persona management.
2. **Authorization & RBAC Layer**: Fine-grained role permissions governing work order sign-offs, data ingestion, and diagnostic execution.
3. **Audit Logging**: Immutable timestamped action logs for all engineering reviews and status transitions.
4. **Input Sanitization & Data Safety**: Strict Pydantic schema validation preventing SQL injection, path traversal, and malicious Excel file uploads.

---

## 2. Industrial RBAC Personas & Permission Matrix

SERA models 4 authentic industrial plant personas:

```
┌────────────────────────────────────────────────────────┐
│ 1. Lead Reliability Engineer (RELIABILITY_LEAD)        │
│    - Role: Chief machinery reliability officer         │
│    - Full authority to approve, modify, reject plans   │
├────────────────────────────────────────────────────────┤
│ 2. Maintenance Technician (MAINTENANCE_TECH)           │
│    - Role: Mechanical turnaround & alignment tech      │
│    - View work orders, record field measurements       │
├────────────────────────────────────────────────────────┤
│ 3. Plant Operations Manager (PLANT_MANAGER)            │
│    - Role: Production leadership & executive overview  │
│    - Monitor fleet uptime, financial & downtime impact │
├────────────────────────────────────────────────────────┤
│ 4. Reliability Data Engineer (DATA_ENGINEER)           │
│    - Role: Historian ETL & telemetry pipeline engineer │
│    - Ingest raw Excel workbooks, configure thresholds  │
└────────────────────────────────────────────────────────┘
```

### Granular Permission Matrix

| Operation / Feature | `RELIABILITY_LEAD` | `MAINTENANCE_TECH` | `PLANT_MANAGER` | `DATA_ENGINEER` |
| :--- | :---: | :---: | :---: | :---: |
| **View Fleet Dashboard & Telemetry** | ✅ | ✅ | ✅ | ✅ |
| **Inspect Mechanical Train Schematics** | ✅ | ✅ | ✅ | ✅ |
| **Run Deep Investigation & RCA** | ✅ | ❌ | ❌ | ✅ |
| **Authorize / Sign-Off Work Orders** | ✅ | ❌ | ❌ | ❌ |
| **Upload Raw Excel Telemetry Files** | ❌ | ❌ | ❌ | ✅ |
| **Trigger Batch ETL Ingestion** | ❌ | ❌ | ❌ | ✅ |
| **Record Post-Turnaround Follow-Up** | ✅ | ✅ | ❌ | ❌ |
| **View Financial Impact & Loss Reports** | ✅ | ❌ | ✅ | ❌ |

---

## 3. Demo Persona Switcher

To allow seamless demonstration and testing for judges and evaluators, the login interface ([`LoginPage.tsx`](file:///d:/Sera-Hackathon%20CALIBER%202026/sera/frontend/src/pages/LoginPage.tsx)) and top navigation header ([`Header.tsx`](file:///d:/Sera-Hackathon%20CALIBER%202026/sera/frontend/src/components/Header.tsx)) feature a **1-Click Live Persona Switcher**. Switching personas immediately updates navigation permissions, action button states, and review authorization capabilities without manual database credential resets.
