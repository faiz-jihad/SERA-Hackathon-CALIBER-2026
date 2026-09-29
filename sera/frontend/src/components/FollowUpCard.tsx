import React from 'react'
import { ShieldCheck, CheckCircle2, ArrowDownRight } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import StatusBadge from './StatusBadge'

export interface FollowUpData {
  id?: string
  equipment_id: string
  maintenance_date?: string
  action_taken: string
  before_condition: Record<string, any>
  after_condition: Record<string, any>
  verification_result: string
  parameter_deltas?: Record<string, { before: number; after: number; reduction: number; pct_reduction: number }>
  engineer_notes?: string
  verified_by?: string
  verified_at?: string
}

export const FollowUpCard: React.FC<{ data: FollowUpData }> = ({ data }) => {
  const { t } = useLanguage()

  const isVerified = data.verification_result === 'VERIFIED' || data.verification_result === 'VERIFIED_RECOVERED'

  const paramLabels: Record<string, { label: string; unit: string }> = {
    vibration: { label: t('paramVibration'), unit: 'mm/s' },
    coupling_offset: { label: t('paramCouplingOffset'), unit: 'mm' },
    harmonic_2x: { label: t('paramHarmonic2X'), unit: 'mm/s' },
    bearing_temperature: { label: t('paramBearingTemp'), unit: '°C' },
  }

  return (
    <div className="rounded-sm border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className={isVerified ? 'text-primary' : 'text-amber-600'} />
            <h3 className="text-sm font-bold tracking-tight text-slate-900 uppercase">
              {t('followUpTitle')}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{t('followUpSubtitle')}</p>
        </div>
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <StatusBadge status={data.verification_result} size="md" />
        </div>
      </div>

      {/* Outcome Banner */}
      <div
        className={`rounded-sm p-3.5 border flex items-start gap-3 ${
          isVerified
            ? 'bg-blue-50 border-blue-200 text-blue-900'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}
      >
        <CheckCircle2 size={16} className="text-primary shrink-0 mt-0.5" />
        <div className="text-xs">
          <div className="font-bold tracking-wider uppercase text-primary">
            {t('recoveredText')}
          </div>
          <p className="mt-0.5 text-slate-700 font-medium">{data.action_taken}</p>
        </div>
      </div>

      {/* Before vs After Comparison Table */}
      <div className="max-w-full overflow-x-auto">
        <table className="w-full table-auto text-left text-xs">
          <thead>
            <tr className="bg-slate-50 text-left border-b border-slate-200">
              <th className="py-3 px-4 font-semibold uppercase text-slate-600 tracking-wider">{t('colParamName')}</th>
              <th className="py-3 px-4 font-mono text-right font-semibold uppercase text-red-600 tracking-wider">{t('colBeforeVal')}</th>
              <th className="py-3 px-4 font-mono text-right font-semibold uppercase text-primary tracking-wider">{t('colAfterVal')}</th>
              <th className="py-3 px-4 font-mono text-right font-semibold uppercase text-slate-600 tracking-wider">{t('colReduction')}</th>
              <th className="py-3 px-4 font-mono text-right font-semibold uppercase text-primary tracking-wider">{t('colPctReduction')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {data.parameter_deltas &&
              Object.entries(data.parameter_deltas).map(([param, delta]) => {
                const meta = paramLabels[param] || { label: param.replace(/_/g, ' '), unit: '' }
                return (
                  <tr key={param} className="border-b border-slate-100 hover:bg-blue-50/40 transition-colors">
                    <td className="py-3.5 px-4 font-sans font-semibold text-slate-900">{meta.label}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-red-600">
                      {delta.before} <span className="text-[10px] text-slate-400 font-sans">{meta.unit}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-primary">
                      {delta.after} <span className="text-[10px] text-slate-400 font-sans">{meta.unit}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-700 font-semibold">
                      -{delta.reduction} <span className="text-[10px] text-slate-400 font-sans">{meta.unit}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-primary">
                      <span className="inline-flex items-center gap-0.5">
                        <ArrowDownRight size={14} />
                        {delta.pct_reduction}%
                      </span>
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>

      {/* Engineer Verification Sign-Off */}
      <div className="rounded-sm border border-slate-200 bg-slate-50 p-3.5 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t('verifiedByLabel')}:</span>
          <p className="font-semibold text-slate-900 mt-0.5">{data.verified_by || 'Lead Reliability Engineer'}</p>
          {data.engineer_notes && <p className="text-slate-600 mt-1 italic font-mono">"{data.engineer_notes}"</p>}
        </div>
        {data.maintenance_date && (
          <div className="text-right shrink-0">
            <span className="text-[11px] font-mono text-slate-500">
              {new Date(data.maintenance_date).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default FollowUpCard
