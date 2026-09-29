import React, { useState, useEffect } from 'react'
import { RefreshCw, Wrench, ShieldCheck, ArrowRight } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { getRecommendations, reviewRecommendation, RecommendationRecord } from '../api/client'
import StatusBadge from '../components/StatusBadge'
import ReviewPanel from '../components/ReviewPanel'
import WorkOrderCard from '../components/WorkOrderCard'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'

export const RecommendationsPage: React.FC = () => {
  const { t } = useLanguage()
  const [recommendations, setRecommendations] = useState<RecommendationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRec, setSelectedRec] = useState<RecommendationRecord | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('ALL')

  const fetchRecommendations = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getRecommendations()
      setRecommendations(data)
      if (data.length > 0 && !selectedRec) {
        setSelectedRec(data[0])
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load recommendations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecommendations()
  }, [])

  const filtered = recommendations.filter((r) => {
    if (filterStatus === 'ALL') return true
    return r.review_status === filterStatus
  })

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t('navRecommendations')}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Evidence-backed Corrective & Preventive Action Plans requiring Lead Engineer Authorization
          </p>
        </div>

        <button
          onClick={fetchRecommendations}
          disabled={loading}
          className="flex items-center gap-2 self-start sm:self-auto rounded-sm border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-primary hover:text-primary transition-all shadow-xs"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>{t('refresh')}</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 rounded-sm border border-slate-200 bg-white p-2 text-xs shadow-xs">
        {['ALL', 'PENDING', 'ACCEPTED', 'MODIFIED', 'REJECTED'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3 py-1.5 rounded-sm font-mono text-xs font-semibold transition-all ${
              filterStatus === st
                ? 'bg-primary text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-primary hover:bg-blue-50'
            }`}
          >
            {st === 'ALL' ? 'All Plans' : st}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchRecommendations} />
      ) : recommendations.length === 0 ? (
        <EmptyState title="No active recommendation plans pending review." />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* List Column */}
          <div className="lg:col-span-5 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Select Action Plan ({filtered.length}):
            </span>

            {filtered.map((rec) => {
              const isSelected = selectedRec?.id === rec.id
              return (
                <div
                  key={rec.id}
                  onClick={() => setSelectedRec(rec)}
                  className={`cursor-pointer rounded-sm border p-4 transition-all duration-150 shadow-xs ${
                    isSelected
                      ? 'border-primary bg-blue-50/60 ring-1 ring-primary'
                      : 'border-slate-200 bg-white hover:border-primary hover:bg-blue-50/30'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-2.5">
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {rec.equipment_id}
                    </span>
                    <StatusBadge status={rec.review_status} size="sm" />
                  </div>

                  <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed mb-2.5 font-medium">
                    {rec.problem_summary}
                  </p>

                  <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                    <span>{rec.generated_at ? rec.generated_at.slice(0, 10) : 'Recent'}</span>
                    <span className="text-primary font-sans font-semibold flex items-center gap-1">
                      <span>View Scope</span>
                      <ArrowRight size={13} />
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Detail & Review Column */}
          <div className="lg:col-span-7 space-y-4">
            {selectedRec ? (
              <div className="space-y-4">
                {/* SAP PM01 Maintenance Work Order Card */}
                <WorkOrderCard
                  equipmentId={selectedRec.equipment_id}
                  workOrderNo={`WO-2026-${selectedRec.equipment_id.replace(/[^0-9]/g, '') || '0101'}`}
                  notificationNo={`NOTIF-${selectedRec.equipment_id}-01`}
                  correctiveAction={selectedRec.corrective_action}
                  preventiveAction={selectedRec.preventive_action}
                  priority={selectedRec.review_status === 'REJECTED' ? 'P3 - Medium' : 'P1 - Emergency'}
                  downtimeHours={4.0}
                />

                {/* Interactive Engineer Review Box */}
                <ReviewPanel
                  recommendationId={selectedRec.id}
                  equipmentId={selectedRec.equipment_id}
                  currentStatus={selectedRec.review_status}
                  initialAction={selectedRec.final_action || selectedRec.corrective_action}
                  initialNotes={selectedRec.engineer_notes || ''}
                  initialReviewer={selectedRec.reviewed_by || 'Lead Reliability Engineer'}
                  onSubmitReview={async (payload) => {
                    const res = await reviewRecommendation(selectedRec.id, payload)
                    await fetchRecommendations()
                    return res
                  }}
                />
              </div>
            ) : (
              <EmptyState title="Select a recommendation to inspect" />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default RecommendationsPage
