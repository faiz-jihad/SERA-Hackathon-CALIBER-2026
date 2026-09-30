import React, { useState, useEffect } from 'react'
import { Search, RefreshCw, X } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { getIncidents, IncidentRecord } from '../api/client'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'

function severityClass(sev?: string) {
  if (!sev) return 'text-slate-500 bg-slate-50 border-slate-200'
  const s = sev.toUpperCase()
  if (s === 'HIGH' || s === 'CRITICAL') return 'text-red-700 bg-red-50 border-red-300'
  if (s === 'MEDIUM') return 'text-amber-700 bg-amber-50 border-amber-300'
  return 'text-emerald-700 bg-emerald-50 border-emerald-200'
}

export const IncidentsPage: React.FC = () => {
  const { t } = useLanguage()
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
    } catch (err: any) {
      setError(err?.message || 'Failed to load incident records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchIncidents() }, [])

  const filtered = incidents.filter(i => {
    const q = search.toLowerCase()
    return (
      i.equipment_id.toLowerCase().includes(q) ||
      (i.incident_title || '').toLowerCase().includes(q) ||
      (i.problem || '').toLowerCase().includes(q) ||
      (i.root_cause || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-4 font-sans text-slate-800">

      {/* Page Header */}
      <div className="border-b border-slate-200 pb-3 flex items-end justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">{t('navIncidents')}</h1>
          <p className="text-xs font-mono text-slate-500 mt-0.5">
            Historical plant equipment failures, root causes, and corrective actions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search equipment, problem, RCA..."
              className="border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-slate-500 rounded-sm w-64 placeholder-slate-400"
            />
          </div>
          <button
            onClick={fetchIncidents}
            disabled={loading}
            className="flex items-center gap-1.5 border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-sm disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="border border-slate-200 bg-white rounded-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 flex items-center justify-between">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Incident Registry
          </span>
          <span className="font-mono text-[10px] text-slate-400">
            {filtered.length} of {incidents.length} records
          </span>
        </div>

        {loading ? (
          <LoadingState message="Loading incident records..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchIncidents} />
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="text-left px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500 w-24">Date</th>
                <th className="text-left px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500 w-24">Equipment</th>
                <th className="text-left px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">Problem / Incident</th>
                <th className="text-left px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">Root Cause</th>
                <th className="text-right px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">Downtime</th>
                <th className="text-right px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">Loss (USD)</th>
                <th className="text-center px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center font-mono text-xs text-slate-400">
                    No incidents match the current search
                  </td>
                </tr>
              ) : filtered.map(inc => (
                <tr
                  key={inc.id}
                  onClick={() => setSelectedIncident(inc)}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-2.5 font-mono text-slate-500 whitespace-nowrap">
                    {inc.incident_date || '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-mono font-bold text-amber-700">{inc.equipment_id}</span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-800 max-w-xs">
                    <span className="line-clamp-1">{inc.incident_title || inc.problem || '—'}</span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 max-w-xs">
                    <span className="line-clamp-1">{inc.root_cause || '—'}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-slate-700">
                    {inc.downtime_hours != null ? `${inc.downtime_hours} h` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-slate-700">
                    {inc.financial_loss != null
                      ? `$${Number(inc.financial_loss).toLocaleString()}`
                      : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`border px-1.5 py-0.5 font-mono text-[10px] font-bold rounded-sm ${severityClass(inc.severity)}`}>
                      {inc.severity || 'UNCLASSIFIED'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl border border-slate-200 bg-white rounded-sm shadow-2xl">

            {/* Modal Header */}
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-amber-700 text-sm">{selectedIncident.equipment_id}</span>
                <span className="font-mono text-[10px] text-slate-500">{selectedIncident.incident_date}</span>
                <span className={`border px-1.5 py-0.5 font-mono text-[10px] font-bold rounded-sm ${severityClass(selectedIncident.severity)}`}>
                  {selectedIncident.severity || 'UNCLASSIFIED'}
                </span>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-sm"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Title */}
              <div>
                <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 mb-1">Incident</div>
                <p className="text-sm font-bold text-slate-900">
                  {selectedIncident.incident_title || selectedIncident.problem || 'No title'}
                </p>
              </div>

              {/* RCA */}
              {selectedIncident.root_cause && (
                <div className="border border-slate-200 bg-slate-50 rounded-sm p-3">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-red-700 mb-1">Root Cause Analysis</div>
                  <p className="text-xs text-slate-800 leading-relaxed">{selectedIncident.root_cause}</p>
                </div>
              )}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                {selectedIncident.corrective_action && (
                  <div className="border border-slate-200 bg-slate-50 rounded-sm p-3">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-700 mb-1">Corrective Action</div>
                    <p className="text-xs text-slate-700 leading-relaxed">{selectedIncident.corrective_action}</p>
                  </div>
                )}
                {selectedIncident.preventive_action && (
                  <div className="border border-slate-200 bg-slate-50 rounded-sm p-3">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-600 mb-1">Preventive Protocol</div>
                    <p className="text-xs text-slate-700 leading-relaxed">{selectedIncident.preventive_action}</p>
                  </div>
                )}
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-px border border-slate-200 bg-slate-200 rounded-sm overflow-hidden">
                <div className="bg-white px-4 py-3 text-center">
                  <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Downtime</div>
                  <div className="text-xl font-bold font-mono text-amber-700 mt-0.5">
                    {selectedIncident.downtime_hours != null ? `${selectedIncident.downtime_hours} h` : '—'}
                  </div>
                </div>
                <div className="bg-white px-4 py-3 text-center">
                  <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Financial Loss</div>
                  <div className="text-xl font-bold font-mono text-red-700 mt-0.5">
                    {selectedIncident.financial_loss != null
                      ? `$${Number(selectedIncident.financial_loss).toLocaleString()}`
                      : '—'}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 px-5 py-3 flex justify-end">
              <button
                onClick={() => setSelectedIncident(null)}
                className="border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default IncidentsPage
