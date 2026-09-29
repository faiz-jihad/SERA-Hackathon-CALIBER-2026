# SERA — Frontend Architecture & UI/UX Documentation

---

## 1. Design System & Aesthetics

The SERA frontend is built from the ground up to reflect an authentic, high-reliability enterprise industrial operations platform:

### 1.1 Visual Identity Standards
- **Theme**: Pure **Light Mode** (`#FFFFFF` cards, `#F8FAFC` slate canvas). Strictly avoids gimmicky dark modes or generic SaaS aesthetics.
- **Color Palette**:
  - Primary Corporate Blue: `#2563EB` (Tailwind `blue-600`)
  - Primary Hover Blue: `#1D4ED8` (Tailwind `blue-700`)
  - Primary Muted Blue: `#EFF6FF` (Tailwind `blue-50`)
  - Slate Neutral Borders: `#E2E8F0` (Tailwind `border-slate-200`)
  - Slate Text Primary: `#0F172A` (Tailwind `text-slate-900`)
  - Slate Text Muted: `#64748B` (Tailwind `text-slate-500`)
  - Safety Alert Red (Trip / Emergency): `#DC2626` (`red-600`)
  - Warning Amber (Alarm / Advisory): `#D97706` (`amber-600`)
  - Normal Emerald (Nominal / Verified): `#059669` (`emerald-600`)
- **Typography**: **Montserrat** (`font-sans`) for clean, modern legibility across headers and body copy, paired with `font-mono` (JetBrains Mono / monospace) for sensor readings, tag codes, and threshold values.

---

## 2. Component Hierarchy & Architecture

```
src/
├── api/
│   └── client.ts                 # Axios API client & full TypeScript interface contracts
├── context/
│   ├── AuthContext.tsx           # Enterprise RBAC role manager & persona switcher
│   └── LanguageContext.tsx       # Bilingual i18n engine (English & Bahasa Indonesia)
├── components/
│   ├── EquipmentTrainSchematic.tsx # Mechanical train drivetrain block diagram
│   ├── IndustrialGauge.tsx       # SCADA linear operating range gauge
│   ├── FaultTreeCard.tsx         # Deterministic 5-Why RCA failure propagation tree
│   ├── WorkOrderCard.tsx         # SAP PM01 Maintenance Work Order card
│   ├── VibrationSeverityMatrix.tsx # ISO 10816-3 severity reference matrix
│   ├── MetricCard.tsx            # Industrial KPI metric card with trend indicators
│   ├── StatusBadge.tsx           # Deterministic industrial status badge
│   ├── TrendChart.tsx            # Recharts multi-week time-series chart
│   ├── WhatChangedTable.tsx      # Comparative delta table
│   ├── ThresholdCard.tsx         # Rule provenance and threshold trace cards
│   ├── EvidenceItem.tsx          # Measured parameter breach cards
│   ├── ReviewPanel.tsx           # Lead engineer sign-off interface
│   ├── FollowUpCard.tsx          # "Did It Work?" recovery scorecard
│   ├── Header.tsx                # Top navigation, global search, user profile
│   ├── Sidebar.tsx               # TailAdmin navigation drawer with role badges
│   └── ProtectedRoute.tsx        # Route guard enforcing authentication & permissions
├── pages/
│   ├── DashboardPage.tsx         # Plant-wide synoptic health cockpit
│   ├── EquipmentListPage.tsx     # Fleet registry table
│   ├── EquipmentDetailPage.tsx   # 7-Step Decision Support Pipeline Cockpit
│   ├── AnalysisPage.tsx          # Failure diagnostics & 5-Why investigation
│   ├── RecommendationsPage.tsx   # SAP PM action plans & review center
│   ├── IncidentsPage.tsx         # Historical breakdown archives (380 records)
│   ├── FollowUpPage.tsx          # Post-turnaround verification dashboard
│   ├── IngestionPage.tsx         # Excel ingestion & ETL control panel
│   └── LoginPage.tsx             # Enterprise login & 1-click persona switcher
└── i18n/
    ├── en.ts                     # English localization dictionary (100% complete)
    └── id.ts                     # Bahasa Indonesia localization dictionary (100% complete)
```

---

## 3. Specialized Industrial Components

### 3.1 `EquipmentTrainSchematic.tsx`
- **Function**: Renders a physical 5-stage mechanical train synoptic (`Electric Motor (350 kW)` $\rightarrow$ `Flexible Disc Coupling` $\rightarrow$ `DE Bearing` $\rightarrow$ `Centrifugal Blower` $\rightarrow$ `NDE Bearing`).
- **Dynamic Logic**: Evaluates live sensor measurements (`vibration`, `harmonic2X`, `couplingOffset`, `bearingTemp`) to apply stage-specific color rings (`TRIP OFFSET`, `ALARM TEMP`, `TRIP VIB`, `NOMINAL`).

### 3.2 `IndustrialGauge.tsx`
- **Function**: SCADA linear operating envelope bar showing multi-zone threshold breakdown (`Nominal (Green)` $\rightarrow$ `Warning (Yellow)` $\rightarrow$ `Alarm (Orange)` $\rightarrow$ `Trip (Red)`) with dynamic needle marker and ISO limits.

### 3.3 `FaultTreeCard.tsx`
- **Function**: Visualizes the deterministic 5-Why mechanical failure sequence with structured boxes, SVG connecting arrows, and parameter provenance tags.

### 3.4 `WorkOrderCard.tsx`
- **Function**: Formats maintenance action plans into official **SAP PM01 Maintenance Work Orders** with order numbers, functional location tags, priority flags, required tooling (laser alignment kit, SS304 shims), Lockout/Tagout (LOTO) requirements, and interactive step-by-step procedure checkboxes.

---

## 4. Internationalization (Bilingual System)

The frontend includes complete, non-stubbed bilingual localization:
- **Languages**: English (`en`) and Bahasa Indonesia (`id`).
- **Switching**: Instant zero-reload toggle in header via `LanguageContext`.
- **Scope**: Every table header, KPI label, alert banner, error message, and button text is translated seamlessly.
