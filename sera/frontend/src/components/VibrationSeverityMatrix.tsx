import React from 'react'
import { Activity, AlertTriangle, ShieldCheck, Gauge } from 'lucide-react'

export interface VibrationSeverityMatrixProps {
  currentValue?: number
  equipmentId?: string
}

export const VibrationSeverityMatrix: React.FC<VibrationSeverityMatrixProps> = ({
  currentValue = 0,
  equipmentId = 'Asset',
}) => {
  const zones = [
    {
      zone: 'Zone A',
      range: '0.00 – 2.30 mm/s',
      status: 'Newly Commissioned / Good',
      color: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      badge: 'bg-emerald-600 text-white',
      desc: 'Machine in prime operational condition without restrictions.',
      active: currentValue <= 2.3,
    },
    {
      zone: 'Zone B',
      range: '2.31 – 4.50 mm/s',
      status: 'Acceptable / Nominal',
      color: 'bg-blue-50 border-blue-200 text-blue-800',
      badge: 'bg-primary text-white',
      desc: 'Machine acceptable for unrestricted long-term continuous operation.',
      active: currentValue > 2.3 && currentValue <= 4.5,
    },
    {
      zone: 'Zone C',
      range: '4.51 – 7.10 mm/s',
      status: 'Warning / Unsatisfactory',
      color: 'bg-amber-50 border-amber-200 text-amber-800',
      badge: 'bg-amber-600 text-white',
      desc: 'Remedial maintenance action required; limited continuous run time.',
      active: currentValue > 4.5 && currentValue <= 7.1,
    },
    {
      zone: 'Zone D',
      range: '> 7.10 mm/s (Trip: 11.0)',
      status: 'Unacceptable / Trip Danger',
      color: 'bg-red-50 border-red-300 text-red-900 ring-2 ring-red-400',
      badge: 'bg-red-600 text-white',
      desc: 'High risk of catastrophic structural/bearing failure; immediate shutdown.',
      active: currentValue > 7.1,
    },
  ]

  return (
    <div className="rounded-sm border border-slate-200 bg-white p-5 sm:p-6 shadow-xs font-sans space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-3 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-primary bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-sm">
              ISO 10816-3 STANDARD
            </span>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
              Vibration Severity Zone Evaluation (Class III/IV Rigid)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Standard velocity thresholds for large rotating industrial machinery (&gt; 300 kW)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 border border-slate-200 px-3 py-1 rounded-sm">
            {equipmentId}: <strong className="text-red-600">{currentValue} mm/s RMS</strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {zones.map((z) => (
          <div
            key={z.zone}
            className={`rounded-sm border p-3.5 flex flex-col justify-between transition-all ${
              z.active ? z.color + ' shadow-xs' : 'border-slate-200 bg-slate-50/50 opacity-70'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs">{z.zone}</span>
                <span className={`rounded-xs px-1.5 py-0.2 font-mono text-[9px] font-bold ${z.badge}`}>
                  {z.active ? 'CURRENT STATE' : z.range}
                </span>
              </div>
              <div className="font-semibold text-xs mb-1">{z.status}</div>
              <div className="font-mono text-[10px] text-slate-500 mb-2">{z.range}</div>
              <p className="text-[11px] leading-relaxed text-slate-600">{z.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default VibrationSeverityMatrix
