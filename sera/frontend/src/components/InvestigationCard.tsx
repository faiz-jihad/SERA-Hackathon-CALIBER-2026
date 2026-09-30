import React from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Activity, Cpu, ExternalLink } from 'lucide-react'

export interface InvestigationCardProps {
  equipmentId: string
  equipmentName: string
  location?: string
  plant?: string
  conditionStatus: string
  factualExplanation: string
  telemetryEvidence?: Array<{
    label: string
    value: string | number
    unit?: string
    thresholdNote?: string
    isBreached?: boolean
  }>
  investigationRoute?: string
  viewFleetRoute?: string
}

export const InvestigationCard: React.FC<InvestigationCardProps> = ({
  equipmentId,
  equipmentName,
  location,
  conditionStatus,
  factualExplanation,
  telemetryEvidence = [],
  investigationRoute = `/equipment/${equipmentId}`,
  viewFleetRoute = '/equipment',
}) => {
  return (
    <div className="rounded-sm border border-red-200 bg-white p-5 sm:p-6 shadow-xs border-l-4 border-l-red-600 font-sans">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        {/* Left Information Column */}
        <div className="space-y-2 max-w-3xl">
          {/* Header pill & Equipment identifier */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-sm bg-red-50 border border-red-200 px-2 py-0.5 font-mono text-[11px] font-bold text-red-700">
              <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
              ATTENTION DETECTED
            </span>
            <span className="font-mono text-sm font-bold text-slate-900 tracking-wider">
              {equipmentId} · {equipmentName}
            </span>
            {location && (
              <span className="rounded-sm bg-slate-100 border border-slate-200 px-2 py-0.5 font-mono text-[10px] text-slate-600 font-medium">
                {location}
              </span>
            )}
            <span className="rounded-sm bg-slate-800 text-white px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider">
              CONDITION: {conditionStatus}
            </span>
          </div>

          {/* Short factual explanation based on actual project data */}
          <p className="text-xs text-slate-700 leading-relaxed font-medium">
            {factualExplanation}
          </p>

          {/* Telemetry Evidence Strip */}
          {telemetryEvidence.length > 0 && (
            <div className="pt-2 flex flex-wrap items-center gap-2">
              {telemetryEvidence.map((ev, idx) => (
                <div
                  key={idx}
                  className={`rounded-sm border px-2.5 py-1 text-xs font-mono ${
                    ev.isBreached
                      ? 'bg-red-50 border-red-200 text-red-800 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <span className="text-slate-500 font-normal mr-1">{ev.label}:</span>
                  <span>{ev.value} {ev.unit || ''}</span>
                  {ev.thresholdNote && (
                    <span className="text-[10px] text-slate-400 font-normal ml-1">
                      ({ev.thresholdNote})
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right CTA Buttons */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0 self-start lg:self-center">
          <Link
            to={investigationRoute}
            className="flex items-center gap-2 rounded-sm bg-primary hover:bg-blue-700 px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white shadow-xs transition-all"
          >
            <span>INVESTIGATE</span>
            <ArrowRight size={14} />
          </Link>

          <Link
            to={viewFleetRoute}
            className="flex items-center gap-1.5 rounded-sm border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 font-mono text-xs font-semibold text-slate-700 transition-all shadow-xs"
          >
            <span>VIEW EQUIPMENT</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default InvestigationCard
