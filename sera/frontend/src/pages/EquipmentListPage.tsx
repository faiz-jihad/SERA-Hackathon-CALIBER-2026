import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Cpu, Search, RefreshCw, TrendingUp, Minus } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { getEquipmentList, EquipmentSummary } from '../api/client'
import StatusBadge from '../components/StatusBadge'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'

export const EquipmentListPage: React.FC = () => {
  const { t } = useLanguage()
  const [equipment, setEquipment] = useState<EquipmentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  const fetchEquipment = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getEquipmentList()
      setEquipment(data)
    } catch (err: any) {
      setError(err?.message || 'Failed to load equipment fleet')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEquipment()
  }, [])

  const filtered = equipment.filter((eq) => {
    const matchesSearch =
      eq.equipment_id.toLowerCase().includes(search.toLowerCase()) ||
      eq.name.toLowerCase().includes(search.toLowerCase()) ||
      (eq.type && eq.type.toLowerCase().includes(search.toLowerCase()))
    const matchesStatus = statusFilter === 'ALL' || eq.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t('navEquipment')}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Unit 05 Synthesis Gas & Utility Rotating Machinery Assets ({equipment.length} Assets)
          </p>
        </div>

        <button
          onClick={fetchEquipment}
          disabled={loading}
          className="flex items-center gap-2 self-start sm:self-auto rounded-sm border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-primary hover:text-primary transition-all shadow-xs"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>{t('refresh')}</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by tag or name..."
            className="w-full rounded-sm border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-primary focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-500 text-xs font-mono mr-1">Status Filter:</span>
          {['ALL', 'CRITICAL', 'ALARM', 'NORMAL'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-sm font-mono text-xs font-semibold transition-all ${
                statusFilter === st
                  ? 'bg-primary text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-primary hover:bg-blue-50'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Equipment Table */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchEquipment} />
      ) : (
        <div className="rounded-sm border border-slate-200 bg-white px-5 pt-6 pb-4 shadow-xs sm:px-7.5">
          <div className="max-w-full overflow-x-auto">
            <table className="w-full table-auto text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-left border-b border-slate-200">
                  <th className="py-3.5 px-4 font-semibold uppercase text-slate-600 tracking-wider">{t('colEquipment')}</th>
                  <th className="py-3.5 px-4 font-semibold uppercase text-slate-600 tracking-wider">{t('colType')}</th>
                  <th className="py-3.5 px-4 font-semibold uppercase text-slate-600 tracking-wider">{t('colStatus')}</th>
                  <th className="py-3.5 px-4 font-mono font-semibold uppercase text-slate-600 tracking-wider">{t('colMainParam')}</th>
                  <th className="py-3.5 px-4 font-semibold uppercase text-slate-600 tracking-wider">{t('colTrend')}</th>
                  <th className="py-3.5 px-4 font-mono font-semibold uppercase text-slate-600 tracking-wider">{t('colLastUpdate')}</th>
                  <th className="py-3.5 px-4 text-right font-semibold uppercase text-slate-600 tracking-wider">{t('colAction')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((eq) => {
                  const isCrit = eq.status === 'CRITICAL' || eq.status === 'TRIP' || eq.status === 'ALARM'
                  const vibDisplay = eq.latest_condition?.vibration != null ? `${eq.latest_condition.vibration} mm/s` : (eq.latest_condition?.bearing_temperature != null ? `${eq.latest_condition.bearing_temperature} °C` : '--')
                  const offsetVal = eq.latest_condition?.coupling_offset != null ? `${eq.latest_condition.coupling_offset} mm` : null

                  return (
                    <tr
                      key={eq.equipment_id}
                      className={`border-b border-slate-200 transition-colors hover:bg-blue-50/40 ${isCrit ? 'bg-red-50/30' : ''}`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <Cpu size={16} className="text-primary shrink-0" />
                          <div>
                            <span className="font-mono text-xs font-bold text-slate-900">
                              {eq.equipment_id}
                            </span>
                            <span className="block text-[11px] text-slate-500 font-sans">{eq.name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">{eq.type || 'Rotating Machine'}</td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={eq.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <span className="text-slate-900 font-bold">{vibDisplay}</span>
                        {offsetVal && <span className="block text-[10px] text-amber-600 font-mono font-semibold">Offset: {offsetVal}</span>}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-mono">
                          {isCrit ? (
                            <>
                              <TrendingUp size={14} className="text-red-600" />
                              <span className="text-red-600 font-bold text-xs">{t('trendIncreasing')}</span>
                            </>
                          ) : (
                            <>
                              <Minus size={14} className="text-slate-400" />
                              <span className="text-slate-500 text-xs">{t('trendStable')}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {eq.latest_condition?.last_reading
                          ? new Date(eq.latest_condition.last_reading).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                          : 'Active'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/equipment/${eq.equipment_id}`}
                            className="rounded-sm border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-primary hover:text-primary transition-all shadow-xs"
                          >
                            {t('btnViewEquipment')}
                          </Link>
                          {isCrit && (
                            <Link
                              to={`/equipment/${eq.equipment_id}?tab=investigation`}
                              className="rounded-sm bg-primary hover:bg-blue-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition-all"
                            >
                              {t('btnInvestigateWhy')}
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default EquipmentListPage
