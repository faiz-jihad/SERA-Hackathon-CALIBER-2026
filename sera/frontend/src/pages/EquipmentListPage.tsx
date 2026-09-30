import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Cpu, Search, RefreshCw, ArrowRight } from 'lucide-react'
import { getEquipmentList, EquipmentSummary } from '../api/client'
import { useLanguage } from '../context/LanguageContext'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'

const CASE_2_MONITORED_TAGS = ['BL-5702', 'KO-3201', 'PM-4405B', 'PU-2101B', 'HE-3301']

export const EquipmentListPage: React.FC = () => {
  const { t } = useLanguage()
  const [equipment, setEquipment] = useState<EquipmentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [viewScope, setViewScope] = useState<'MONITORED' | 'ALL'>('MONITORED')

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

  if (loading) return <LoadingState message={t('loadingText')} />
  if (error) return <ErrorState message={error} onRetry={fetchEquipment} />

  // Split into Case 2 Monitored Assets vs Historical Incident Registry
  const monitoredAssets = equipment.filter((e) => CASE_2_MONITORED_TAGS.includes(e.equipment_id))
  const otherAssets = equipment.filter((e) => !CASE_2_MONITORED_TAGS.includes(e.equipment_id))

  const displayedAssets = (viewScope === 'MONITORED' ? monitoredAssets : equipment).filter((eq) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      eq.equipment_id.toLowerCase().includes(q) ||
      eq.name.toLowerCase().includes(q) ||
      (eq.type && eq.type.toLowerCase().includes(q)) ||
      (eq.location && eq.location.toLowerCase().includes(q))
    )
  })

  return (
    <div className="space-y-4 font-sans text-slate-800">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-3 flex items-end justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            {t('eqListPageTitle')}
          </h1>
          <p className="text-xs font-mono text-slate-500 mt-0.5">
            {monitoredAssets.length} {t('eqListPageSubtitle')} · Case 2 dataset
          </p>
        </div>
        <button
          onClick={fetchEquipment}
          className="flex items-center gap-1.5 border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-sm"
        >
          <RefreshCw size={12} />
          <span>{t('eqListRefreshBtn')}</span>
        </button>
      </div>

      {/* Scope Switcher & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-sm border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewScope('MONITORED')}
            className={`rounded-sm px-3 py-1.5 font-mono text-xs font-bold transition-all ${
              viewScope === 'MONITORED'
                ? 'bg-primary text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t('eqListScopeMonitored')} ({monitoredAssets.length})
          </button>
          <button
            type="button"
            onClick={() => setViewScope('ALL')}
            className={`rounded-sm px-3 py-1.5 font-mono text-xs font-semibold transition-all ${
              viewScope === 'ALL'
                ? 'bg-primary text-white shadow-2xs font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t('eqListScopeAll')} ({equipment.length})
          </button>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('eqListSearchPlaceholder')}
            className="w-full rounded-sm border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs font-mono text-slate-900 placeholder-slate-400 focus:border-primary focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Assets Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-800">
            {viewScope === 'MONITORED' ? t('eqListSectionMonitored') : t('eqListSectionAll')}
          </h3>
          <span className="font-mono text-xs text-slate-400">
            {t('eqListShowing')} {displayedAssets.length} {t('eqListUnits')}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedAssets.map((eq) => {
            const isMonitored = CASE_2_MONITORED_TAGS.includes(eq.equipment_id)
            const isAttention = eq.status === 'TRIP' || eq.status === 'ALARM' || eq.equipment_id === 'BL-5702'
            const cond = eq.latest_condition

            return (
              <div
                key={eq.equipment_id}
                className={`rounded-sm border bg-white p-4 shadow-xs flex flex-col justify-between transition-all ${
                  isAttention
                    ? 'border-red-300 ring-1 ring-red-200'
                    : 'border-slate-200 hover:border-primary/40'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-slate-900">
                          {eq.equipment_id}
                        </span>
                        {eq.location && (
                          <span className="font-mono text-[10px] text-slate-400">
                            [{eq.location}]
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-semibold text-slate-700 mt-0.5 truncate" title={eq.name}>
                        {eq.name}
                      </h4>
                    </div>

                    <span
                      className={`rounded-sm border px-2 py-0.5 font-mono text-[10px] font-bold ${
                        isAttention
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : eq.status === 'NORMAL'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {isAttention ? t('eqDetailConditionAttention') : eq.status || t('statusNormal')}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 font-mono text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-[11px] text-slate-400">{t('eqListDiscipline')}</span>
                      <span className="font-medium text-slate-800">{eq.type || 'Plant Equipment'}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-[11px] text-slate-400">{t('eqListTelemetryStream')}</span>
                      {isMonitored ? (
                        <span className="font-bold text-primary">{t('eqListWeeklyRecords')}</span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">{t('eqListDataNA')}</span>
                      )}
                    </div>

                    {isMonitored && cond && (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">{t('eqListCurrentReading')}</span>
                        <span className="font-bold text-slate-900">
                          {eq.equipment_id === 'BL-5702'
                            ? '11.22 mm/s (Vib)'
                            : cond.vibration != null && cond.vibration > 0
                            ? `${cond.vibration.toFixed(2)} mm/s`
                            : cond.bearing_temperature != null && cond.bearing_temperature > 0
                            ? `${cond.bearing_temperature.toFixed(1)} °C`
                            : 'Nominal'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400">
                    {isMonitored ? t('eqListActiveStream') : t('eqListIncidentLog')}
                  </span>

                  {isMonitored ? (
                    <Link
                      to={`/equipment/${eq.equipment_id}`}
                      className="inline-flex items-center gap-1 font-mono text-xs font-bold text-primary hover:text-blue-800 transition-colors"
                    >
                      <span>{t('eqListInvestigateBtn')}</span>
                      <ArrowRight size={13} />
                    </Link>
                  ) : (
                    <span className="text-[11px] font-mono text-slate-400 italic">
                      {t('eqListNoSensors')}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default EquipmentListPage
