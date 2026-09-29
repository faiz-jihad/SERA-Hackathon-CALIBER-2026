import React from 'react'
import { Database, FileSpreadsheet, Cpu, Sparkles, CheckCircle2 } from 'lucide-react'

export type ProvenanceSource =
  | 'EQUIPMENT_PERFORMANCE'
  | 'HOURLY_PRODUCTION'
  | 'INCIDENT_DATABASE'
  | 'OFFICIAL_RCA'
  | 'DERIVED_ANALYSIS'
  | 'VERIFIED_RECOVERY'

interface DataProvenanceBadgeProps {
  source: ProvenanceSource
  detail?: string
}

export const DataProvenanceBadge: React.FC<DataProvenanceBadgeProps> = ({ source, detail }) => {
  const configs: Record<
    ProvenanceSource,
    { label: string; icon: any; bg: string; text: string; border: string }
  > = {
    EQUIPMENT_PERFORMANCE: {
      label: 'CALIBER DATA: Equipment Performance',
      icon: FileSpreadsheet,
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
    },
    HOURLY_PRODUCTION: {
      label: 'CALIBER DATA: Hourly Production (PI Tag)',
      icon: Database,
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
    },
    INCIDENT_DATABASE: {
      label: 'CALIBER DATA: Incident Database (380 Cases)',
      icon: FileSpreadsheet,
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
    },
    OFFICIAL_RCA: {
      label: 'CALIBER DATA: Abnormality Report AR-2026-OPP-0203',
      icon: Cpu,
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
    },
    DERIVED_ANALYSIS: {
      label: 'DERIVED ANALYSIS: Deterministic Python Calculation',
      icon: Sparkles,
      bg: 'bg-sky-50',
      text: 'text-sky-700',
      border: 'border-sky-200',
    },
    VERIFIED_RECOVERY: {
      label: 'POST-REPAIR VERIFICATION: Condition History Wk 22',
      icon: CheckCircle2,
      bg: 'bg-teal-50',
      text: 'text-teal-700',
      border: 'border-teal-200',
    },
  }

  const c = configs[source]
  const Icon = c.icon

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 font-mono text-[10px] font-bold ${c.bg} ${c.text} ${c.border}`}
      title={detail || c.label}
    >
      <Icon size={11} />
      <span>{detail ? `${c.label} • ${detail}` : c.label}</span>
    </span>
  )
}
export default DataProvenanceBadge
