import React, { useState } from 'react'
import { ChevronDown, ChevronRight, FileText } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import StatusBadge from './StatusBadge'

export interface EvidenceRecord {
  evidence_id: string
  parameter: string
  parameter_key?: string
  observed_value: number | string
  previous_value?: number | string
  change?: number | string
  unit?: string
  threshold?: string
  severity?: string
  source?: string
  timestamp?: string
  interpretation?: string
}

export const EvidenceItem: React.FC<{ item: EvidenceRecord }> = ({ item }) => {
  const [expanded, setExpanded] = useState(false)
  const { t } = useLanguage()

  const isCritical = item.severity === 'CRITICAL' || item.severity === 'TRIP'
  const isAlarm = item.severity === 'ALARM' || item.severity === 'WARNING'

  return (
    <div
      className={`rounded-sm border transition-all duration-150 shadow-sm ${
        isCritical
          ? 'border-red-300 bg-red-50/20'
          : isAlarm
          ? 'border-amber-300 bg-amber-50/20'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex cursor-pointer items-center justify-between p-3.5 select-none hover:bg-slate-50/60"
      >
        <div className="flex items-center gap-3">
          <span className="rounded-sm bg-blue-50 border border-blue-200 px-2.5 py-0.5 font-mono text-[11px] font-bold text-primary">
            {item.evidence_id}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">{item.parameter}</span>
              <StatusBadge status={item.severity || 'ALARM'} size="sm" />
            </div>
            <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{item.interpretation}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="font-mono text-sm font-bold text-slate-900">
              {item.observed_value} {item.unit}
            </div>
            {item.change !== undefined && (
              <div className="font-mono text-[11px] text-slate-500 font-semibold">
                Δ: {Number(item.change) > 0 ? `+${item.change}` : item.change} {item.unit}
              </div>
            )}
          </div>
          {expanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-200 bg-slate-50 p-4 text-xs space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Limit Threshold:</span>
              <p className="font-mono font-bold text-amber-700 mt-0.5">{item.threshold || 'Nominal Limit'}</p>
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Evidence Source Provenance:</span>
              <div className="flex items-center gap-1.5 mt-0.5 text-slate-700 font-mono font-medium">
                <FileText size={13} className="text-slate-400" />
                <span>{item.source || 'Equipment Condition Records'}</span>
              </div>
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Observation Window:</span>
              <p className="font-mono text-slate-700 mt-0.5">{item.timestamp || 'Latest Condition Reading'}</p>
            </div>
          </div>
          <div className="rounded-sm bg-white p-3 border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Physical Interpretation:</span>
            <p className="mt-1 text-slate-800 leading-relaxed font-medium">{item.interpretation}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export const EvidenceGroup: React.FC<{
  title: string
  subtitle?: string
  items: EvidenceRecord[]
}> = ({ title, subtitle, items }) => {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold tracking-wider text-slate-900 uppercase">{title}</h4>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        <span className="font-mono text-xs text-slate-500 font-medium">
          {items.length} {items.length === 1 ? 'Evidence Item' : 'Evidence Items'}
        </span>
      </div>
      <div className="space-y-2.5">
        {items.map((item) => (
          <EvidenceItem key={item.evidence_id} item={item} />
        ))}
      </div>
    </div>
  )
}

export default EvidenceGroup
