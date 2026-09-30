import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowRight, ShieldAlert, Cpu, Wrench, CheckCircle2, AlertCircle } from 'lucide-react'

export interface RCAInsightProps {
  equipmentId: string
  equipmentName?: string
  observedEvidence: Array<string | { code?: string; item?: string; result?: string; evidence?: string }>
  possibleRootCause: string
  confidence?: string | null
  recommendedAction: string[]
  investigationRoute?: string
}

export const RCAInsight: React.FC<RCAInsightProps> = ({
  equipmentId,
  equipmentName,
  observedEvidence = [],
  possibleRootCause,
  confidence,
  recommendedAction = [],
  investigationRoute = `/equipment/${equipmentId}`,
}) => {
  return (
    <div className="rounded-sm border border-slate-200 bg-white p-5 sm:p-6 shadow-xs font-sans">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-3 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold text-primary bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-sm uppercase tracking-wider">
              INVESTIGATION INSIGHT
            </span>
            <span className="font-mono text-xs font-bold text-slate-800">
              {equipmentId} {equipmentName ? `· ${equipmentName}` : ''}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Structured Decision-Support: Engineering data is the evidence. AI is the reasoning layer. Engineers remain the decision makers.
          </p>
        </div>

        <Link
          to={investigationRoute}
          className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-primary hover:text-blue-800 self-start sm:self-auto transition-colors"
        >
          <span>FULL INVESTIGATION COCKPIT</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* 3-Step Flow Layout: EVIDENCE → POSSIBLE CAUSE → RECOMMENDED ACTION */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch relative">
        {/* Step 1: Observed Evidence */}
        <div className="rounded-sm border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
              <span className="font-mono text-xs font-bold text-slate-700 tracking-wider flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-700 text-[10px]">
                  1
                </span>
                OBSERVED EVIDENCE
              </span>
              <span className="text-[10px] font-mono text-slate-400 font-semibold">
                HARD TELEMETRY
              </span>
            </div>

            {observedEvidence.length === 0 ? (
              <p className="font-mono text-xs text-slate-400 italic">
                DATA NOT AVAILABLE
              </p>
            ) : (
              <ul className="space-y-2">
                {observedEvidence.map((ev: any, i) => {
                  const isObj = ev && typeof ev === 'object'
                  const code = isObj ? ev.code : null
                  const item = isObj ? ev.item : null
                  const res = isObj ? ev.result : null
                  const text = isObj ? (ev.evidence || ev.item || JSON.stringify(ev)) : String(ev)

                  return (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span className="leading-relaxed font-mono text-[11px]">
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
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="mt-4 pt-2.5 border-t border-slate-200/60 text-[10px] text-slate-400 font-mono">
            Ground-truth measurements from project sensor logs
          </div>
        </div>

        {/* Step 2: Possible Root Cause */}
        <div className="rounded-sm border border-blue-200 bg-blue-50/30 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-blue-100 pb-2 mb-3">
              <span className="font-mono text-xs font-bold text-blue-900 tracking-wider flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-200 text-primary text-[10px]">
                  2
                </span>
                POSSIBLE ROOT CAUSE
              </span>
              <span className="text-[10px] font-mono text-primary font-bold">
                MODEL INFERENCE
              </span>
            </div>

            <div className="space-y-2.5">
              <div className="rounded-sm bg-white border border-blue-200/80 p-3 shadow-2xs">
                <p className="text-xs text-slate-800 leading-relaxed font-medium">
                  {possibleRootCause || 'DATA NOT AVAILABLE'}
                </p>
              </div>

              {confidence && (
                <div className="flex items-center gap-2 text-[11px] font-mono">
                  <span className="text-slate-500">Inference Confidence:</span>
                  <span className="font-bold text-primary bg-white px-2 py-0.5 rounded-sm border border-blue-200">
                    {confidence}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-2.5 border-t border-blue-200/60 text-[10px] text-slate-500 font-mono">
            Analytical hypothesis · Requires engineer validation
          </div>
        </div>

        {/* Step 3: Recommended Action */}
        <div className="rounded-sm border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
              <span className="font-mono text-xs font-bold text-slate-700 tracking-wider flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-200 text-emerald-800 text-[10px]">
                  3
                </span>
                RECOMMENDED ACTION
              </span>
              <span className="text-[10px] font-mono text-emerald-700 font-semibold">
                DECISION SUPPORT
              </span>
            </div>

            {recommendedAction.length === 0 ? (
              <p className="font-mono text-xs text-slate-400 italic">
                DATA NOT AVAILABLE
              </p>
            ) : (
              <ul className="space-y-2">
                {recommendedAction.map((act, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                    <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-mono font-bold">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{act}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4 pt-2.5 border-t border-slate-200/60 text-[10px] text-slate-400 font-mono">
            Release to lead reliability engineer for review & work order
          </div>
        </div>
      </div>
    </div>
  )
}

export default RCAInsight
