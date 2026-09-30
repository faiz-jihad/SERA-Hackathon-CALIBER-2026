import React from 'react'
import { Activity, AlertTriangle, CheckCircle2, ShieldAlert, ArrowUpRight, Minus, AlertCircle } from 'lucide-react'

export interface ConditionIndicatorItem {
  name: string
  category: 'vibration' | 'frequency' | 'alignment' | 'temperature' | 'deviation' | 'operating' | string
  value: string | number
  unit?: string
  status: 'NORMAL' | 'ALARM' | 'TRIP' | 'WARNING' | 'DATA NOT AVAILABLE'
  thresholdNote?: string
  interpretation?: string
}

export interface ConditionAssessmentProps {
  equipmentId: string
  equipmentName?: string
  status: 'ATTENTION' | 'NORMAL' | 'WARNING' | 'TRIP' | 'DATA NOT AVAILABLE'
  trend: 'INCREASING' | 'STABLE' | 'DECREASING' | 'DATA NOT AVAILABLE'
  anomaly: 'DETECTED' | 'NOMINAL' | 'NEEDS VALIDATION'
  indicators: ConditionIndicatorItem[]
}

export const ConditionAssessment: React.FC<ConditionAssessmentProps> = ({
  equipmentId,
  equipmentName,
  status,
  trend,
  anomaly,
  indicators = [],
}) => {
  const isAttention = status === 'ATTENTION' || status === 'TRIP' || status === 'WARNING'

  return (
    <div className="flex h-full flex-col rounded-sm border border-slate-200 bg-white p-4 shadow-xs font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
            Condition Assessment
          </span>
          <h4 className="text-xs font-bold text-slate-900 mt-0.5 font-mono">
            {equipmentId}
          </h4>
        </div>

        <span
          className={`rounded-sm border px-2 py-0.5 font-mono text-[10px] font-bold ${
            isAttention
              ? 'bg-red-50 text-red-700 border-red-200'
              : status === 'NORMAL'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-slate-100 text-slate-700 border-slate-200'
          }`}
        >
          {status}
        </span>
      </div>

      {/* 4 Summary Metrics Grid */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-left">
        {/* Status */}
        <div className="rounded-sm bg-slate-50 p-2.5 border border-slate-100">
          <span className="block text-[10px] font-mono text-slate-400 uppercase font-medium">
            Status
          </span>
          <span className={`mt-0.5 block font-mono text-xs font-bold ${isAttention ? 'text-red-700' : 'text-slate-800'}`}>
            {status}
          </span>
        </div>

        {/* Trend */}
        <div className="rounded-sm bg-slate-50 p-2.5 border border-slate-100">
          <span className="block text-[10px] font-mono text-slate-400 uppercase font-medium">
            Trend
          </span>
          <span className={`mt-0.5 block font-mono text-xs font-bold ${trend === 'INCREASING' ? 'text-red-700' : 'text-slate-800'}`}>
            {trend}
          </span>
        </div>

        {/* Anomaly */}
        <div className="rounded-sm bg-slate-50 p-2.5 border border-slate-100">
          <span className="block text-[10px] font-mono text-slate-400 uppercase font-medium">
            Anomaly
          </span>
          <span className={`mt-0.5 block font-mono text-xs font-bold ${anomaly === 'DETECTED' ? 'text-red-700' : 'text-emerald-700'}`}>
            {anomaly}
          </span>
        </div>

        {/* Evidence Count */}
        <div className="rounded-sm bg-slate-50 p-2.5 border border-slate-100">
          <span className="block text-[10px] font-mono text-slate-400 uppercase font-medium">
            Evidence
          </span>
          <span className="mt-0.5 block font-mono text-xs font-bold text-slate-800">
            {indicators.length} {indicators.length === 1 ? 'indicator' : 'indicators'}
          </span>
        </div>
      </div>

      {/* Extracted Evidence List */}
      <div className="mt-4 flex-1">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
            Observed Indicators
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            Source: Project Telemetry
          </span>
        </div>

        {indicators.length === 0 ? (
          <div className="flex h-36 items-center justify-center rounded-sm border border-dashed border-slate-200 bg-slate-50 p-3 text-center font-mono text-xs text-slate-400">
            DATA NOT AVAILABLE
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto max-h-[220px] pr-1">
            {indicators.map((ind, idx) => {
              const isBreached = ind.status === 'ALARM' || ind.status === 'TRIP'
              return (
                <div
                  key={idx}
                  className={`rounded-sm border p-2 text-xs font-mono transition-all ${
                    isBreached
                      ? 'border-red-200 bg-red-50/50'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-slate-800 truncate" title={ind.name}>
                      {ind.name}
                    </span>
                    <span
                      className={`rounded-sm border px-1.5 py-0.2 text-[9px] font-bold ${
                        isBreached
                          ? 'border-red-300 bg-red-100 text-red-800'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      {ind.status}
                    </span>
                  </div>

                  <div className="mt-1 flex items-baseline justify-between text-[11px]">
                    <span className="font-bold text-slate-900">
                      {ind.value} {ind.unit || ''}
                    </span>
                    {ind.thresholdNote && (
                      <span className="text-[10px] text-slate-500">
                        {ind.thresholdNote}
                      </span>
                    )}
                  </div>

                  {ind.interpretation && (
                    <p className="mt-1 text-[10px] text-slate-500 font-sans leading-tight">
                      {ind.interpretation}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default ConditionAssessment
