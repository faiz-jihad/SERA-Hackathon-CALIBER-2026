import React from 'react'
import { ShieldCheck, CheckCircle2, ArrowDownRight, Tag } from 'lucide-react'
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

const ASSET_NAMES: Record<string, { name: string; plant: string }> = {
  'BL-5702': { name: 'Product Blower', plant: 'Orion Polypropylene (OPP) — Powder Handling' },
  'PU-2101B': { name: 'Quench Water Pump', plant: 'Aromatic Plant (ARP)' },
  'KO-3201': { name: 'Synthesis Gas Compressor', plant: 'ZCU Plant' },
  'PM-4405B': { name: 'Slurry Transfer Pump', plant: 'NUP Plant' },
  'HE-3301': { name: 'Process Heat Exchanger', plant: 'ZCU Plant' },
}

export const FollowUpCard: React.FC<{ data: FollowUpData }> = ({ data }) => {
  const { t } = useLanguage()

  const isVerified = data.verification_result === 'VERIFIED' || data.verification_result === 'VERIFIED_RECOVERED'
  const assetInfo = ASSET_NAMES[data.equipment_id] || { name: 'Rotating Equipment', plant: 'Plant Facility' }

  const paramLabels: Record<string, { label: string; unit: string; target: string }> = {
    vibration: { label: t('paramVibration'), unit: 'mm/s', target: '< 4.5 (Zone A/B)' },
    coupling_offset: { label: t('paramCouplingOffset'), unit: 'mm', target: '< 0.050 (API 686)' },
    harmonic_2x: { label: t('paramHarmonic2X'), unit: 'mm/s', target: '< 1.50 (Normal)' },
    bearing_temperature: { label: t('paramBearingTemp'), unit: '°C', target: '< 70.0 (Normal)' },
    bearing_temp: { label: t('paramBearingTemp'), unit: '°C', target: '< 70.0 (Normal)' },
  }

  return (
    <div className="p-5 sm:p-6 space-y-4">
      {/* Card Header with Asset Identification */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded-sm bg-slate-900 text-white flex items-center gap-1">
              <Tag size={11} />
              {data.equipment_id}
            </span>
            <h3 className="text-sm font-bold tracking-tight text-slate-900">
              {assetInfo.name} — {t('followUpTitle')}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {assetInfo.plant} • {t('followUpSubtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1 sm:mt-0">
          <StatusBadge status={data.verification_result} size="md" />
        </div>
      </div>

      {/* Outcome Banner */}
      <div
        className={`rounded-sm p-3.5 border flex items-start gap-3 ${
          isVerified
            ? 'bg-blue-50/70 border-blue-200 text-blue-950'
            : 'bg-amber-50 border-amber-200 text-amber-950'
        }`}
      >
        <CheckCircle2 size={16} className="text-primary shrink-0 mt-0.5" />
        <div className="text-xs space-y-0.5">
          <div className="font-bold tracking-wider uppercase text-primary text-[11px]">
            {t('recoveredText')}
          </div>
          <p className="text-slate-700 leading-relaxed font-medium">{data.action_taken}</p>
        </div>
      </div>

      {/* Before vs After Comparison Table */}
      <div className="border border-slate-200 rounded-sm overflow-hidden bg-white">
        <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between text-[11px] font-mono">
          <span className="font-bold uppercase tracking-wider text-slate-600">
            Physical Sensor Parameter Delta (Pre-Turnaround vs Post-Turnaround Baseline)
          </span>
          <span className="text-slate-400">ISO 10816-3 & API 686 Standard</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-auto text-left text-xs">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-600">
                <th className="py-2.5 px-4 font-semibold uppercase tracking-wider">{t('colParamName')}</th>
                <th className="py-2.5 px-4 font-mono text-right font-semibold uppercase text-red-700 tracking-wider">
                  {t('colBeforeVal')} (Pre-Repair)
                </th>
                <th className="py-2.5 px-4 font-mono text-right font-semibold uppercase text-primary tracking-wider">
                  {t('colAfterVal')} (Restored)
                </th>
                <th className="py-2.5 px-4 font-mono text-right font-semibold uppercase text-slate-500 tracking-wider">
                  Acceptance Target
                </th>
                <th className="py-2.5 px-4 font-mono text-right font-semibold uppercase text-slate-700 tracking-wider">
                  Delta ({t('colReduction')})
                </th>
                <th className="py-2.5 px-4 font-mono text-right font-semibold uppercase text-primary tracking-wider">
                  % Recovery
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {data.parameter_deltas &&
                Object.entries(data.parameter_deltas).map(([param, delta]) => {
                  const meta = paramLabels[param] || {
                    label: param.replace(/_/g, ' '),
                    unit: '',
                    target: 'Within Limits',
                  }
                  const absReduction = Math.abs(delta.reduction)
                  const absPct = Math.abs(delta.pct_reduction)
                  return (
                    <tr key={param} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-sans font-semibold text-slate-900">{meta.label}</td>
                      <td className="py-3 px-4 text-right font-bold text-red-700">
                        {delta.before} <span className="text-[10px] text-slate-400 font-sans">{meta.unit}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-primary">
                        {delta.after} <span className="text-[10px] text-slate-400 font-sans">{meta.unit}</span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500 text-[11px]">
                        {meta.target}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700 font-semibold">
                        −{absReduction.toFixed(3)} <span className="text-[10px] text-slate-400 font-sans">{meta.unit}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700">
                        <span className="inline-flex items-center gap-0.5">
                          <ArrowDownRight size={13} />
                          {absPct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Engineer Verification Sign-Off */}
      <div className="rounded-sm border border-slate-200 bg-slate-50 p-3.5 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[10px] uppercase font-bold tracking-wider">
            <ShieldCheck size={13} className="text-primary" />
            <span>{t('verifiedByLabel')}:</span>
            <span className="text-slate-900 font-sans font-bold text-xs">
              {data.verified_by || 'Lead Reliability Engineer'}
            </span>
          </div>
          {data.engineer_notes && (
            <p className="text-slate-700 italic font-mono text-[11px] bg-white border border-slate-200 p-2 rounded-sm">
              "{data.engineer_notes}"
            </p>
          )}
        </div>
        {data.maintenance_date && (
          <div className="text-left sm:text-right shrink-0 font-mono text-slate-500 text-[11px]">
            <div>Turnaround Date:</div>
            <div className="font-bold text-slate-800">
              {new Date(data.maintenance_date).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default FollowUpCard
