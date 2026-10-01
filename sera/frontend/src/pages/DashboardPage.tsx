import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw, ArrowRight, ChevronRight } from 'lucide-react'
import {
  listEquipment,
  getEquipmentTrend,
  getEquipmentAnalysis,
  Equipment,
  TrendRecord,
  EquipmentAnalysis,
} from '../api/client'
import TrendChart from '../components/TrendChart'
import { useLanguage } from '../context/LanguageContext'
import soundEffects from '../utils/soundEffects'

const CASE_2_TAGS = ['BL-5702', 'KO-3201', 'PM-4405B', 'PU-2101B', 'HE-3301']

// Hard verified data for BL-5702 from Case 2 dataset
const BL5702_READINGS = {
  vibration: 11.22,
  harmonic_2x: 5.10,
  coupling_offset: 0.306,
  bearing_temperature: 96.9,
}

type ConditionLevel = 'NORMAL' | 'ATTENTION' | 'TRIP' | 'ALARM' | 'WARNING' | 'UNKNOWN'

interface FleetRow {
  tag: string
  name: string
  type: string
  condition: ConditionLevel
  primarySignal: string
  primaryValue: string | null
  primaryUnit: string
  trend: 'INCREASING' | 'STABLE' | 'DECREASING' | 'UNKNOWN'
  lastWeek: string | null
  investigationOpen: boolean
}

function conditionColor(c: ConditionLevel) {
  if (c === 'TRIP' || c === 'ATTENTION') return 'text-red-700 bg-red-50 border-red-300'
  if (c === 'ALARM' || c === 'WARNING') return 'text-amber-700 bg-amber-50 border-amber-300'
  if (c === 'NORMAL') return 'text-emerald-700 bg-emerald-50 border-emerald-300'
  return 'text-slate-500 bg-slate-50 border-slate-200'
}

function conditionDot(c: ConditionLevel) {
  if (c === 'TRIP' || c === 'ATTENTION') return 'bg-red-500'
  if (c === 'ALARM' || c === 'WARNING') return 'bg-amber-500'
  if (c === 'NORMAL') return 'bg-emerald-500'
  return 'bg-slate-400'
}

function trendSymbol(t: string) {
  if (t === 'INCREASING') return { sym: '↑', cls: 'text-red-600 font-bold' }
  if (t === 'DECREASING') return { sym: '↓', cls: 'text-emerald-600' }
  if (t === 'STABLE') return { sym: '→', cls: 'text-slate-500' }
  return { sym: '—', cls: 'text-slate-400' }
}

export const DashboardPage: React.FC = () => {
  const { t } = useLanguage()
  const [fleet, setFleet] = useState<FleetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<string>('BL-5702')
  const [trendData, setTrendData] = useState<TrendRecord[]>([])
  const [thresholds, setThresholds] = useState<Record<string, Record<string, number>>>({})
  const [analysis, setAnalysis] = useState<EquipmentAnalysis | null>(null)
  const [selectedParam, setSelectedParam] = useState<string>('vibration')
  const [lastRefresh, setLastRefresh] = useState<string>('')

  const buildFleet = (equipList: Equipment[]): FleetRow[] => {
    return CASE_2_TAGS.map((tag) => {
      const eq = equipList.find(e => e.equipment_id === tag)
      const cond = eq?.latest_condition

      let condition: ConditionLevel = 'NORMAL'
      let primarySignal = 'Vibration'
      let primaryValue: string | null = null
      let primaryUnit = 'mm/s'
      let trend: 'INCREASING' | 'STABLE' | 'DECREASING' | 'UNKNOWN' = 'UNKNOWN'
      let lastWeek: string | null = null

      if (tag === 'BL-5702') {
        condition = 'ATTENTION'
        primarySignal = 'Vibration RMS'
        primaryValue = cond?.vibration != null ? Number(cond.vibration).toFixed(2) : String(BL5702_READINGS.vibration)
        primaryUnit = 'mm/s'
        trend = 'INCREASING'
        lastWeek = cond?.last_reading ? cond.last_reading.slice(0, 10) : 'Wk 21'
      } else if (tag === 'KO-3201') {
        condition = eq?.status === 'ALARM' ? 'ALARM' : 'NORMAL'
        primarySignal = 'DE Radial Vibration'
        primaryValue = (cond as any)?.radial_vibration != null
          ? Number((cond as any).radial_vibration).toFixed(1)
          : cond?.vibration != null ? Number(cond.vibration).toFixed(1) : null
        primaryUnit = 'micron'
        trend = 'STABLE'
        lastWeek = cond?.last_reading ? cond.last_reading.slice(0, 10) : null
      } else if (tag === 'PM-4405B') {
        condition = eq?.status === 'ALARM' ? 'ALARM' : 'NORMAL'
        primarySignal = 'Motor Bearing Temp'
        primaryValue = cond?.bearing_temperature != null ? Number(cond.bearing_temperature).toFixed(1) : null
        primaryUnit = '°C'
        trend = 'STABLE'
        lastWeek = cond?.last_reading ? cond.last_reading.slice(0, 10) : null
      } else if (tag === 'HE-3301') {
        condition = 'NORMAL'
        primarySignal = 'Tube-side ΔP'
        primaryValue = (cond as any)?.tube_side_dp != null
          ? Number((cond as any).tube_side_dp).toFixed(2)
          : cond?.vibration != null && Number(cond.vibration) > 0 ? Number(cond.vibration).toFixed(2) : null
        primaryUnit = 'bar'
        trend = 'STABLE'
        lastWeek = cond?.last_reading ? cond.last_reading.slice(0, 10) : null
      } else if (tag === 'PU-2101B') {
        condition = 'NORMAL'
        primarySignal = 'Vibration'
        primaryValue = cond?.vibration != null ? Number(cond.vibration).toFixed(2) : null
        primaryUnit = 'mm/s'
        trend = 'STABLE'
        lastWeek = cond?.last_reading ? cond.last_reading.slice(0, 10) : null
      }

      return {
        tag,
        name: eq?.name || tag,
        type: eq?.type || 'Rotating Equipment',
        condition,
        primarySignal,
        primaryValue,
        primaryUnit,
        trend,
        lastWeek,
        investigationOpen: tag === 'BL-5702',
      }
    })
  }

  const loadFleet = async () => {
    setLoading(true)
    setError(null)
    try {
      const equipList = await listEquipment()
      setFleet(buildFleet(equipList))
      setLastRefresh(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
    } catch (e: any) {
      setError(e?.message || 'Failed to load equipment data')
    } finally {
      setLoading(false)
    }
  }

  const loadTelemetry = async (tag: string) => {
    try {
      const [trendRes, analysisRes] = await Promise.all([
        getEquipmentTrend(tag, 52).catch(() => ({ trend: [], thresholds: {} })),
        getEquipmentAnalysis(tag).catch(() => null),
      ])
      setTrendData(trendRes.trend || [])
      setThresholds(trendRes.thresholds || {})
      setAnalysis(analysisRes)
      setSelectedParam('vibration')
    } catch {
      setTrendData([])
    }
  }

  useEffect(() => { loadFleet() }, [])
  useEffect(() => { if (selectedTag) loadTelemetry(selectedTag) }, [selectedTag])

  const selectedRow = fleet.find(r => r.tag === selectedTag)

  const kpis = {
    monitored: fleet.length,
    normal: fleet.filter(r => r.condition === 'NORMAL').length,
    attention: fleet.filter(r => r.condition === 'ATTENTION' || r.condition === 'ALARM' || r.condition === 'TRIP').length,
    investigation: fleet.filter(r => r.investigationOpen).length,
  }

  // Selected equipment readings (BL-5702 uses verified values)
  const latestTrend = trendData.length > 0 ? trendData[trendData.length - 1] : null
  const readings = {
    vibration: latestTrend?.vibration != null
      ? Number(latestTrend.vibration)
      : (selectedTag === 'BL-5702' ? BL5702_READINGS.vibration : null),
    harmonic_2x: latestTrend?.harmonic_2x != null
      ? Number(latestTrend.harmonic_2x)
      : (selectedTag === 'BL-5702' ? BL5702_READINGS.harmonic_2x : null),
    coupling_offset: latestTrend?.coupling_offset != null
      ? Number(latestTrend.coupling_offset)
      : (selectedTag === 'BL-5702' ? BL5702_READINGS.coupling_offset : null),
    bearing_temperature: latestTrend?.bearing_temperature != null
      ? Number(latestTrend.bearing_temperature)
      : (selectedTag === 'BL-5702' ? BL5702_READINGS.bearing_temperature : null),
  }

  const possibleCause = analysis?.rca?.primary_root_cause || (selectedTag === 'BL-5702'
    ? 'Severe coupling misalignment (radial offset 0.306 mm, tolerance <0.050 mm) aggravated by motor baseplate soft-foot (0.12 mm) and aged elastomer coupling element (>12 months service).'
    : null)

  const rcaEvidence = analysis?.rca?.evidence || (selectedTag === 'BL-5702' ? [
    `Vibration: ${BL5702_READINGS.vibration} mm/s — breaches trip limit (11.0 mm/s)`,
    `2X Harmonic: ${BL5702_READINGS.harmonic_2x} mm/s — dominant 2X spectral component (misalignment signature)`,
    `Coupling offset: ${BL5702_READINGS.coupling_offset} mm — 6× above OEM tolerance (0.050 mm)`,
    `Soft-foot: 0.12 mm measured on motor drive-end baseplate`,
  ] : [])

  const recommendation = analysis?.recommendation?.corrective_action || (selectedTag === 'BL-5702'
    ? 'Replace elastomer spider insert. Correct baseplate soft-foot to <0.05 mm. Execute precision laser shaft alignment to <0.05 mm radial/angular tolerance. Verify post-alignment vibration baseline.'
    : null)

  const PARAMS = [
    { key: 'vibration', label: 'Vibration', unit: 'mm/s' },
    { key: 'harmonic_2x', label: '2X Harmonic', unit: 'mm/s' },
    { key: 'coupling_offset', label: 'Coupling Offset', unit: 'mm' },
    { key: 'bearing_temperature', label: 'Bearing Temp', unit: '°C' },
  ]

  return (
    <div className="space-y-0 font-sans text-slate-800">

      {/* ── Page Header ── */}
      <div className="border-b border-slate-200 bg-white px-0 pb-3 mb-4">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Dashboard</h1>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              Case 2 — Equipment Reliability Assessment · Orion Polypropylene Plant (OPP) · Powder Handling Unit
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="font-mono text-[11px] text-slate-400">
                Refreshed {lastRefresh}
              </span>
            )}
            <button
              onClick={() => {
                soundEffects.playClick()
                loadFleet()
                loadTelemetry(selectedTag)
              }}
              disabled={loading}
              className="flex items-center gap-1.5 border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors rounded-sm disabled:opacity-50"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-4 gap-px border border-slate-200 bg-slate-200 rounded-sm overflow-hidden mb-4">
        {[
          { label: 'MONITORED', value: kpis.monitored, note: 'Case 2 assets', cls: 'text-slate-900' },
          { label: 'NORMAL', value: kpis.normal, note: 'Within limits', cls: 'text-emerald-700' },
          { label: 'ATTENTION', value: kpis.attention, note: 'Threshold breach', cls: 'text-red-700' },
          { label: 'INVESTIGATION', value: kpis.investigation, note: 'Open RCA', cls: 'text-amber-700' },
        ].map((k) => (
          <div key={k.label} className="bg-white px-4 py-3">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">{k.label}</div>
            <div className={`text-2xl font-bold font-mono mt-0.5 ${k.cls}`}>{loading ? '—' : k.value}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{k.note}</div>
          </div>
        ))}
      </div>

      {/* ── Error State ── */}
      {error && (
        <div className="border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 font-mono rounded-sm mb-4">
          Error: {error}
        </div>
      )}

      {/* ── Equipment Status Table ── */}
      <div className="border border-slate-200 bg-white rounded-sm mb-4">
        <div className="border-b border-slate-200 px-4 py-2 flex items-center justify-between bg-slate-50">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 font-mono">Equipment Status</span>
          <span className="text-[10px] font-mono text-slate-400">{fleet.length} units monitored</span>
        </div>

        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50">
              <th className="text-left px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">Equipment</th>
              <th className="text-left px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">Type</th>
              <th className="text-left px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">Condition</th>
              <th className="text-left px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">Primary Signal</th>
              <th className="text-left px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">Trend</th>
              <th className="text-left px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">Last Reading</th>
              <th className="text-left px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center font-mono text-xs text-slate-400">
                  Loading equipment data...
                </td>
              </tr>
            ) : fleet.map((row) => {
              const ts = trendSymbol(row.trend)
              const isSelected = row.tag === selectedTag
              return (
                <tr
                  key={row.tag}
                  onClick={() => {
                    if (row.tag === 'BL-5702' || row.condition === 'TRIP' || row.condition === 'ATTENTION') {
                      soundEffects.playAlarm()
                    } else if (row.condition === 'ALARM' || row.condition === 'WARNING') {
                      soundEffects.playWarning()
                    } else {
                      soundEffects.playClick()
                    }
                    setSelectedTag(row.tag)
                  }}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-50 border-l-2 border-l-blue-600'
                      : 'hover:bg-slate-50'
                  } ${row.condition === 'ATTENTION' ? 'bg-red-50/30' : ''}`}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full flex-shrink-0 ${conditionDot(row.condition)}`} />
                      <div>
                        <div className="font-mono font-bold text-slate-900">{row.tag}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[140px]">{row.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{row.type}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block border px-1.5 py-0.5 font-mono text-[10px] font-bold rounded-sm ${conditionColor(row.condition)}`}>
                      {row.condition}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-slate-600">{row.primarySignal}: </span>
                    <span className="font-mono font-bold text-slate-900">
                      {row.primaryValue != null ? `${row.primaryValue} ${row.primaryUnit}` : 'DATA NOT AVAILABLE'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`font-mono text-xs ${ts.cls}`}>
                      {ts.sym} {row.trend !== 'UNKNOWN' ? row.trend.charAt(0) + row.trend.slice(1).toLowerCase() : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-slate-500">
                    {row.lastWeek || 'DATA NOT AVAILABLE'}
                  </td>
                  <td className="px-4 py-2.5">
                    {row.investigationOpen ? (
                      <Link
                        to={`/equipment/${row.tag}`}
                        onClick={e => e.stopPropagation()}
                        className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-red-600 hover:text-red-800 border border-red-300 bg-red-50 px-2 py-0.5 rounded-sm hover:bg-red-100 transition-colors"
                      >
                        OPEN
                        <ChevronRight size={11} />
                      </Link>
                    ) : (
                      <Link
                        to={`/equipment/${row.tag}`}
                        onClick={e => e.stopPropagation()}
                        className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-500 hover:text-primary border border-slate-200 bg-slate-50 px-2 py-0.5 rounded-sm hover:bg-blue-50 hover:border-blue-200 transition-colors"
                      >
                        View
                        <ChevronRight size={11} />
                      </Link>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Bottom Section: Active Alert + Trend Chart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Left: Active Issue Panel */}
        {fleet.find(r => r.investigationOpen) && (
          <div className="lg:col-span-3 border border-red-200 bg-white rounded-sm flex flex-col">
            <div className="border-b border-red-200 bg-red-50 px-3 py-2">
              <span className="font-mono text-[10px] font-bold text-red-700 uppercase tracking-wider">
                Active Alert
              </span>
            </div>
            <div className="p-4 flex flex-col gap-3 flex-1">
              {(() => {
                const attn = fleet.find(r => r.investigationOpen)!
                const ts = trendSymbol(attn.trend)
                return (
                  <>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        <span className="font-mono font-bold text-red-700 text-xs">{attn.tag}</span>
                      </div>
                      <div className="text-sm font-bold text-slate-900">{attn.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{attn.type}</div>
                    </div>

                    <div className="text-xs text-slate-700 leading-relaxed border-t border-slate-100 pt-3">
                      Abnormal vibration behavior detected. Threshold breach across multiple parameters.
                    </div>

                    <div className="space-y-1.5 border-t border-slate-100 pt-3">
                      <div className="text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider">Observed</div>
                      {selectedTag === 'BL-5702' ? (
                        <>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-600">Vibration</span>
                            <span className="font-mono font-bold text-red-700">{BL5702_READINGS.vibration} mm/s</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-600">2X Harmonic</span>
                            <span className="font-mono font-bold text-red-700">{BL5702_READINGS.harmonic_2x} mm/s</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-600">Coupling Offset</span>
                            <span className="font-mono font-bold text-red-700">{BL5702_READINGS.coupling_offset} mm</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-600">Bearing Temp</span>
                            <span className="font-mono font-bold text-amber-700">{BL5702_READINGS.bearing_temperature} °C</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-[11px] text-slate-400 font-mono">DATA NOT AVAILABLE</div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-3">
                      <div>
                        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Trend</div>
                        <span className={`font-mono font-bold ${ts.cls}`}>{ts.sym} {attn.trend}</span>
                      </div>
                      <div>
                        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Status</div>
                        <span className="font-mono text-[10px] font-bold text-red-600 border border-red-200 bg-red-50 px-1.5 py-0.5 rounded-sm">OPEN</span>
                      </div>
                    </div>

                    <Link
                      to={`/equipment/${attn.tag}`}
                      className="mt-auto flex items-center justify-center gap-1.5 border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-sm transition-colors"
                    >
                      Open Investigation
                      <ArrowRight size={13} />
                    </Link>
                  </>
                )
              })()}
            </div>
          </div>
        )}

        {/* Right: Trend Chart + Condition Panel */}
        <div className={`${fleet.find(r => r.investigationOpen) ? 'lg:col-span-9' : 'lg:col-span-12'} space-y-4`}>

          {/* Chart Header */}
          <div className="border border-slate-200 bg-white rounded-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-wider">Telemetry Trend</span>
                <span className="font-mono text-xs font-bold text-slate-900">{selectedTag} · {selectedRow?.name}</span>
                {selectedRow && (
                  <span className={`border px-1.5 py-0.5 font-mono text-[10px] font-bold rounded-sm ${conditionColor(selectedRow.condition)}`}>
                    {selectedRow.condition}
                  </span>
                )}
              </div>

              {/* Parameter Tabs */}
              <div className="flex items-center gap-0.5">
                {PARAMS.map(p => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => {
                      soundEffects.playClick()
                      setSelectedParam(p.key)
                    }}
                    className={`px-2.5 py-1 font-mono text-[11px] font-semibold rounded-sm transition-colors ${
                      selectedParam === p.key
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4">
              <TrendChart
                data={trendData}
                thresholds={thresholds}
                parameter={selectedParam}
                height={260}
                title={`${selectedTag} — ${PARAMS.find(p => p.key === selectedParam)?.label || selectedParam}`}
                showWorkflowBanner={false}
              />
            </div>
          </div>

          {/* Condition Readings + Analysis Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Current Measurements */}
            <div className="border border-slate-200 bg-white rounded-sm">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">Current Measurements</span>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-4 py-2 font-mono text-[10px] text-slate-400 font-semibold">Parameter</th>
                    <th className="text-right px-4 py-2 font-mono text-[10px] text-slate-400 font-semibold">Value</th>
                    <th className="text-right px-4 py-2 font-mono text-[10px] text-slate-400 font-semibold">Reference</th>
                    <th className="text-right px-4 py-2 font-mono text-[10px] text-slate-400 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[
                    {
                      label: 'Vibration RMS',
                      val: readings.vibration,
                      unit: 'mm/s',
                      ref: thresholds?.vibration?.alarm ? `Alarm: ${thresholds.vibration.alarm}` : (selectedTag === 'BL-5702' ? 'Alarm: 7.0' : null),
                      trip: thresholds?.vibration?.trip || (selectedTag === 'BL-5702' ? 11.0 : null),
                    },
                    {
                      label: '2X Harmonic',
                      val: readings.harmonic_2x,
                      unit: 'mm/s',
                      ref: thresholds?.harmonic_2x?.alarm ? `Alarm: ${thresholds.harmonic_2x.alarm}` : (selectedTag === 'BL-5702' ? 'Alarm: 3.0' : null),
                      trip: thresholds?.harmonic_2x?.trip || (selectedTag === 'BL-5702' ? 5.0 : null),
                    },
                    {
                      label: 'Coupling Offset',
                      val: readings.coupling_offset,
                      unit: 'mm',
                      ref: 'Tolerance: <0.050',
                      trip: 0.050,
                    },
                    {
                      label: 'Bearing Temp',
                      val: readings.bearing_temperature,
                      unit: '°C',
                      ref: thresholds?.bearing_temperature?.alarm ? `Alarm: ${thresholds.bearing_temperature.alarm}` : (selectedTag === 'BL-5702' ? 'Alarm: 80.0' : null),
                      trip: thresholds?.bearing_temperature?.trip || (selectedTag === 'BL-5702' ? 95.0 : null),
                    },
                  ].map(row => {
                    if (row.val === null) return null
                    const isBreached = row.trip != null && row.val >= row.trip
                    const isWarning = !isBreached && thresholds?.[row.label.toLowerCase().replace(' ', '_')]?.alarm != null
                      && row.val >= (thresholds[row.label.toLowerCase().replace(' ', '_')]?.alarm || Infinity)
                    return (
                      <tr key={row.label} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-slate-700">{row.label}</td>
                        <td className={`px-4 py-2 text-right font-mono font-bold ${isBreached ? 'text-red-700' : isWarning ? 'text-amber-700' : 'text-slate-900'}`}>
                          {row.val.toFixed(row.unit === 'mm' ? 3 : row.unit === '°C' ? 1 : 2)} {row.unit}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-slate-400 text-[11px]">
                          {row.ref || '—'}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <span className={`font-mono text-[10px] font-bold border px-1.5 py-0.5 rounded-sm ${
                            isBreached ? 'text-red-700 bg-red-50 border-red-300' : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          }`}>
                            {isBreached ? 'BREACHED' : 'NORMAL'}
                          </span>
                        </td>
                      </tr>
                    )
                  }).filter(Boolean)}
                  {readings.vibration === null && readings.bearing_temperature === null && (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-center font-mono text-[11px] text-slate-400">
                        DATA NOT AVAILABLE
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Possible Cause + Recommended Action */}
            <div className="border border-slate-200 bg-white rounded-sm">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500">Engineering Assessment</span>
              </div>
              <div className="p-4 space-y-4">
                {possibleCause ? (
                  <>
                    <div>
                      <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1.5">Possible Cause</div>
                      <p className="text-xs text-slate-800 leading-relaxed">{possibleCause}</p>
                    </div>

                    {rcaEvidence.length > 0 && (
                      <div>
                        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1.5">Supporting Observations</div>
                        <ul className="space-y-1.5">
                          {rcaEvidence.slice(0, 4).map((e: any, i: number) => {
                            const isObj = e && typeof e === 'object'
                            const code = isObj ? e.code : null
                            const item = isObj ? e.item : null
                            const res = isObj ? e.result : null
                            const text = isObj ? (e.evidence || e.item || JSON.stringify(e)) : String(e)

                            return (
                              <li key={i} className="flex items-start gap-1.5 text-xs text-slate-700">
                                <span className="font-mono text-slate-400 mt-0.5 flex-shrink-0">·</span>
                                <div className="leading-tight">
                                  {code && <span className="font-mono font-bold text-slate-900 mr-1">[{code}]</span>}
                                  {item && <span className="font-semibold text-slate-800 mr-1">{item}:</span>}
                                  <span>{text}</span>
                                  {res && (
                                    <span className={`ml-1.5 px-1 py-0.2 text-[9px] font-mono font-bold rounded-xs border ${
                                      res === 'NG' ? 'text-red-700 bg-red-50 border-red-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                    }`}>
                                      {res}
                                    </span>
                                  )}
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )}

                    {recommendation && (
                      <div className="border-t border-slate-100 pt-3">
                        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-1.5">Recommended Action</div>
                        <p className="text-xs text-slate-800 leading-relaxed">{recommendation}</p>
                        <div className="mt-3 flex items-center gap-2">
                          <Link
                            to={`/equipment/${selectedTag}`}
                            className="inline-flex items-center gap-1.5 border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-sm transition-colors"
                          >
                            Full Investigation
                            <ArrowRight size={12} />
                          </Link>
                          <Link
                            to="/recommendations"
                            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-primary font-mono"
                          >
                            View Work Orders
                          </Link>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-[11px] text-slate-400 font-mono py-2">
                    {selectedRow?.condition === 'NORMAL'
                      ? 'No active investigation required. Equipment operating within normal limits.'
                      : 'DATA NOT AVAILABLE'}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
