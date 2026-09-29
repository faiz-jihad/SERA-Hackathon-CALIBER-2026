import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Minus,
  RefreshCw,
  Cpu,
  Clock,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { getDashboardOverview, getEquipmentList, getIncidents, getEquipmentDetail, DashboardOverview, EquipmentSummary } from '../api/client'
import StatusBadge from '../components/StatusBadge'
import MetricCard from '../components/MetricCard'
import EquipmentTrainSchematic from '../components/EquipmentTrainSchematic'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'

export const DashboardPage: React.FC = () => {
  const { t } = useLanguage()
  const navigate = useNavigate()

  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [equipment, setEquipment] = useState<EquipmentSummary[]>([])
  const [incidents, setIncidents] = useState<any[]>([])
  const [thresholds, setThresholds] = useState<Record<string, Record<string, number>>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CRITICAL'>('ALL')

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [ovData, eqData, incData] = await Promise.all([
        getDashboardOverview(),
        getEquipmentList(),
        getIncidents({ limit: 4 }),
      ])
      setOverview(ovData)
      setEquipment(eqData)
      setIncidents(incData)
    } catch (err: any) {
      setError(err?.message || 'Failed to load plant dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) return <LoadingState message={t('loadingText')} />
  if (error) return <ErrorState message={error} onRetry={fetchData} />

  // Identify critical asset for prominent highlight banner
  const criticalAsset = equipment.find(
    (e) => e.status === 'CRITICAL' || e.status === 'TRIP' || e.status === 'ALARM'
  )

  // Load thresholds for critical asset from backend
  useEffect(() => {
    if (criticalAsset?.equipment_id && Object.keys(thresholds).length === 0) {
      getEquipmentDetail(criticalAsset.equipment_id)
        .then((detail) => {
          if (detail.thresholds) setThresholds(detail.thresholds)
        })
        .catch(() => { /* ignore, thresholds stay empty */ })
    }
  }, [criticalAsset?.equipment_id])

  const filteredEquipment =
    statusFilter === 'CRITICAL'
      ? equipment.filter((e) => e.status === 'CRITICAL' || e.status === 'TRIP' || e.status === 'ALARM')
      : equipment

  // Dynamic telemetry from critical asset — NO hardcoded fallbacks
  const critVib = criticalAsset?.latest_condition?.vibration != null ? Number(criticalAsset.latest_condition.vibration) : null
  const critHarmonic = criticalAsset?.latest_condition?.harmonic_2x != null ? Number(criticalAsset.latest_condition.harmonic_2x) : null
  const critOffset = criticalAsset?.latest_condition?.coupling_offset != null ? Number(criticalAsset.latest_condition.coupling_offset) : null
  const critTemp = criticalAsset?.latest_condition?.bearing_temperature != null ? Number(criticalAsset.latest_condition.bearing_temperature) : null

  // Dynamic threshold labels from backend rule engine
  const vibTrip = thresholds?.vibration?.trip ?? '--'
  const harmonicAlarm = thresholds?.harmonic_2x?.alarm ?? '--'
  const offsetTrip = thresholds?.coupling_offset?.trip ?? '--'
  const tempAlarm = thresholds?.bearing_temperature?.alarm ?? '--'

  const criticalCount = equipment.filter(e => e.status === 'CRITICAL' || e.status === 'TRIP' || e.status === 'ALARM').length

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner: Plant Unit & Refresh */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t('navDashboard')}
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            {t('plantLocation')} • {t('lastSync')}: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>

        <button
          onClick={fetchData}
          className="flex items-center gap-2 self-start sm:self-auto rounded-sm border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-primary hover:text-primary transition-all shadow-xs"
        >
          <RefreshCw size={14} />
          <span>{t('refresh')}</span>
        </button>
      </div>

      {/* KPI Area: 6 Core Metrics in TailAdmin grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard
          title={t('kpiTotalEquipment')}
          value={overview?.total_equipment ?? equipment.length}
          unit="Assets"
          subtitle="Plant Active Fleet"
          status="neutral"
          icon={Cpu}
        />
        <MetricCard
          title={t('kpiNormal')}
          value={overview?.status_summary?.normal ?? equipment.filter(e => e.status === 'NORMAL').length}
          unit="Assets"
          subtitle="Operating nominal"
          status="normal"
          icon={CheckCircle2}
        />
        <MetricCard
          title={t('kpiAlarm')}
          value={overview?.status_summary?.alarm ?? equipment.filter(e => e.status === 'ALARM' || e.status === 'WARNING').length}
          unit="Assets"
          subtitle="Threshold breach"
          status="warning"
          icon={AlertTriangle}
        />
        <MetricCard
          title={t('kpiCritical')}
          value={overview?.status_summary?.trip || overview?.status_summary?.critical || equipment.filter(e => e.status === 'CRITICAL' || e.status === 'TRIP').length}
          unit="Assets"
          subtitle="Requires turnaround"
          status="critical"
          highlight
          icon={AlertOctagon}
        />
        <MetricCard
          title={t('kpiDowntime30d')}
          value={overview?.downtime_hours_30d ?? 0}
          unit={t('hours')}
          subtitle="Cumulative outage"
          status="warning"
          icon={Clock}
        />
        <MetricCard
          title={t('kpiFinancialLoss30d')}
          value={overview?.financial_loss_30d ? `${(overview.financial_loss_30d / 1000).toFixed(0)}k` : '0'}
          unit={t('financialCurrency')}
          subtitle="Production loss impact"
          status="critical"
          icon={DollarSign}
        />
      </div>

      {/* URGENT CRITICAL ASSET BANNER & MECHANICAL TRAIN (Section 11) */}
      {criticalAsset && (
        <div className="space-y-4">
          <div className="rounded-sm border border-red-200 bg-white p-5 sm:p-6 shadow-xs border-l-4 border-l-red-600">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-red-600 text-white shadow-xs">
                  <AlertOctagon size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold tracking-wider text-red-700">
                      {criticalAsset.equipment_id} — {criticalAsset.name}
                    </span>
                    <StatusBadge status={criticalAsset.status} size="sm" />
                    {(criticalAsset.status === 'TRIP' || criticalAsset.status === 'CRITICAL') && (
                      <span className="rounded-sm bg-red-100 border border-red-200 px-2 py-0.5 font-mono text-[10px] font-bold text-red-800">
                        {criticalAsset.status === 'TRIP' ? 'SCADA INTERLOCK TRIP' : 'CRITICAL ALERT'}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1">
                    {criticalAsset.status === 'TRIP'
                      ? `Emergency Interlock Trip — ${criticalAsset.name || criticalAsset.equipment_id}`
                      : `Critical Threshold Breach — ${criticalAsset.name || criticalAsset.equipment_id}`}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-3xl">
                    {criticalAsset.equipment_id} ({criticalAsset.name || 'Asset'}) in {criticalAsset.location || 'Plant'} has crossed operational trip thresholds. Continuous monitoring records rapid telemetry divergence requiring turnaround intervention.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-mono">
                    {critVib != null && (
                      <span className={`rounded-sm px-2.5 py-1 font-bold border ${
                        critVib >= Number(vibTrip) ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'
                      }`}>
                        VIB-RMS: {critVib} mm/s (Trip ≥ {vibTrip})
                      </span>
                    )}
                    {critHarmonic != null && (
                      <span className="rounded-sm bg-amber-50 border border-amber-200 px-2.5 py-1 font-bold text-amber-700">
                        FFT-2X: {critHarmonic} mm/s (Alarm ≥ {harmonicAlarm})
                      </span>
                    )}
                    {critOffset != null && (
                      <span className={`rounded-sm px-2.5 py-1 font-bold border ${
                        critOffset >= Number(offsetTrip) ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'
                      }`}>
                        ALIGN-OFFSET: {critOffset} mm (Trip ≥ {offsetTrip})
                      </span>
                    )}
                    {critTemp != null && (
                      <span className="rounded-sm bg-amber-50 border border-amber-200 px-2.5 py-1 font-bold text-amber-700">
                        TEMP-DE: {critTemp} °C (Alarm ≥ {tempAlarm})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                <Link
                  to={`/equipment/${criticalAsset.equipment_id}?step=detect`}
                  className="flex items-center gap-2 rounded-sm bg-primary hover:bg-blue-700 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-xs transition-all"
                >
                  <span>{t('btnInvestigateWhy')}</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>

          {/* Embedded Physical Machinery Train Schematic */}
          <EquipmentTrainSchematic
            equipmentId={criticalAsset.equipment_id}
            equipmentName={criticalAsset.name}
            vibration={critVib ?? 0}
            harmonic2X={critHarmonic ?? 0}
            couplingOffset={critOffset ?? 0}
            bearingTemp={critTemp ?? 0}
            isCritical={criticalAsset.status === 'CRITICAL' || criticalAsset.status === 'TRIP'}
          />
        </div>
      )}

      {/* Equipment Fleet Status Table (Section 10) */}
      <div className="rounded-sm border border-slate-200 bg-white px-5 pt-6 pb-4 shadow-xs sm:px-7.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4 border-b border-slate-200 pb-3.5">
          <div>
            <h2 className="text-base font-bold tracking-tight text-slate-900 uppercase">
              {t('fleetTableTitle')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{t('fleetTableSubtitle')}</p>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto rounded-sm border border-slate-200 bg-slate-50 p-1 text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-sm font-medium transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-primary text-white font-bold'
                  : 'text-slate-600 hover:text-primary'
              }`}
            >
              {t('filterAll')} ({equipment.length})
            </button>
            <button
              onClick={() => setStatusFilter('CRITICAL')}
              className={`px-3 py-1 rounded-sm font-medium transition-all ${
                statusFilter === 'CRITICAL'
                  ? 'bg-red-600 text-white font-bold'
                  : 'text-slate-600 hover:text-red-600'
              }`}
            >
              {t('filterCritical')} ({criticalCount})
            </button>
          </div>
        </div>

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
              {filteredEquipment.map((eq) => {
                const isCrit = eq.status === 'CRITICAL' || eq.status === 'TRIP' || eq.status === 'ALARM'
                const vib = eq.latest_condition?.vibration
                const offset = eq.latest_condition?.coupling_offset

                return (
                  <tr
                    key={eq.equipment_id}
                    className={`border-b border-slate-200 transition-colors hover:bg-blue-50/40 ${
                      isCrit ? 'bg-red-50/30' : ''
                    }`}
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
                      <div className="text-slate-900 font-bold">
                        {vib != null ? vib : '--'} <span className="text-[10px] text-slate-500 font-sans">{t('unitVib')}</span>
                      </div>
                      {offset != null && offset >= 0.05 && (
                        <div className="text-[10px] text-red-600 font-semibold">
                          Offset: {offset} {t('unitOffset')}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <div className="flex items-center gap-1.5">
                        {isCrit ? (
                          <>
                            <TrendingUp size={14} className="text-red-600" />
                            <span className="text-red-600 font-bold font-sans text-xs">
                              {t('trendIncreasing')}
                            </span>
                          </>
                        ) : (
                          <>
                            <Minus size={14} className="text-slate-400" />
                            <span className="text-slate-500 font-sans text-xs">
                              {t('trendStable')}
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      {eq.latest_condition?.last_reading
                        ? new Date(eq.latest_condition.last_reading).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '--'
                      }
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
                            to={`/equipment/${eq.equipment_id}?step=detect`}
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

      {/* Bottom Row: Recent Incidents Preview & System Integrity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Historical Incidents */}
        <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={17} className="text-amber-500" />
              <h3 className="text-sm font-bold tracking-wider text-slate-900 uppercase">
                {t('historicalTitle')}
              </h3>
            </div>
            <Link
              to="/incidents"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span>{t('navIncidents')}</span>
              <ChevronRight size={13} />
            </Link>
          </div>

          <div className="space-y-2.5">
            {incidents.slice(0, 3).map((inc) => (
              <div
                key={inc.id}
                onClick={() => navigate(`/incidents?highlight=${inc.id}`)}
                className="flex cursor-pointer items-center justify-between rounded-sm border border-slate-200 bg-slate-50/60 p-3 hover:border-primary hover:bg-blue-50/50 transition-all"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-amber-600">
                      {inc.equipment_id}
                    </span>
                    <span className="text-xs font-medium text-slate-800 truncate max-w-xs">
                      {inc.incident_title || inc.problem}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-mono mt-0.5 block">
                    RCA: {inc.root_cause}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono text-xs text-slate-500">{inc.incident_date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reliability Engineering Principles */}
        <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-4">
            <ShieldCheck size={17} className="text-emerald-600" />
            <h3 className="text-sm font-bold tracking-wider text-slate-900 uppercase">
              SERA Core Reliability Principles
            </h3>
          </div>
          <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
            <div className="rounded-sm bg-slate-50 border border-slate-200 p-3">
              <span className="font-bold text-emerald-700 uppercase tracking-wider text-xs block mb-0.5">
                1. Data-First Deterministic Evidence
              </span>
              Engineering measurements are calculated using strict rule provenance. Zero hallucinated parameters.
            </div>
            <div className="rounded-sm bg-slate-50 border border-slate-200 p-3">
              <span className="font-bold text-primary uppercase tracking-wider text-xs block mb-0.5">
                2. AI Reasoning & Explanation Layer
              </span>
              AI synthesizes structured evidence and historical cases. It is not the source of truth for calculations.
            </div>
            <div className="rounded-sm bg-slate-50 border border-slate-200 p-3">
              <span className="font-bold text-amber-700 uppercase tracking-wider text-xs block mb-0.5">
                3. Engineer as Final Decision Maker
              </span>
              Human-in-the-loop authorization is required before any turnaround or work order execution.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
