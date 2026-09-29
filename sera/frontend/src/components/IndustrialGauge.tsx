import React from 'react'

export interface IndustrialGaugeProps {
  value: number
  unit: string
  label: string
  baseline?: number
  warning?: number
  alarm?: number
  trip?: number
  maxScale?: number
  showZoneLabels?: boolean
}

export const IndustrialGauge: React.FC<IndustrialGaugeProps> = ({
  value,
  unit,
  label,
  baseline = 3.0,
  warning = 7.1,
  alarm = 8.5,
  trip = 11.0,
  maxScale,
  showZoneLabels = true,
}) => {
  const effectiveMax = maxScale || Math.max(trip * 1.25, value * 1.15)
  const pct = Math.min(100, Math.max(0, (value / effectiveMax) * 100))
  const warningPct = (warning / effectiveMax) * 100
  const alarmPct = (alarm / effectiveMax) * 100
  const tripPct = (trip / effectiveMax) * 100

  const isTrip = value >= trip
  const isAlarm = value >= alarm && value < trip
  const isWarn = value >= warning && value < alarm
  const isNormal = value < warning

  const statusColor = isTrip
    ? 'text-red-700 bg-red-50 border-red-200'
    : isAlarm
    ? 'text-amber-700 bg-amber-50 border-amber-200'
    : isWarn
    ? 'text-amber-600 bg-amber-50/50 border-amber-200'
    : 'text-primary bg-blue-50 border-blue-200'

  const needleColor = isTrip
    ? 'bg-red-600 border-red-800'
    : isAlarm
    ? 'bg-amber-500 border-amber-700'
    : isWarn
    ? 'bg-amber-400 border-amber-600'
    : 'bg-primary border-blue-800'

  return (
    <div className="w-full font-sans space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-700 truncate">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="font-mono font-bold text-slate-900">
            {value} <span className="text-[11px] text-slate-500 font-sans">{unit}</span>
          </span>
          <span className={`rounded-sm border px-1.5 py-0.2 font-mono text-[9px] font-bold ${statusColor}`}>
            {isTrip ? 'TRIP' : isAlarm ? 'ALARM' : isWarn ? 'WARN' : 'NOMINAL'}
          </span>
        </div>
      </div>

      {/* Industrial Multi-Zone Gauge Bar */}
      <div className="relative h-3 w-full rounded-xs bg-slate-100 overflow-hidden border border-slate-200 flex">
        {/* Zone 1: Normal (Green/Blue) */}
        <div
          style={{ width: `${warningPct}%` }}
          className="h-full bg-emerald-100 border-r border-emerald-300"
          title={`Nominal Zone: 0 - ${warning} ${unit}`}
        />
        {/* Zone 2: Warning (Amber) */}
        <div
          style={{ width: `${alarmPct - warningPct}%` }}
          className="h-full bg-amber-100 border-r border-amber-300"
          title={`Warning Zone: ${warning} - ${alarm} ${unit}`}
        />
        {/* Zone 3: Alarm (Orange/Red) */}
        <div
          style={{ width: `${tripPct - alarmPct}%` }}
          className="h-full bg-orange-100 border-r border-red-300"
          title={`Alarm Zone: ${alarm} - ${trip} ${unit}`}
        />
        {/* Zone 4: Trip (Red) */}
        <div
          style={{ width: `${100 - tripPct}%` }}
          className="h-full bg-red-100"
          title={`Trip Limit: ≥ ${trip} ${unit}`}
        />

        {/* Dynamic Needle Marker */}
        <div
          style={{ left: `calc(${pct}% - 3px)` }}
          className={`absolute top-0 bottom-0 w-1.5 rounded-xs shadow-sm z-10 ${needleColor}`}
        />
      </div>

      {/* Scale Threshold Markers */}
      {showZoneLabels && (
        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 pt-0.5">
          <span>0</span>
          <span>Warn: {warning}</span>
          <span>Alarm: {alarm}</span>
          <span className="text-red-600 font-semibold">Trip: {trip}</span>
        </div>
      )}
    </div>
  )
}

export default IndustrialGauge
