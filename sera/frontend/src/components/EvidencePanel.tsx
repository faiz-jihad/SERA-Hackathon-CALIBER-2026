import React from 'react'
import { ShieldCheck, AlertTriangle, AlertOctagon, CheckCircle2, FileText } from 'lucide-react'

export interface EvidenceRecordItem {
  signal: string
  observedPattern: string
  detectionResult: 'NORMAL' | 'ALARM' | 'TRIP' | 'WARNING' | 'DATA NOT AVAILABLE'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'NORMAL'
  supportingEvidence: string
  sourceFile?: string
  parameterKey?: string
}

export interface EvidencePanelProps {
  evidenceList: EvidenceRecordItem[]
  equipmentId?: string
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({
  evidenceList = [],
  equipmentId,
}) => {
  if (evidenceList.length === 0) {
    return (
      <div className="rounded-sm border border-slate-200 bg-white p-6 text-center font-mono text-xs text-slate-400">
        DATA NOT AVAILABLE
      </div>
    )
  }

  const resultBadgeColors: Record<string, string> = {
    NORMAL: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    WARNING: 'bg-amber-50 text-amber-700 border-amber-200',
    ALARM: 'bg-red-50 text-red-700 border-red-200 font-bold',
    TRIP: 'bg-red-100 text-red-800 border-red-300 font-bold',
    'DATA NOT AVAILABLE': 'bg-slate-100 text-slate-600 border-slate-200',
  }

  const severityBadgeColors: Record<string, string> = {
    NORMAL: 'text-slate-500 bg-slate-50',
    LOW: 'text-blue-700 bg-blue-50',
    MEDIUM: 'text-amber-700 bg-amber-50',
    HIGH: 'text-red-700 bg-red-50',
    CRITICAL: 'text-red-800 bg-red-100 font-bold',
  }

  return (
    <div className="rounded-sm border border-slate-200 bg-white shadow-xs font-sans overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 bg-slate-50/50">
        <div>
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-700">
            ENGINEERING EVIDENCE LAYER
          </span>
          <span className="ml-2 font-mono text-xs text-slate-400">
            ({evidenceList.length} Verified Evidence Points)
          </span>
        </div>
        <span className="font-mono text-[10px] text-slate-400">
          Deterministic Rule & Telemetry Synthesis
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider">
              <th className="py-2.5 px-4">Signal Parameter</th>
              <th className="py-2.5 px-4">Observed Pattern</th>
              <th className="py-2.5 px-4">Detection Result</th>
              <th className="py-2.5 px-4">Severity</th>
              <th className="py-2.5 px-4">Supporting Engineering Evidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {evidenceList.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3 px-4 font-mono font-bold text-slate-900">
                  {item.signal}
                  {item.parameterKey && (
                    <span className="block text-[10px] text-slate-400 font-normal">
                      key: {item.parameterKey}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 font-mono text-slate-700">
                  {item.observedPattern}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-block rounded-sm border px-2 py-0.5 font-mono text-[10px] ${
                      resultBadgeColors[item.detectionResult] || resultBadgeColors.NORMAL
                    }`}
                  >
                    {item.detectionResult}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-block rounded-sm px-2 py-0.5 font-mono text-[10px] ${
                      severityBadgeColors[item.severity] || severityBadgeColors.NORMAL
                    }`}
                  >
                    {item.severity}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-600 leading-relaxed font-mono text-[11px]">
                  {item.supportingEvidence}
                  {item.sourceFile && (
                    <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                      Source: {item.sourceFile}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default EvidencePanel
