import React, { useState } from 'react'
import { Info, ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import StatusBadge from './StatusBadge'

export interface RuleTraceItem {
  rule_id: string
  equipment_id?: string
  parameter: string
  observed_value: number
  condition: string
  threshold: number
  unit: string
  severity: string
  source_type: string
  source_reference: string
  rationale: string
  priority?: number
}

export interface RuleTraceProps {
  rules: RuleTraceItem[]
  reasons?: string[]
  overallStatus?: string
}

export const ThresholdCard: React.FC<{ rule: RuleTraceItem }> = ({ rule }) => {
  const { t } = useLanguage()
  const [expanded, setExpanded] = useState(false)

  const isCritical = rule.severity === 'TRIP' || rule.severity === 'CRITICAL'
  const isAlarm = rule.severity === 'ALARM' || rule.severity === 'WARNING'

  const sourceLabels: Record<string, string> = {
    PLANT_LIMIT: t('sourcePlantLimit'),
    SUPPORTING_DATA: t('sourceSupportingData'),
    ENGINEERING_STANDARD: t('sourceEngineeringStandard'),
    DATA_DRIVEN: t('sourceDataDriven'),
    PROJECT_ASSUMPTION: t('sourceProjectAssumption'),
  }

  const sourceName = sourceLabels[rule.source_type] || rule.source_type

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
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-slate-100 border border-slate-200 font-mono text-[10px] font-bold text-slate-700">
            P{rule.priority || 2}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">
                {rule.parameter.replace(/_/g, ' ').toUpperCase()}
              </span>
              <StatusBadge status={rule.severity} size="sm" />
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Trigger: <span className="font-mono text-amber-700 font-bold">{rule.observed_value} {rule.unit}</span> {rule.condition} {rule.threshold} {rule.unit}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="inline-block rounded-sm bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[10px] font-mono text-slate-600 font-medium">
              {sourceName}
            </span>
          </div>
          {expanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-200 bg-slate-50 p-4 text-xs space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Rule Reference Document:</span>
              <p className="font-mono text-slate-900 mt-0.5">{rule.source_reference}</p>
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Rule ID:</span>
              <p className="font-mono text-slate-700 mt-0.5">{rule.rule_id}</p>
            </div>
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Engineering Rationale:</span>
            <p className="mt-0.5 text-slate-700 leading-relaxed font-medium">{rule.rationale}</p>
          </div>
          {rule.source_type === 'ENGINEERING_STANDARD' && (
            <div className="flex items-start gap-2 rounded-sm bg-blue-50 border border-blue-200 p-2.5 text-xs text-primary font-medium">
              <Info size={14} className="shrink-0 mt-0.5 text-primary" />
              <span>{t('isoDisclaimerNotice')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export const RuleTrace: React.FC<RuleTraceProps> = ({ rules, reasons = [], overallStatus = 'CRITICAL' }) => {
  return (
    <div className="space-y-3">
      {reasons.length > 0 && (
        <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={16} className="text-primary" />
            <h4 className="text-xs font-bold tracking-wider text-slate-900 uppercase">
              Deterministic Reasons for {overallStatus} Classification:
            </h4>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-700 pl-5 list-disc">
            {reasons.map((reason, idx) => (
              <li key={idx} className="leading-relaxed font-mono text-[11.5px]">
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <h4 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
          Triggered Rule Trace & Source Provenance ({rules.length} Rules):
        </h4>
        <div className="space-y-2">
          {rules.map((rule) => (
            <ThresholdCard key={rule.rule_id} rule={rule} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default RuleTrace
