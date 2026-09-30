import React from 'react'
import { ShieldAlert, CheckCircle2, Wrench, AlertTriangle, FileText, ChevronRight } from 'lucide-react'

export interface RCAPanelProps {
  equipmentId: string
  evidenceItems: Array<string | { code?: string; item?: string; result?: string; evidence?: string }>
  possibleCause: string
  confidence?: string | null
  recommendedInspections: string[]
  physicalChecks?: Array<{ code: string; item: string; result: 'G' | 'NG'; evidence: string }>
  fourMOneE?: Array<{ code: string; category: string; result: 'G' | 'NG'; evidence: string }>
}

export const RecommendationPanel: React.FC<RCAPanelProps> = ({
  equipmentId,
  evidenceItems = [],
  possibleCause,
  confidence,
  recommendedInspections = [],
  physicalChecks = [],
  fourMOneE = [],
}) => {
  return (
    <div className="rounded-sm border border-slate-200 bg-white p-5 sm:p-6 shadow-xs font-sans space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-3 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-primary bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-sm uppercase tracking-wider">
              ROOT CAUSE ANALYSIS (RCA)
            </span>
            <h3 className="text-sm font-bold text-slate-900 uppercase">
              {equipmentId} Diagnostic Synthesis
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            4P Physical Verification & 4M+1E Systemic Breakdown
          </p>
        </div>

        {confidence && (
          <div className="flex items-center gap-1.5 rounded-sm bg-blue-50 border border-blue-200 px-3 py-1 font-mono text-xs font-bold text-primary">
            <span>Confidence:</span>
            <span>{confidence}</span>
          </div>
        )}
      </div>

      {/* Grid: Evidence & Possible Cause */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Evidence Column */}
        <div className="rounded-sm border border-slate-200 bg-slate-50/60 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="font-mono text-xs font-bold text-slate-800 uppercase tracking-wider">
              Synthesized Evidence
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Verified Data
            </span>
          </div>

          {evidenceItems.length === 0 ? (
            <p className="font-mono text-xs text-slate-400">DATA NOT AVAILABLE</p>
          ) : (
            <ul className="space-y-2 text-xs text-slate-700 font-mono">
              {evidenceItems.map((ev: any, i) => {
                const isObj = ev && typeof ev === 'object'
                const code = isObj ? ev.code : null
                const item = isObj ? ev.item : null
                const res = isObj ? ev.result : null
                const text = isObj ? (ev.evidence || ev.item || JSON.stringify(ev)) : String(ev)

                return (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    <div className="leading-relaxed">
                      {code && <span className="font-bold text-slate-900 mr-1">[{code}]</span>}
                      {item && <span className="font-semibold text-slate-800 mr-1">{item}:</span>}
                      <span>{text}</span>
                      {res && (
                        <span className={`ml-1.5 px-1 py-0.2 text-[9px] font-bold rounded-xs border ${
                          res === 'NG' ? 'text-red-700 bg-red-50 border-red-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        }`}>
                          {res}
                        </span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Possible Cause Column */}
        <div className="rounded-sm border border-blue-200 bg-blue-50/20 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-blue-100 pb-2">
            <span className="font-mono text-xs font-bold text-blue-900 uppercase tracking-wider">
              Possible Root Cause
            </span>
            <span className="text-[10px] font-mono text-primary font-bold">
              Hypothesis Model
            </span>
          </div>

          <div className="rounded-sm bg-white border border-blue-200 p-3 shadow-2xs">
            <p className="text-xs text-slate-800 leading-relaxed font-medium">
              {possibleCause || 'DATA NOT AVAILABLE'}
            </p>
          </div>

          <p className="text-[11px] text-slate-500 font-sans italic">
            *AI-assisted root cause analysis based on verified failure signatures in CALIBER 2026 dataset.
          </p>
        </div>
      </div>

      {/* 4P Physical Failure Verification Table if present */}
      {physicalChecks.length > 0 && (
        <div className="rounded-sm border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-mono font-bold uppercase text-slate-600">
            4P Physical Verification Matrix (Parts, Position, Process, Paper)
          </div>
          <div className="divide-y divide-slate-100 text-xs font-mono">
            {physicalChecks.map((pc, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <span className="rounded-sm bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                    {pc.code}
                  </span>
                  <span className="font-bold text-slate-800">{pc.item}</span>
                  <span className="text-slate-600">{pc.evidence}</span>
                </div>
                <span className={`rounded-sm border px-2 py-0.5 text-[10px] font-bold ${
                  pc.result === 'NG'
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                }`}>
                  {pc.result === 'NG' ? 'NG (Abnormal)' : 'G (Good)'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Inspection Column */}
      <div className="rounded-sm border border-slate-200 bg-slate-50/60 p-4 space-y-2">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
          <span className="font-mono text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Wrench size={14} className="text-primary" />
            Recommended Inspection & Action Scope
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            Actionable Scope
          </span>
        </div>

        {recommendedInspections.length === 0 ? (
          <p className="font-mono text-xs text-slate-400">DATA NOT AVAILABLE</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
            {recommendedInspections.map((ins, i) => (
              <div key={i} className="rounded-sm border border-slate-200 bg-white p-2.5 flex items-start gap-2 shadow-2xs">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 text-primary text-[10px] font-bold">
                  {i + 1}
                </span>
                <span className="text-slate-700 leading-tight">{ins}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default RecommendationPanel
