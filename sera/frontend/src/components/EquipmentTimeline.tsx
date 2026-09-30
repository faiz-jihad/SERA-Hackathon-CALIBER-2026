import React from 'react'
import { Calendar, CheckCircle2, AlertTriangle, AlertOctagon, Activity } from 'lucide-react'

export interface TimelinePhase {
  phase: string
  label: string
  status: 'NORMAL' | 'DEVIATION' | 'ATTENTION' | 'INVESTIGATION' | 'RESOLVED'
  period: string
  readingSummary: string
  isCurrent?: boolean
}

export interface EquipmentTimelineProps {
  phases?: TimelinePhase[]
}

export const EquipmentTimeline: React.FC<EquipmentTimelineProps> = ({ phases }) => {
  // Default verified historical progression for Case 2 BL-5702 if phases not supplied
  const defaultPhases: TimelinePhase[] = [
    {
      phase: 'PHASE 1',
      label: 'Baseline Operations',
      status: 'NORMAL',
      period: 'Jan 2026 — Feb 2026',
      readingSummary: 'Vibration < 4.0 mm/s, 2X harmonic 1.1 mm/s. All parameters nominal.',
    },
    {
      phase: 'PHASE 2',
      label: 'Early Telemetry Deviation',
      status: 'DEVIATION',
      period: 'Mar 2026 — Apr 2026',
      readingSummary: 'Coupling offset drifts to 0.054 mm (alarm). Vibration rises to 5.29 mm/s.',
    },
    {
      phase: 'PHASE 3',
      label: 'Progressive Escalation',
      status: 'ATTENTION',
      period: 'May 2026 — Jun 2026',
      readingSummary: '2X harmonic reaches 5.10 mm/s. Bearing DE temperature escalates to 96.9°C.',
    },
    {
      phase: 'PHASE 4',
      label: 'Operational Trip & Investigation',
      status: 'INVESTIGATION',
      period: '17 Jun 2026',
      readingSummary: 'Vibration hits 11.22 mm/s trip limit. Interlock event triggers AR-2026-OPP-0203.',
      isCurrent: true,
    },
  ]

  const activePhases = phases && phases.length > 0 ? phases : defaultPhases

  const statusColors = {
    NORMAL: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500',
    DEVIATION: 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500',
    ATTENTION: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500',
    INVESTIGATION: 'bg-red-50 text-red-700 border-red-200 ring-red-500',
    RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500',
  }

  return (
    <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs font-sans">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-4">
        <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Historical Timeline & Condition Evolution
        </span>
        <span className="font-mono text-[10px] text-slate-400">
          Source: Verified Case 2 Records
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
        {activePhases.map((p, idx) => {
          const color = statusColors[p.status] || statusColors.NORMAL
          return (
            <div
              key={idx}
              className={`rounded-sm border p-3 flex flex-col justify-between ${
                p.isCurrent
                  ? 'border-red-300 bg-red-50/20 shadow-xs ring-1 ring-red-200'
                  : 'border-slate-200 bg-slate-50/60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[10px] text-slate-400 font-semibold">
                    {p.phase}
                  </span>
                  <span className={`rounded-sm border px-1.5 py-0.2 font-mono text-[9px] font-bold ${color}`}>
                    {p.status}
                  </span>
                </div>

                <h5 className="text-xs font-bold text-slate-900 leading-tight">
                  {p.label}
                </h5>

                <div className="mt-1 flex items-center gap-1 font-mono text-[10px] text-slate-500">
                  <Calendar size={11} className="text-slate-400" />
                  <span>{p.period}</span>
                </div>

                <p className="mt-2 text-[11px] text-slate-600 leading-relaxed font-mono">
                  {p.readingSummary}
                </p>
              </div>

              {p.isCurrent && (
                <div className="mt-3 pt-2 border-t border-red-200 text-[10px] font-mono font-bold text-red-700 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
                  <span>ACTIVE INVESTIGATION STAGE</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default EquipmentTimeline
