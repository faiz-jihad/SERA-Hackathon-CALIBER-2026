import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import StatusBadge from './StatusBadge'

export interface WhatChangedRow {
  parameter: string
  parameter_key?: string
  unit: string
  baseline_value: number
  previous_value: number
  current_value: number
  absolute_change: number
  percentage_change: number
  delta_from_baseline?: number
  trend: 'Increasing' | 'Decreasing' | 'Stable' | string
  status: string
}

export interface WhatChangedTableProps {
  data: WhatChangedRow[]
  summary?: string
  currentPeriod?: string
  previousPeriod?: string
}

export const WhatChangedTable: React.FC<WhatChangedTableProps> = ({
  data,
  summary,
  currentPeriod = 'Current (Week 21)',
  previousPeriod = 'Previous (Week 20)',
}) => {
  const { t } = useLanguage()

  return (
    <div className="rounded-sm border border-slate-200 bg-white px-5 pt-6 pb-4 shadow-sm sm:px-7.5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold tracking-tight text-slate-900 uppercase">
            {t('whatChangedTitle')}
          </h3>
          <p className="text-xs text-slate-500">{t('whatChangedSubtitle')}</p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-slate-600">
          <span className="rounded-sm bg-slate-100 border border-slate-200 px-2.5 py-1">{previousPeriod}</span>
          <span>→</span>
          <span className="rounded-sm bg-red-50 border border-red-200 text-red-700 font-semibold px-2.5 py-1">
            {currentPeriod}
          </span>
        </div>
      </div>

      {summary && (
        <div className="mb-4 rounded-sm border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 font-medium">
          <span className="font-bold uppercase tracking-wider text-amber-900 mr-2">
            Observation Summary:
          </span>
          {summary}
        </div>
      )}

      <div className="max-w-full overflow-x-auto">
        <table className="w-full table-auto text-left text-xs">
          <thead>
            <tr className="bg-slate-50 text-left border-b border-slate-200">
              <th className="py-3.5 px-4 font-semibold uppercase text-slate-600 tracking-wider">{t('colParameter')}</th>
              <th className="py-3.5 px-4 font-mono text-right font-semibold uppercase text-slate-600 tracking-wider">{t('colBaseline')}</th>
              <th className="py-3.5 px-4 font-mono text-right font-semibold uppercase text-slate-600 tracking-wider">{t('colPrevious')}</th>
              <th className="py-3.5 px-4 font-mono text-right font-semibold uppercase text-slate-600 tracking-wider">{t('colCurrent')}</th>
              <th className="py-3.5 px-4 font-mono text-right font-semibold uppercase text-slate-600 tracking-wider">{t('colChange')}</th>
              <th className="py-3.5 px-4 font-mono text-right font-semibold uppercase text-slate-600 tracking-wider">{t('colPctChange')}</th>
              <th className="py-3.5 px-4 font-semibold uppercase text-slate-600 tracking-wider">{t('colTrendDirection')}</th>
              <th className="py-3.5 px-4 text-center font-semibold uppercase text-slate-600 tracking-wider">{t('colSeverity')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {data.map((row, idx) => {
              const isPositiveChange = row.absolute_change > 0
              const isCritical = row.status === 'CRITICAL' || row.status === 'TRIP'
              const isAlarm = row.status === 'ALARM' || row.status === 'WARNING'

              return (
                <tr
                  key={row.parameter_key || idx}
                  className={`border-b border-slate-100 transition-colors hover:bg-blue-50/40 ${
                    isCritical ? 'bg-red-50/30' : isAlarm ? 'bg-amber-50/30' : ''
                  }`}
                >
                  <td className="py-3.5 px-4 font-sans font-semibold text-slate-900">
                    {row.parameter}
                  </td>
                  <td className="py-3.5 px-4 text-right text-slate-500">
                    {row.baseline_value} <span className="text-[10px] text-slate-400 font-sans">{row.unit}</span>
                  </td>
                  <td className="py-3.5 px-4 text-right text-slate-700">
                    {row.previous_value} <span className="text-[10px] text-slate-400 font-sans">{row.unit}</span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                    {row.current_value} <span className="text-[10px] text-slate-400 font-sans">{row.unit}</span>
                  </td>
                  <td
                    className={`py-3.5 px-4 text-right font-bold ${
                      isPositiveChange ? 'text-red-600' : row.absolute_change < 0 ? 'text-primary' : 'text-slate-500'
                    }`}
                  >
                    {isPositiveChange ? `+${row.absolute_change}` : row.absolute_change}
                  </td>
                  <td
                    className={`py-3.5 px-4 text-right font-bold ${
                      isPositiveChange ? 'text-red-600' : row.percentage_change < 0 ? 'text-primary' : 'text-slate-500'
                    }`}
                  >
                    {row.percentage_change > 0 ? `+${row.percentage_change}%` : `${row.percentage_change}%`}
                  </td>
                  <td className="py-3.5 px-4 font-sans">
                    <div className="flex items-center gap-1.5">
                      {row.trend === 'Increasing' && <TrendingUp size={14} className="text-red-600" />}
                      {row.trend === 'Decreasing' && <TrendingDown size={14} className="text-primary" />}
                      {row.trend === 'Stable' && <Minus size={14} className="text-slate-400" />}
                      <span
                        className={`text-xs ${
                          row.trend === 'Increasing'
                            ? 'text-red-700 font-medium'
                            : row.trend === 'Decreasing'
                            ? 'text-primary font-medium'
                            : 'text-slate-500'
                        }`}
                      >
                        {row.trend}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <StatusBadge status={row.status} size="sm" />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default WhatChangedTable
