import React, { useState, useEffect } from 'react'
import { RefreshCw, ChevronRight } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { getRecommendations, reviewRecommendation, RecommendationRecord } from '../api/client'
import ReviewPanel from '../components/ReviewPanel'
import WorkOrderCard from '../components/WorkOrderCard'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'

const STATUS_OPTIONS = ['ALL', 'PENDING', 'ACCEPTED', 'MODIFIED', 'REJECTED']

function statusBadgeClass(s: string) {
  if (s === 'ACCEPTED') return 'text-emerald-700 bg-emerald-50 border-emerald-300'
  if (s === 'REJECTED') return 'text-red-700 bg-red-50 border-red-300'
  if (s === 'MODIFIED') return 'text-amber-700 bg-amber-50 border-amber-300'
  return 'text-slate-600 bg-slate-50 border-slate-300'
}

export const RecommendationsPage: React.FC = () => {
  const { t } = useLanguage()
  const [recommendations, setRecommendations] = useState<RecommendationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRec, setSelectedRec] = useState<RecommendationRecord | null>(null)
  const [filterStatus, setFilterStatus] = useState('ALL')

  const fetchRecommendations = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getRecommendations()
      setRecommendations(data)
      if (data.length > 0 && !selectedRec) setSelectedRec(data[0])
    } catch (err: any) {
      setError(err?.message || 'Failed to load recommendations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRecommendations() }, [])

  const filtered = recommendations.filter(r =>
    filterStatus === 'ALL' || r.review_status === filterStatus
  )

  const counts = STATUS_OPTIONS.slice(1).reduce((acc, s) => {
    acc[s] = recommendations.filter(r => r.review_status === s).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-4 font-sans text-slate-800">

      {/* Page Header */}
      <div className="border-b border-slate-200 pb-3 flex items-end justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            {t('navRecommendations')}
          </h1>
          <p className="text-xs font-mono text-slate-500 mt-0.5">
            Evidence-backed corrective & preventive action plans requiring Lead Engineer authorization
          </p>
        </div>
        <button
          onClick={fetchRecommendations}
          disabled={loading}
          className="flex items-center gap-1.5 border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-sm disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Status Filter Bar */}
      <div className="flex items-center gap-px border border-slate-200 bg-slate-200 rounded-sm overflow-hidden w-fit">
        {STATUS_OPTIONS.map(st => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3 py-1.5 text-[11px] font-mono font-semibold transition-colors ${
              filterStatus === st
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {st === 'ALL' ? `All (${recommendations.length})` : `${st} (${counts[st] || 0})`}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState message="Loading action plans..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchRecommendations} />
      ) : recommendations.length === 0 ? (
        <div className="border border-slate-200 bg-white rounded-sm px-6 py-10 text-center">
          <p className="font-mono text-xs text-slate-400">No active recommendation plans pending review</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* Left: List */}
          <div className="lg:col-span-4">
            <div className="border border-slate-200 bg-white rounded-sm">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Action Plans
                </span>
                <span className="font-mono text-[10px] text-slate-400">{filtered.length} records</span>
              </div>

              <div className="divide-y divide-slate-100">
                {filtered.map(rec => {
                  const isSelected = selectedRec?.id === rec.id
                  return (
                    <div
                      key={rec.id}
                      onClick={() => setSelectedRec(rec)}
                      className={`cursor-pointer px-4 py-3 transition-colors ${
                        isSelected ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-mono text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                          {rec.equipment_id}
                        </span>
                        <span className={`border px-1.5 py-0.5 font-mono text-[10px] font-bold rounded-sm ${
                          isSelected ? 'border-white/30 text-white bg-white/10' : statusBadgeClass(rec.review_status)
                        }`}>
                          {rec.review_status}
                        </span>
                      </div>
                      <p className={`text-[11px] line-clamp-2 leading-relaxed ${isSelected ? 'text-slate-300' : 'text-slate-600'}`}>
                        {rec.problem_summary || 'No summary available'}
                      </p>
                      <div className={`mt-1.5 flex items-center justify-between text-[10px] font-mono ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>
                        <span>{rec.generated_at ? rec.generated_at.slice(0, 10) : '—'}</span>
                        <ChevronRight size={12} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right: Detail + Review */}
          <div className="lg:col-span-8 space-y-4">
            {selectedRec ? (
              <>
                <WorkOrderCard
                  equipmentId={selectedRec.equipment_id}
                  workOrderNo={`WO-2026-${selectedRec.equipment_id.replace(/[^0-9]/g, '') || '0101'}`}
                  notificationNo={`NOTIF-${selectedRec.equipment_id}-01`}
                  correctiveAction={selectedRec.corrective_action}
                  preventiveAction={selectedRec.preventive_action}
                  priority={selectedRec.review_status === 'REJECTED' ? 'P3 - Medium' : 'P1 - Emergency'}
                  downtimeHours={4.0}
                />
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
              </>
            ) : (
              <div className="border border-slate-200 bg-white rounded-sm px-6 py-10 text-center">
                <p className="font-mono text-xs text-slate-400">Select a recommendation from the list</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default RecommendationsPage
