import React from 'react'
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import IndustrialGauge from './IndustrialGauge'

export interface MetricCardProps {
  title: string
  value: string | number
  unit?: string
  subtitle?: string
  tag?: string
  trend?: 'up' | 'down' | 'neutral' | string
  trendText?: string
  status?: 'normal' | 'warning' | 'critical' | 'info' | 'neutral'
  icon?: LucideIcon
  onClick?: () => void
  highlight?: boolean
  gaugeConfig?: {
    baseline?: number
    warning?: number
    alarm?: number
    trip?: number
    maxScale?: number
  }
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  tag,
  trend,
  trendText,
  status = 'neutral',
  icon: Icon,
  onClick,
  highlight = false,
  gaugeConfig,
}) => {
  const statusBorder = {
    normal: 'border-slate-200 hover:border-primary',
    warning: 'border-amber-300 bg-amber-50/10 hover:border-amber-400',
    critical: 'border-red-300 bg-red-50/15 hover:border-red-400 ring-1 ring-red-200',
    info: 'border-blue-200 hover:border-primary',
    neutral: 'border-slate-200 hover:border-primary/50',
  }[status]

  const statusValColor = {
    normal: 'text-slate-900',
    warning: 'text-amber-700',
    critical: 'text-red-700',
    info: 'text-primary',
    neutral: 'text-slate-900',
  }[status]

  const statusPill = {
    normal: 'bg-blue-50 text-primary border-blue-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    critical: 'bg-red-50 text-red-700 border-red-200 font-bold',
    info: 'bg-blue-50 text-primary border-blue-200',
    neutral: 'bg-slate-50 text-slate-600 border-slate-200',
  }[status]

  const numVal = typeof value === 'number' ? value : parseFloat(String(value))

  return (
    <div
      onClick={onClick}
      className={`rounded-sm border bg-white p-4 shadow-xs transition-all duration-150 flex flex-col justify-between ${statusBorder} ${
        onClick ? 'cursor-pointer hover:bg-slate-50/50' : ''
      } ${highlight ? 'ring-2 ring-primary/40' : ''}`}
    >
      <div>
        {/* Card Header: Tag / Title & Status */}
        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2 mb-3">
          <div>
            <div className="flex items-center gap-1.5">
              {tag && (
                <span className="font-mono text-[10px] font-bold text-slate-400 uppercase">
                  {tag}
                </span>
              )}
            </div>
            <h4 className="text-xs font-bold text-slate-800 tracking-tight leading-snug">
              {title}
            </h4>
          </div>

          <span className={`rounded-sm border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider shrink-0 ${statusPill}`}>
            {status === 'critical' ? 'CRITICAL' : status === 'warning' ? 'WARN' : status === 'normal' ? 'NOMINAL' : status}
          </span>
        </div>

        {/* Value Display */}
        <div className="flex items-baseline justify-between mb-2">
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight ${statusValColor}`}>
              {value}
            </span>
            {unit && (
              <span className="font-mono text-xs font-semibold text-slate-500">
                {unit}
              </span>
            )}
          </div>

          {trendText && (
            <div className="flex items-center gap-1 font-mono text-xs font-semibold shrink-0">
              {trend === 'up' && (
                <span className="flex items-center gap-0.5 text-red-600">
                  {trendText} <TrendingUp size={13} />
                </span>
              )}
              {trend === 'down' && (
                <span className="flex items-center gap-0.5 text-primary">
                  {trendText} <TrendingDown size={13} />
                </span>
              )}
              {trend === 'neutral' && (
                <span className="flex items-center gap-0.5 text-slate-400">
                  {trendText} <Minus size={13} />
                </span>
              )}
            </div>
          )}
        </div>

        {/* Optional Embedded Gauge Bar */}
        {gaugeConfig && !isNaN(numVal) && (
          <div className="my-2 pt-1 border-t border-slate-100">
            <IndustrialGauge
              value={numVal}
              unit={unit || ''}
              label=""
              warning={gaugeConfig.warning}
              alarm={gaugeConfig.alarm}
              trip={gaugeConfig.trip}
              maxScale={gaugeConfig.maxScale}
              showZoneLabels={false}
            />
          </div>
        )}
      </div>

      {/* Subtitle / Limit Metadata */}
      {subtitle && (
        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span className="truncate">{subtitle}</span>
        </div>
      )}
    </div>
  )
}

export default MetricCard
