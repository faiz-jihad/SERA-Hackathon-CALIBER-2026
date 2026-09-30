import React, { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { getFollowUps } from '../api/client'
import FollowUpCard, { FollowUpData } from '../components/FollowUpCard'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'

export const FollowUpPage: React.FC = () => {
  const { t } = useLanguage()
  const [followUps, setFollowUps] = useState<FollowUpData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFollowUps = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getFollowUps()
      setFollowUps(data)
    } catch (err: any) {
      setError(err?.message || 'Failed to load follow-up records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchFollowUps() }, [])

  // Calculated KPIs from real data
  const totalVerified = followUps.length
  const vibReductions = followUps
    .map(f => f.parameter_deltas?.vibration?.pct_reduction)
    .filter((v): v is number => typeof v === 'number' && !isNaN(v))
  const avgVibReduction = vibReductions.length > 0
    ? (vibReductions.reduce((a, b) => a + b, 0) / vibReductions.length).toFixed(1)
    : null

  const offsetReductions = followUps
    .map(f => f.parameter_deltas?.coupling_offset?.pct_reduction)
    .filter((v): v is number => typeof v === 'number' && !isNaN(v))
  const avgOffsetReduction = offsetReductions.length > 0
    ? (offsetReductions.reduce((a, b) => a + b, 0) / offsetReductions.length).toFixed(1)
    : null

  return (
    <div className="space-y-4 font-sans text-slate-800">

      {/* Page Header */}
      <div className="border-b border-slate-200 pb-3 flex items-end justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            {t('navFollowUp')}
          </h1>
          <p className="text-xs font-mono text-slate-500 mt-0.5">
            Post-maintenance verification — before vs. after parameter comparison
          </p>
        </div>
        <button
          onClick={fetchFollowUps}
          disabled={loading}
          className="flex items-center gap-1.5 border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-sm disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-3 gap-px border border-slate-200 bg-slate-200 rounded-sm overflow-hidden">
        <div className="bg-white px-4 py-3">
          <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
            {t('followUpKpiVerified')}
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-0.5">
            {loading ? '—' : totalVerified}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{t('followUpKpiVerifiedSub')}</div>
        </div>
        <div className="bg-white px-4 py-3">
          <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
            {t('followUpKpiVibReduction')}
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-0.5">
            {loading ? '—' : avgVibReduction != null ? `−${avgVibReduction}%` : 'DATA NOT AVAILABLE'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{t('followUpKpiVibSub')}</div>
        </div>
        <div className="bg-white px-4 py-3">
          <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
            {t('followUpKpiOffsetRecovery')}
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-0.5">
            {loading ? '—' : avgOffsetReduction != null ? `−${avgOffsetReduction}%` : 'DATA NOT AVAILABLE'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{t('followUpKpiOffsetSub')}</div>
        </div>
      </div>

      {/* Records */}
      <div className="border border-slate-200 bg-white rounded-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 flex items-center justify-between">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {t('followUpSectionTitle')}
          </span>
          <span className="font-mono text-[10px] text-slate-400">{followUps.length} records</span>
        </div>

        {loading ? (
          <LoadingState message="Loading verification records..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchFollowUps} />
        ) : followUps.length === 0 ? (
          <div className="px-6 py-10 text-center font-mono text-xs text-slate-400">
            No post-maintenance verification records found
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {followUps.map((item, idx) => (
              <FollowUpCard key={item.id || idx} data={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default FollowUpPage
