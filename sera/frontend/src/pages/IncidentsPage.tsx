import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, RefreshCw, Clock, DollarSign, X } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { getIncidents, IncidentRecord } from '../api/client'
import StatusBadge from '../components/StatusBadge'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'

export const IncidentsPage: React.FC = () => {
  const { t } = useLanguage()
  const [searchParams] = useSearchParams()
  const highlightId = searchParams.get('highlight')

  const [incidents, setIncidents] = useState<IncidentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedIncident, setSelectedIncident] = useState<IncidentRecord | null>(null)

  const fetchIncidents = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getIncidents()
      setIncidents(data)
      if (highlightId) {
        const target = data.find((i) => i.id === highlightId)
        if (target) setSelectedIncident(target)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load historical incidents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIncidents()
  }, [])

  const filtered = incidents.filter((i) => {
    const q = search.toLowerCase()
    return (
      i.equipment_id.toLowerCase().includes(q) ||
      (i.incident_title ? i.incident_title.toLowerCase().includes(q) : false) ||
      (i.problem ? i.problem.toLowerCase().includes(q) : false) ||
      (i.root_cause ? i.root_cause.toLowerCase().includes(q) : false)
    )
  })

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t('navIncidents')}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Historical Plant Equipment Failures, Root Causes, and Proven Corrective Actions ({incidents.length} Records)
          </p>
        </div>

        <button
          onClick={fetchIncidents}
          disabled={loading}
          className="flex items-center gap-2 self-start sm:self-auto rounded-sm border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-primary hover:text-primary transition-all shadow-xs"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>{t('refresh')}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by equipment tag, problem symptom, or root cause..."
            className="w-full rounded-sm border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-primary focus:bg-white focus:outline-none shadow-xs"
          />
        </div>
      </div>

      {/* Incident List */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchIncidents} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((inc) => {
            const isHighlight = inc.id === highlightId
            return (
              <div
                key={inc.id}
                onClick={() => setSelectedIncident(inc)}
                className={`flex cursor-pointer flex-col justify-between rounded-sm border p-5 transition-all duration-150 shadow-xs ${
                  isHighlight
                    ? 'border-amber-400 bg-amber-50/30 ring-1 ring-amber-400'
                    : 'border-slate-200 bg-white hover:border-primary hover:bg-blue-50/30'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
                    <span className="font-mono text-xs font-bold text-amber-600">
                      {inc.equipment_id}
                    </span>
                    <span className="font-mono text-xs text-slate-500">{inc.incident_date}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 line-clamp-1 mb-1.5">
                    {inc.incident_title || inc.problem}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mb-3">
                    <strong className="text-slate-800">RCA:</strong> {inc.root_cause}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1 font-mono">
                    <Clock size={13} className="text-slate-400" />
                    <span>{inc.downtime_hours || 0} hrs</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-red-600 font-semibold">
                    <DollarSign size={13} />
                    <span>${Number(inc.financial_loss || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-sm border border-slate-200 bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-amber-600">
                    {selectedIncident.equipment_id}
                  </span>
                  <StatusBadge status="RESOLVED" size="sm" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {selectedIncident.incident_title || selectedIncident.problem}
                </h3>
                <span className="font-mono text-xs text-slate-500">
                  Occurred on {selectedIncident.incident_date}
                </span>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                className="rounded-sm p-1.5 text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="rounded-sm bg-slate-50 border border-slate-200 p-3.5">
                <span className="font-bold uppercase tracking-wider text-red-600 text-[10px] block mb-1">
                  Root Cause Analysis:
                </span>
                <p className="font-mono text-slate-900 leading-relaxed">{selectedIncident.root_cause}</p>
              </div>

              <div className="rounded-sm bg-slate-50 border border-slate-200 p-3.5">
                <span className="font-bold uppercase tracking-wider text-emerald-700 text-[10px] block mb-1">
                  Corrective Action Implemented:
                </span>
                <p className="text-slate-700 leading-relaxed">{selectedIncident.corrective_action}</p>
              </div>

              <div className="rounded-sm bg-slate-50 border border-slate-200 p-3.5">
                <span className="font-bold uppercase tracking-wider text-primary text-[10px] block mb-1">
                  Preventive Protocol:
                </span>
                <p className="text-slate-700 leading-relaxed">{selectedIncident.preventive_action}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center font-mono">
                <div className="rounded-sm border border-slate-200 bg-slate-50 p-3">
                  <span className="text-[11px] text-slate-500">Downtime Outage</span>
                  <div className="text-base font-bold text-amber-600 mt-0.5">{selectedIncident.downtime_hours || 0} Hours</div>
                </div>
                <div className="rounded-sm border border-slate-200 bg-slate-50 p-3">
                  <span className="text-[11px] text-slate-500">Financial Loss</span>
                  <div className="text-base font-bold text-red-600 mt-0.5">
                    ${Number(selectedIncident.financial_loss || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedIncident(null)}
                className="rounded-sm bg-white border border-slate-200 hover:bg-slate-50 px-5 py-2 text-xs font-semibold text-slate-700 transition-all shadow-xs"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default IncidentsPage
