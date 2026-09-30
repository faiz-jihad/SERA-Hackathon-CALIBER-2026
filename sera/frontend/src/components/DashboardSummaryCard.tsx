import React from 'react'
import { LucideIcon } from 'lucide-react'

export interface DashboardSummaryCardProps {
  title: string
  value: number | string
  unit?: string
  subtitle?: string
  status?: 'normal' | 'attention' | 'neutral' | 'warning'
  icon?: LucideIcon
}

export const DashboardSummaryCard: React.FC<DashboardSummaryCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  status = 'neutral',
  icon: Icon,
}) => {
  const statusStyles = {
    normal: {
      border: 'border-emerald-200',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      valColor: 'text-emerald-700',
      indicator: 'bg-emerald-500',
    },
    attention: {
      border: 'border-red-200',
      badgeBg: 'bg-red-50 text-red-700 border-red-200',
      valColor: 'text-red-700',
      indicator: 'bg-red-500',
    },
    warning: {
      border: 'border-amber-200',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
      valColor: 'text-amber-700',
      indicator: 'bg-amber-500',
    },
    neutral: {
      border: 'border-slate-200',
      badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
      valColor: 'text-slate-900',
      indicator: 'bg-slate-400',
    },
  }[status]

  const isDataUnavailable = value === null || value === undefined || value === 'DATA NOT AVAILABLE'

  return (
    <div className={`rounded-sm border ${statusStyles.border} bg-white p-4 shadow-xs transition-all hover:border-primary/40`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
          {title}
        </span>
        {Icon && (
          <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-slate-50 text-slate-500 border border-slate-200">
            <Icon size={14} />
          </div>
        )}
      </div>

      <div className="mt-2.5 flex items-baseline gap-2">
        {isDataUnavailable ? (
          <span className="font-mono text-xs font-semibold text-slate-400">
            DATA NOT AVAILABLE
          </span>
        ) : (
          <>
            <span className={`font-mono text-2xl font-bold tracking-tight ${statusStyles.valColor}`}>
              {value}
            </span>
            {unit && (
              <span className="text-xs font-mono text-slate-500 font-medium">
                {unit}
              </span>
            )}
          </>
        )}
      </div>

      {subtitle && (
        <div className="mt-2 flex items-center gap-1.5 pt-2 border-t border-slate-100">
          <span className={`h-1.5 w-1.5 rounded-full ${statusStyles.indicator}`} />
          <span className="text-[11px] text-slate-500 truncate font-medium">
            {subtitle}
          </span>
        </div>
      )}
    </div>
  )
}

export default DashboardSummaryCard
