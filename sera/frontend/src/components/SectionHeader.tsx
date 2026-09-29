import React from 'react'

export interface SectionHeaderProps {
  number?: string
  title: string
  subtitle?: string
  badge?: React.ReactNode
  action?: React.ReactNode
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  number,
  title,
  subtitle,
  badge,
  action,
}) => {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-200 pb-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2.5">
        {number && (
          <span className="mt-0.5 rounded-sm bg-blue-50 border border-blue-200 px-2 py-0.5 font-mono text-xs font-bold text-primary">
            {number}
          </span>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold tracking-tight text-slate-900">{title}</h2>
            {badge}
          </div>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500 font-medium">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="mt-2 shrink-0 sm:mt-0">{action}</div>}
    </div>
  )
}

export default SectionHeader
