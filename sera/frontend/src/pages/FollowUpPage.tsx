import React, { useState, useEffect } from 'react'
import { ShieldCheck, CheckCircle2, RefreshCw, Wrench } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { getFollowUps } from '../api/client'
import SectionHeader from '../components/SectionHeader'
import FollowUpCard, { FollowUpData } from '../components/FollowUpCard'
import MetricCard from '../components/MetricCard'
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

  useEffect(() => {
    fetchFollowUps()
  }, [])

  // Dynamic KPIs calculated from verified database records
  const totalVerified = followUps.length
  const vibReductions = followUps
    .map((f) => f.parameter_deltas?.vibration?.pct_reduction)
    .filter((v): v is number => typeof v === 'number' && !isNaN(v))
  const avgVibReduction = vibReductions.length > 0
    ? (vibReductions.reduce((a, b) => a + b, 0) / vibReductions.length).toFixed(1)
    : '0.0'

  const offsetReductions = followUps
    .map((f) => f.parameter_deltas?.coupling_offset?.pct_reduction)
    .filter((v): v is number => typeof v === 'number' && !isNaN(v))
  const avgOffsetReduction = offsetReductions.length > 0
    ? (offsetReductions.reduce((a, b) => a + b, 0) / offsetReductions.length).toFixed(1)
    : '0.0'

  const displayList = followUps

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t('navFollowUp')}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {t('followUpSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchFollowUps}
            disabled={loading}
            className="flex items-center gap-2 rounded-sm border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-primary hover:text-primary transition-all shadow-xs"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>{t('refresh')}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          title="Verified Work Orders"
          value={totalVerified}
          unit="Actions"
          subtitle="All post-maintenance checks"
          status="normal"
          icon={ShieldCheck}
        />
        <MetricCard
          title="Average Vibration Reduction"
          value={avgVibReduction !== '0.0' ? `-${Math.abs(Number(avgVibReduction))}` : '0.0'}
          unit="%"
          subtitle="Pre- vs post-turnaround"
          status="normal"
          trend="down"
          trendText="Condition Restored"
          icon={CheckCircle2}
        />
        <MetricCard
          title="Coupling Offset Recovery"
          value={avgOffsetReduction !== '0.0' ? `-${Math.abs(Number(avgOffsetReduction))}` : '0.0'}
          unit="%"
          subtitle="Precision alignment verification"
          status="normal"
          trend="down"
          trendText="Within tolerance (<0.05)"
          icon={Wrench}
        />
      </div>

      {/* Main Follow-up Records List */}
      <SectionHeader
        number="01"
        title="Post-Maintenance Verification Records"
        subtitle="Before vs after parameter comparison confirming condition restoration"
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchFollowUps} />
      ) : (
        <div className="space-y-4">
          {displayList.map((item, idx) => (
            <FollowUpCard key={item.id || idx} data={item} />
          ))}
        </div>
      )}
    </div>
  )
}

export default FollowUpPage
