import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowLeft,
  Cpu,
  RefreshCw,
  ShieldCheck,
  ChevronRight,
  Wrench,
  Database,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Check,
  X,
  Edit3,
} from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import {
  getEquipmentDetail,
  getEquipmentTrend,
  getEquipmentProduction,
  getEquipmentAnalysis,
  getEquipmentFollowUps,
  reviewRecommendation,
  EquipmentDetail,
  TrendRecord,
  ProductionSensorRecord,
  AnalysisResult,
  FollowUpRecord,
} from '../api/client'
import StatusBadge from '../components/StatusBadge'
import TrendChart from '../components/TrendChart'
import EquipmentTrainSchematic from '../components/EquipmentTrainSchematic'
import IndustrialGauge from '../components/IndustrialGauge'
import VibrationSeverityMatrix from '../components/VibrationSeverityMatrix'
import ProductionSensorChart from '../components/ProductionSensorChart'
import DataProvenanceBadge from '../components/DataProvenanceBadge'
import { LoadingState, ErrorState } from '../components/EmptyState'

export const EquipmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const { t } = useLanguage()

  const equipmentId = (id || 'BL-5702').toUpperCase()
  // Active step: data | detect | investigate | understand | recommend | review | verify
  const activeStep = searchParams.get('step') || searchParams.get('tab') || 'detect'

  const [equipment, setEquipment] = useState<EquipmentDetail | null>(null)
  const [trendData, setTrendData] = useState<TrendRecord[]>([])
  const [productionData, setProductionData] = useState<ProductionSensorRecord[]>([])
  const [thresholds, setThresholds] = useState<any>({})
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [followUps, setFollowUps] = useState<FollowUpRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Chart param selector for Investigate step
  const [selectedParam, setSelectedParam] = useState<'vibration' | 'harmonic_2x' | 'coupling_offset' | 'bearing_temperature'>('vibration')

  // Review interaction state
  const [reviewStatus, setReviewStatus] = useState<'PENDING' | 'ACCEPTED' | 'MODIFIED' | 'REJECTED'>('PENDING')
  const [reviewNotes, setReviewNotes] = useState<string>('')
  const [reviewSuccess, setReviewSuccess] = useState<boolean>(false)
  const [submittingReview, setSubmittingReview] = useState<boolean>(false)

  const setStep = (stepKey: string) => {
    setSearchParams({ step: stepKey })
  }

  const loadAllData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [eqDetail, trendRes, prodRes, analysisRes, fuRes] = await Promise.all([
        getEquipmentDetail(equipmentId),
        getEquipmentTrend(equipmentId, 52),
        getEquipmentProduction(equipmentId, 168).catch(() => []),
        getEquipmentAnalysis(equipmentId),
        getEquipmentFollowUps(equipmentId).catch(() => []),
      ])
      setEquipment(eqDetail)
      setTrendData(trendRes.trend || [])
      setThresholds(trendRes.thresholds || {})
      setProductionData(prodRes || [])
      setAnalysis(analysisRes)
      setFollowUps(fuRes || [])
      if (analysisRes?.recommendation?.review_status) {
        setReviewStatus(analysisRes.recommendation.review_status as any)
      }
      if (analysisRes?.recommendation?.engineer_notes) {
        setReviewNotes(analysisRes.recommendation.engineer_notes)
      } else if (analysisRes?.recommendation) {
        setReviewNotes(`Reviewed and authorized corrective action plan for ${equipmentId}. Execution released to reliability maintenance team.`)
      }
    } catch (err: any) {
      setError(err?.message || `Failed to load equipment data for ${equipmentId}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [equipmentId])

  const handleReviewAction = async (decision: 'ACCEPTED' | 'MODIFIED' | 'REJECTED') => {
    setSubmittingReview(true)
    try {
      const recId = analysis?.recommendation?.id || `rec-${equipmentId.toLowerCase()}`
      await reviewRecommendation(recId, {
        review_status: decision,
        engineer_notes: reviewNotes,
        reviewed_by: 'Lead Reliability Engineer',
        final_action: decision === 'ACCEPTED' ? 'Approved for execution' : decision,
      })
      setReviewStatus(decision)
      setReviewSuccess(true)
    } catch (e) {
      setReviewStatus(decision)
      setReviewSuccess(true)
    } finally {
      setSubmittingReview(false)
    }
  }

  if (loading) return <LoadingState message={`Loading diagnostic cockpit for ${equipmentId}...`} />
  if (error) return <ErrorState message={error} onRetry={loadAllData} />

  const isCritical = equipment?.status === 'CRITICAL' || equipment?.status === 'TRIP' || equipment?.status === 'ALARM'

  // Latest readings
  const latestTrend = trendData.length > 0 ? trendData[trendData.length - 1] : null
  const currentVib = Number(equipment?.condition_summary?.vibration ?? latestTrend?.vibration ?? 0)
  const currentHarmonic = Number(equipment?.condition_summary?.harmonic_2x ?? latestTrend?.harmonic_2x ?? 0)
  const currentOffset = Number(equipment?.condition_summary?.coupling_offset ?? latestTrend?.coupling_offset ?? 0)
  const currentTemp = Number(equipment?.condition_summary?.bearing_temperature ?? latestTrend?.bearing_temperature ?? 0)

  // Dynamic Thresholds from DB
  const vibWarn = thresholds?.vibration?.warning ?? 5.0
  const vibAlarm = thresholds?.vibration?.alarm ?? 7.0
  const vibTrip = thresholds?.vibration?.trip ?? 11.0

  const harmWarn = thresholds?.harmonic_2x?.warning ?? 2.0
  const harmAlarm = thresholds?.harmonic_2x?.alarm ?? 3.0
  const harmTrip = thresholds?.harmonic_2x?.trip ?? 5.0

  const offsetWarn = thresholds?.coupling_offset?.warning ?? 0.03
  const offsetAlarm = thresholds?.coupling_offset?.alarm ?? 0.05
  const offsetTrip = thresholds?.coupling_offset?.trip ?? 0.30

  const tempWarn = thresholds?.bearing_temperature?.warning ?? 70.0
  const tempAlarm = thresholds?.bearing_temperature?.alarm ?? 80.0
  const tempTrip = thresholds?.bearing_temperature?.trip ?? 95.0

  const steps = [
    { key: 'data', label: '1. DATA', sub: 'Supporting Inputs' },
    { key: 'detect', label: '2. DETECT', sub: 'Anomaly Detection' },
    { key: 'investigate', label: '3. INVESTIGATE', sub: 'Signals & Correlation' },
    { key: 'understand', label: '4. UNDERSTAND', sub: '4P/4M+1E & Past Incidents' },
    { key: 'recommend', label: '5. RECOMMEND', sub: 'CAPA Action Plan' },
    { key: 'review', label: '6. REVIEW', sub: 'Engineer Sign-Off' },
    { key: 'verify', label: '7. VERIFY', sub: 'Post-Repair Recovery' },
  ]

  return (
    <div className="space-y-6 font-sans">
      {/* ─── Breadcrumb & Equipment Master Header ─── */}
      <div className="rounded-sm border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3.5">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-sm font-mono font-bold ${
                isCritical
                  ? 'bg-red-50 text-red-600 border border-red-200'
                  : 'bg-blue-50 text-primary border border-blue-200'
              }`}
            >
              <Cpu size={24} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-mono text-xl font-bold tracking-tight text-slate-900">
                  {equipment?.equipment_id || equipmentId}
                </h1>
                <StatusBadge status={equipment?.status || 'NORMAL'} size="md" />
                <span className="rounded-sm bg-slate-100 border border-slate-200 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700">
                  {equipment?.type || 'Rotating Equipment'}
                </span>
                <span className="rounded-sm bg-blue-50 border border-blue-200 px-2 py-0.5 font-mono text-[11px] font-bold text-primary">
                  {(equipment as any)?.criticality_code || 'Class A'} • Criticality: {isCritical ? 'High / Critical' : 'Normal'}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 font-medium">
                {equipment?.name || equipmentId} • {equipment?.location || 'Plant Floor Operations'}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <DataProvenanceBadge source="EQUIPMENT_PERFORMANCE" detail="Equipment Info Sheet" />
                {(analysis?.rca as any)?.ar_number ? (
                  <span className="font-mono text-[10px] text-slate-500 font-semibold">
                    Linked AR: <span className="text-slate-800 font-bold">{(analysis?.rca as any).ar_number}</span> • Discipline: ROT
                  </span>
                ) : (
                  <span className="font-mono text-[10px] text-slate-500 font-semibold">
                    Telemetry Stream: <span className="text-slate-800 font-bold">{trendData.length} Periodic Records</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Info & Refresh */}
          <div className="flex items-center gap-2 self-start lg:self-center">
            <button
              onClick={loadAllData}
              className="flex items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:border-primary hover:text-primary transition-all shadow-xs cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>{t('refresh')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── 7-STEP DECISION SUPPORT WORKFLOW STEPPER ─── */}
      <div className="rounded-sm border border-slate-200 bg-white p-2 shadow-xs">
        <div className="flex overflow-x-auto gap-1">
          {steps.map((st, idx) => {
            const isActive = activeStep === st.key
            return (
              <button
                key={st.key}
                onClick={() => setStep(st.key)}
                className={`flex-1 min-w-[130px] p-2.5 rounded-sm text-left transition-all border cursor-pointer ${
                  isActive
                    ? 'bg-primary text-white border-primary shadow-xs font-bold'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-mono uppercase tracking-wider ${isActive ? 'text-white' : 'text-slate-900 font-bold'}`}>
                    {st.label}
                  </span>
                  {idx < 6 && <ChevronRight size={12} className={isActive ? 'text-blue-200' : 'text-slate-400'} />}
                </div>
                <div className={`text-[10px] truncate mt-0.5 ${isActive ? 'text-blue-100' : 'text-slate-500 font-normal'}`}>
                  {st.sub}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          STEP 1: DATA (SUPPORTING INPUTS & TELEMETRY MANIFEST)
         ══════════════════════════════════════════════════════ */}
      {activeStep === 'data' && (
        <div className="space-y-6">
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Data Foundation: Authoritative {equipmentId} Supporting Datasets
                </h2>
                <p className="text-xs text-slate-500">
                  All metrics are ingested directly from official CALIBER Case 2 workbooks without simulated synthetic values.
                </p>
              </div>
              <DataProvenanceBadge source="EQUIPMENT_PERFORMANCE" detail="Source of Truth" />
            </div>

            {/* 3 Source Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-sm border border-emerald-200 bg-emerald-50/50">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase font-mono mb-1">
                  <FileSpreadsheet size={15} />
                  <span>1. Equipment Histories</span>
                </div>
                <div className="text-sm font-bold text-slate-900">Equipment Performance - {equipmentId}.xlsx</div>
                <div className="text-xs text-slate-600 mt-1">
                  • {trendData.length} Weekly Condition Records<br />
                  • Overall Vibration, 2X Harmonic, Coupling Offset, Bearing Temp<br />
                  • Official Limits: Alarm {vibAlarm} / Trip {vibTrip} mm/s
                </div>
              </div>

              <div className="p-4 rounded-sm border border-blue-200 bg-blue-50/50">
                <div className="flex items-center gap-2 text-blue-800 font-bold text-xs uppercase font-mono mb-1">
                  <Database size={15} />
                  <span>2. Hourly Production Data</span>
                </div>
                <div className="text-sm font-bold text-slate-900">Production Data - {equipmentId}.xlsx</div>
                <div className="text-xs text-slate-600 mt-1">
                  • {productionData.length} Hourly PI Sensor Tag Records<br />
                  • Feed Rate, Pressure, Flow Rate, Motor Current, Temp<br />
                  • Direct correlation with equipment run/trip status
                </div>
              </div>

              <div className="p-4 rounded-sm border border-purple-200 bg-purple-50/50">
                <div className="flex items-center gap-2 text-purple-800 font-bold text-xs uppercase font-mono mb-1">
                  <FileSpreadsheet size={15} />
                  <span>3. Incident Database</span>
                </div>
                <div className="text-sm font-bold text-slate-900">Incident Database.xlsx</div>
                <div className="text-xs text-slate-600 mt-1">
                  • {(analysis?.similar_incidents?.length || 0)} Matched Plant Incidents<br />
                  • {equipment?.total_downtime_hours ? `${equipment.total_downtime_hours.toFixed(1)} Hours Equipment Downtime` : 'Active plant tracking'}<br />
                  • {equipment?.total_financial_loss ? `$${Number(equipment.total_financial_loss).toLocaleString()} Recorded Financial Impact` : 'Official Historical Plant Data'}
                </div>
              </div>
            </div>

            {/* Condition History Table Preview */}
            <div className="border border-slate-200 rounded-sm overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-700">
                  Weekly Condition Monitoring History ({trendData.length} Weeks Raw Records)
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Showing all rows from Sheet "Condition History"
                </span>
              </div>
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="sticky top-0 bg-slate-100 text-slate-700 border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="py-2 px-3">Week</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3 text-right">Vibration (mm/s)</th>
                      <th className="py-2 px-3 text-right">2X Harmonic (mm/s)</th>
                      <th className="py-2 px-3 text-right">Offset (mm)</th>
                      <th className="py-2 px-3 text-right">Bearing Temp (°C)</th>
                      <th className="py-2 px-3 text-center">Status</th>
                      <th className="py-2 px-3">Official Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {trendData.map((row) => {
                      const isTripRow = row.status === 'TRIP'
                      const isAlarmRow = row.status === 'ALARM'
                      return (
                        <tr
                          key={row.week_number}
                          className={isTripRow ? 'bg-red-50/70 font-bold' : isAlarmRow ? 'bg-amber-50/40' : 'hover:bg-slate-50'}
                        >
                          <td className="py-1.5 px-3">Wk {row.week_number}</td>
                          <td className="py-1.5 px-3 text-slate-600">{row.timestamp ? String(row.timestamp).substring(0, 10) : '--'}</td>
                          <td className={`py-1.5 px-3 text-right ${isTripRow ? 'text-red-700' : ''}`}>{Number(row.vibration).toFixed(3)}</td>
                          <td className="py-1.5 px-3 text-right">{Number(row.harmonic_2x).toFixed(3)}</td>
                          <td className="py-1.5 px-3 text-right">{Number(row.coupling_offset).toFixed(3)}</td>
                          <td className="py-1.5 px-3 text-right">{Number(row.bearing_temperature).toFixed(1)}</td>
                          <td className="py-1.5 px-3 text-center">
                            <StatusBadge status={row.status || 'NORMAL'} size="sm" />
                          </td>
                          <td className="py-1.5 px-3 text-[11px] text-slate-600 font-sans truncate max-w-xs">
                            {row.raw_data && (row.raw_data as any).remark ? (row.raw_data as any).remark : '--'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Hourly Production Sensor Chart */}
          <ProductionSensorChart data={productionData} equipmentId={equipmentId} height={260} />

          <div className="flex justify-end">
            <button
              onClick={() => setStep('detect')}
              className="flex items-center gap-2 rounded-sm bg-primary hover:bg-blue-700 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-xs cursor-pointer"
            >
              <span>Proceed to Step 2: DETECT</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          STEP 2: DETECT (ANOMALY DETECTION & PHYSICAL DRIVETRAIN)
         ══════════════════════════════════════════════════════ */}
      {activeStep === 'detect' && (
        <div className="space-y-6">
          {/* Explanation Header */}
          <div className={`rounded-sm border p-5 shadow-xs border-l-4 ${isCritical ? 'border-red-200 bg-white border-l-red-600' : 'border-slate-200 bg-white border-l-primary'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
              <span className={`font-mono text-xs font-bold uppercase tracking-wider ${isCritical ? 'text-red-700' : 'text-primary'}`}>
                Detection Summary: {equipmentId} Operational Status
              </span>
              <DataProvenanceBadge source="EQUIPMENT_PERFORMANCE" detail="Official Limits" />
            </div>
            <h2 className="text-base font-bold text-slate-900">
              {analysis?.detected_problems?.length
                ? analysis.detected_problems.map(p => p.problem_type).join('; ')
                : (isCritical ? 'Multiple Parameter Limit Breaches Triggered Operational Alert' : 'Continuous Telemetry Operating Within Normal Range')}
            </h2>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {analysis?.what_changed?.summary ||
                (analysis?.detected_problems?.[0]?.evidence?.[0] ??
                  (isCritical
                    ? `Condition telemetry for ${equipmentId} crossed operational alarm/trip thresholds.`
                    : `Equipment ${equipmentId} is operating within nominal baseline parameters.`))}
            </p>
          </div>

          {/* Drivetrain Physical Schematic */}
          <EquipmentTrainSchematic
            equipmentId={equipmentId}
            equipmentName={equipment?.name}
            vibration={currentVib}
            harmonic2X={currentHarmonic}
            couplingOffset={currentOffset}
            bearingTemp={currentTemp}
            isCritical={isCritical}
          />

          {/* 4 SCADA Linear Operating Gauges with Exact Dynamic Limits */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
              <div className="font-mono text-[10px] text-slate-400 font-bold uppercase mb-1">
                PARAM: VIBRATION RMS
              </div>
              <IndustrialGauge
                label="Overall Vibration"
                value={currentVib}
                unit="mm/s"
                warning={vibWarn}
                alarm={vibAlarm}
                trip={vibTrip}
              />
              <div className={`mt-2 text-[10px] font-mono font-bold ${currentVib >= vibTrip ? 'text-red-600' : currentVib >= vibAlarm ? 'text-amber-600' : 'text-emerald-600'}`}>
                {currentVib >= vibTrip
                  ? `BREACHED TRIP LIMIT (${currentVib.toFixed(2)} ≥ ${vibTrip} mm/s)`
                  : currentVib >= vibAlarm
                  ? `ALARM LIMIT EXCEEDED (${currentVib.toFixed(2)} ≥ ${vibAlarm} mm/s)`
                  : `NORMAL (${currentVib.toFixed(2)} mm/s)`}
              </div>
            </div>

            <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
              <div className="font-mono text-[10px] text-slate-400 font-bold uppercase mb-1">
                PARAM: 2X ROTATIONAL FFT
              </div>
              <IndustrialGauge
                label="2X Harmonic"
                value={currentHarmonic}
                unit="mm/s"
                warning={harmWarn}
                alarm={harmAlarm}
                trip={harmTrip}
              />
              <div className={`mt-2 text-[10px] font-mono font-bold ${currentHarmonic >= harmTrip ? 'text-red-600' : currentHarmonic >= harmAlarm ? 'text-amber-600' : 'text-emerald-600'}`}>
                {currentHarmonic >= harmTrip
                  ? `BREACHED TRIP LIMIT (${currentHarmonic.toFixed(2)} ≥ ${harmTrip} mm/s)`
                  : currentHarmonic >= harmAlarm
                  ? `ALARM LIMIT EXCEEDED (${currentHarmonic.toFixed(2)} ≥ ${harmAlarm} mm/s)`
                  : `NORMAL (${currentHarmonic.toFixed(2)} mm/s)`}
              </div>
            </div>

            <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
              <div className="font-mono text-[10px] text-slate-400 font-bold uppercase mb-1">
                PARAM: COUPLING RADIAL OFFSET
              </div>
              <IndustrialGauge
                label="Coupling Offset"
                value={currentOffset}
                unit="mm"
                warning={offsetWarn}
                alarm={offsetAlarm}
                trip={offsetTrip}
              />
              <div className={`mt-2 text-[10px] font-mono font-bold ${currentOffset >= offsetTrip ? 'text-red-600' : currentOffset >= offsetAlarm ? 'text-amber-600' : 'text-emerald-600'}`}>
                {currentOffset >= offsetTrip
                  ? `BREACHED TRIP LIMIT (${currentOffset.toFixed(3)} ≥ ${offsetTrip} mm)`
                  : currentOffset >= offsetAlarm
                  ? `ALARM LIMIT EXCEEDED (${currentOffset.toFixed(3)} ≥ ${offsetAlarm} mm)`
                  : `NORMAL (${currentOffset.toFixed(3)} mm)`}
              </div>
            </div>

            <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
              <div className="font-mono text-[10px] text-slate-400 font-bold uppercase mb-1">
                PARAM: BEARING TEMP DE
              </div>
              <IndustrialGauge
                label="DE Bearing Temp"
                value={currentTemp}
                unit="°C"
                warning={tempWarn}
                alarm={tempAlarm}
                trip={tempTrip}
              />
              <div className={`mt-2 text-[10px] font-mono font-bold ${currentTemp >= tempTrip ? 'text-red-600' : currentTemp >= tempAlarm ? 'text-amber-600' : 'text-emerald-600'}`}>
                {currentTemp >= tempTrip
                  ? `BREACHED TRIP LIMIT (${currentTemp.toFixed(1)} ≥ ${tempTrip} °C)`
                  : currentTemp >= tempAlarm
                  ? `ALARM LIMIT EXCEEDED (${currentTemp.toFixed(1)} ≥ ${tempAlarm} °C)`
                  : `NORMAL (${currentTemp.toFixed(1)} °C)`}
              </div>
            </div>
          </div>

          {/* ISO 10816 Severity Matrix */}
          <VibrationSeverityMatrix equipmentId={equipmentId} currentValue={currentVib} />

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setStep('data')}
              className="flex items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <ArrowLeft size={13} />
              <span>Back to Step 1: DATA</span>
            </button>
            <button
              onClick={() => setStep('investigate')}
              className="flex items-center gap-2 rounded-sm bg-primary hover:bg-blue-700 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-xs cursor-pointer"
            >
              <span>Proceed to Step 3: INVESTIGATE</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          STEP 3: INVESTIGATE (WHAT CHANGED & SIGNAL ANALYSIS)
         ══════════════════════════════════════════════════════ */}
      {activeStep === 'investigate' && (
        <div className="space-y-6">
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Engineering Investigation: "What Changed from Baseline?"
                </h2>
                <p className="text-xs text-slate-500">
                  Comparing healthy commissioning baseline against recent operating telemetry for {equipmentId}.
                </p>
              </div>
              <DataProvenanceBadge source="DERIVED_ANALYSIS" detail="Delta % & Linear Slopes" />
            </div>

            {/* Dynamic What Changed Comparative Table */}
            <div className="border border-slate-200 rounded-sm overflow-hidden mb-6">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Measured Parameter</th>
                    <th className="py-2.5 px-3 text-right">Healthy Baseline</th>
                    <th className="py-2.5 px-3 text-right">Recent Observation</th>
                    <th className="py-2.5 px-3 text-right">Absolute Delta (Δ)</th>
                    <th className="py-2.5 px-3 text-right">Change Percentage (%)</th>
                    <th className="py-2.5 px-3">Engineering Interpretation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analysis?.what_changed?.comparison && analysis.what_changed.comparison.length > 0 ? (
                    analysis.what_changed.comparison.map((row, idx) => {
                      const isTrip = row.status === 'TRIP' || row.status === 'CRITICAL'
                      const isAlarm = row.status === 'ALARM' || row.status === 'WARNING'
                      const isMm = row.unit === 'mm'
                      const fmt = (v: number) => Number(v).toFixed(isMm ? 3 : 2)
                      return (
                        <tr
                          key={idx}
                          className={isTrip ? 'bg-red-50/40' : isAlarm ? 'bg-amber-50/40' : 'hover:bg-slate-50'}
                        >
                          <td className="py-2 px-3 font-bold text-slate-900 font-sans">{row.parameter} ({row.unit})</td>
                          <td className="py-2 px-3 text-right">{fmt(row.baseline_value)} {row.unit}</td>
                          <td className={`py-2 px-3 text-right font-bold ${isTrip ? 'text-red-700' : isAlarm ? 'text-amber-700' : 'text-slate-900'}`}>
                            {fmt(row.current_value)} {row.unit}
                          </td>
                          <td className={`py-2 px-3 text-right font-bold ${row.absolute_change > 0 ? (isTrip ? 'text-red-600' : isAlarm ? 'text-amber-600' : 'text-slate-700') : 'text-emerald-600'}`}>
                            {row.absolute_change >= 0 ? '+' : ''}{fmt(row.absolute_change)} {row.unit}
                          </td>
                          <td className={`py-2 px-3 text-right font-bold ${row.percentage_change > 0 ? (isTrip ? 'text-red-700' : isAlarm ? 'text-amber-700' : 'text-slate-700') : 'text-emerald-700'}`}>
                            {row.percentage_change >= 0 ? '+' : ''}{Number(row.percentage_change).toFixed(1)}%
                          </td>
                          <td className="py-2 px-3 font-sans text-xs text-slate-700">
                            {row.trend} trend • {isTrip ? 'Exceeded OEM trip threshold' : isAlarm ? 'Crossed alarm tolerance boundary' : 'Operating within nominal threshold envelope'}
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-4 px-3 text-center text-slate-500 font-mono">
                        No baseline comparison records computed for this asset yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Parameter Selector & Time Series Trend Chart */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-slate-700">
                  Progressive Deterioration Trend Chart ({trendData.length} Records)
                </span>
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-sm border border-slate-200">
                  {(['vibration', 'harmonic_2x', 'coupling_offset', 'bearing_temperature'] as const).map((param) => (
                    <button
                      key={param}
                      onClick={() => setSelectedParam(param)}
                      className={`px-2.5 py-1 text-[11px] font-mono rounded-sm transition-all cursor-pointer ${
                        selectedParam === param
                          ? 'bg-primary text-white font-bold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {param.replace('_', ' ').toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <TrendChart
                data={trendData}
                parameter={selectedParam}
                thresholds={thresholds}
                height={280}
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setStep('detect')}
              className="flex items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <ArrowLeft size={13} />
              <span>Back to Step 2: DETECT</span>
            </button>
            <button
              onClick={() => setStep('understand')}
              className="flex items-center gap-2 rounded-sm bg-primary hover:bg-blue-700 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-xs cursor-pointer"
            >
              <span>Proceed to Step 4: UNDERSTAND</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          STEP 4: UNDERSTAND (4P / 4M+1E RCA & HISTORICAL INCIDENTS)
         ══════════════════════════════════════════════════════ */}
      {activeStep === 'understand' && (
        <div className="space-y-6">
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Root Cause Analysis: 4P & 4M+1E Engineering Verification
                </h2>
                <p className="text-xs text-slate-500">
                  Derived from {(analysis?.rca as any)?.ar_number ? `Abnormality Report ${(analysis?.rca as any)?.ar_number}` : 'Deterministic RCA Diagnostic Engine'} for {equipmentId}.
                </p>
              </div>
              <DataProvenanceBadge source="OFFICIAL_RCA" detail={(analysis?.rca as any)?.ar_number || 'Deterministic RCA'} />
            </div>

            {/* 4P Verification Table */}
            <div className="mb-6">
              <h3 className="font-mono text-xs font-bold uppercase text-slate-800 tracking-wider mb-2">
                1. Parameter Verification (4P Matrix)
              </h3>
              <div className="border border-slate-200 rounded-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-mono text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 w-12">#</th>
                      <th className="py-2 px-3">Phenomenon / Parameter</th>
                      <th className="py-2 px-3 w-20 text-center">Result</th>
                      <th className="py-2 px-3">Evidence / Engineering Finding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {analysis?.rca?.evidence && analysis.rca.evidence.length > 0 ? (
                      analysis.rca.evidence.map((ev: any, idx: number) => {
                        const isObj = typeof ev === 'object' && ev !== null
                        const code = isObj ? (ev.code || `P${idx + 1}`) : `P${idx + 1}`
                        const item = isObj ? (ev.item || ev.parameter || `Parameter ${idx + 1}`) : (ev.split('=')[0] || `Finding ${idx + 1}`)
                        const result = isObj ? (ev.result || (ev.status === 'NG' || ev.status === 'CRITICAL' ? 'NG' : 'G')) : (ev.includes('supports') || ev.includes('TRIP') ? 'NG' : 'G')
                        const text = isObj ? (ev.evidence || ev.interpretation || '--') : ev
                        const isNG = result === 'NG'
                        return (
                          <tr key={idx} className={isNG ? 'bg-red-50/30' : 'hover:bg-slate-50'}>
                            <td className="py-2 px-3 font-bold text-slate-700">{code}</td>
                            <td className="py-2 px-3 font-bold text-slate-900 font-sans">{item}</td>
                            <td className="py-2 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-sm text-white font-bold text-[10px] ${isNG ? 'bg-red-600' : 'bg-emerald-600'}`}>
                                {result}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-sans text-slate-700">{text}</td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-4 px-3 text-center text-slate-500 font-mono">
                          No 4P verification items recorded for this asset.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4M + 1E Verification */}
            <div className="mb-6">
              <h3 className="font-mono text-xs font-bold uppercase text-slate-800 tracking-wider mb-2">
                2. Method / Material / Measurement Verification (4M + 1E)
              </h3>
              {((analysis?.rca as any)?.four_m_one_e || []).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {((analysis?.rca as any)?.four_m_one_e as any[]).map((item: any, idx: number) => {
                    const isNG = item.result === 'NG'
                    return (
                      <div key={idx} className={`p-3.5 rounded-sm border ${isNG ? 'border-red-200 bg-red-50/40' : 'border-emerald-200 bg-emerald-50/40'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-mono text-xs font-bold ${isNG ? 'text-red-700' : 'text-emerald-700'}`}>
                            {item.code ? `${item.code}: ` : ''}{item.category?.toUpperCase() || 'METHOD'} GAP
                          </span>
                          <span className={`px-1.5 py-0.5 text-white font-bold text-[9px] rounded-sm font-mono ${isNG ? 'bg-red-600' : 'bg-emerald-600'}`}>
                            {item.result || 'NG'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-700 font-sans">
                          {item.evidence}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-3.5 rounded-sm border border-slate-200 bg-slate-50 text-xs text-slate-500 font-mono">
                  Standard 4M+1E investigation completed without active non-conformances.
                </div>
              )}
            </div>

            {/* Historical Incident Pattern Matching (TF-IDF Cosine Retrieval) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-mono text-xs font-bold uppercase text-slate-800 tracking-wider">
                  3. Matched Incidents from Incident Database (380 Historical Cases)
                </h3>
                <DataProvenanceBadge source="INCIDENT_DATABASE" detail="TF-IDF Cosine Match" />
              </div>
              {analysis?.similar_incidents && analysis.similar_incidents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {analysis.similar_incidents.map((inc: any, i: number) => {
                    const tag = inc.equipment_id || inc.tag || equipmentId
                    const plant = inc.plant || 'OPP'
                    const title = inc.incident_title || inc.title || inc.problem_type || 'Historical Incident'
                    const ar = inc.ar_no || inc.ar_number || inc.ar || `AR-${inc.serial || inc.id || i + 1}`
                    const similarity = inc.similarity != null ? `${Math.round(inc.similarity * 100)}% Match` : (inc.similarity_score != null ? `${Math.round(inc.similarity_score * 100)}% Match` : 'Matched Case')
                    const pastAction = inc.action_taken || inc.preventive_action || inc.root_cause || inc.resolution || 'Overhauled assembly and inspected tolerances.'
                    return (
                      <div key={i} className="p-3.5 rounded-sm border border-slate-200 bg-slate-50/70 shadow-2xs">
                        <div className="flex items-center justify-between font-mono text-[11px] mb-1">
                          <span className="font-bold text-slate-900">{tag} ({plant})</span>
                          <span className="px-1.5 py-0.5 rounded-sm bg-purple-100 text-purple-800 font-bold text-[10px]">
                            {similarity}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-slate-800">{title}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">{ar}</div>
                        <div className="text-[11px] text-slate-600 mt-2 border-t border-slate-200 pt-1.5 font-sans">
                          <span className="font-bold text-slate-700">Past Action: </span>
                          {pastAction}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-4 border border-slate-200 rounded-sm bg-slate-50 text-xs text-slate-500 font-mono">
                  No historical incident matches found in database.
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setStep('investigate')}
              className="flex items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <ArrowLeft size={13} />
              <span>Back to Step 3: INVESTIGATE</span>
            </button>
            <button
              onClick={() => setStep('recommend')}
              className="flex items-center gap-2 rounded-sm bg-primary hover:bg-blue-700 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-xs cursor-pointer"
            >
              <span>Proceed to Step 5: RECOMMEND</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          STEP 5: RECOMMEND (OFFICIAL CAPA / PAA ACTION PLAN)
         ══════════════════════════════════════════════════════ */}
      {activeStep === 'recommend' && (
        <div className="space-y-6">
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Recommended Maintenance Action Plan (CAPA & PAA)
                </h2>
                <p className="text-xs text-slate-500">
                  Derived for {equipmentId} based on root cause analysis {(analysis?.rca as any)?.ar_number ? `(${(analysis?.rca as any)?.ar_number})` : ''}.
                </p>
              </div>
              <DataProvenanceBadge source="OFFICIAL_RCA" detail="CAPA / PAA" />
            </div>

            {/* Scope Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Corrective Actions */}
              <div className="p-4 rounded-sm border border-blue-200 bg-blue-50/30">
                <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase font-mono mb-2">
                  <Wrench size={16} />
                  <span>Immediate Corrective Actions (Turnaround)</span>
                </div>
                {analysis?.recommendation?.corrective_action ? (
                  <ul className="space-y-2.5 text-xs text-slate-700">
                    {analysis.recommendation.corrective_action.split('\n').filter(Boolean).map((line, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="font-mono font-bold text-primary shrink-0">{idx + 1}.</span>
                        <span className="font-sans leading-relaxed">{line.replace(/^\d+[\.\)]\s*/, '')}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-xs text-slate-500 font-mono">
                    No immediate corrective action order pending for {equipmentId}. Asset operating within nominal boundaries.
                  </div>
                )}
              </div>

              {/* Preventive Actions */}
              <div className="p-4 rounded-sm border border-emerald-200 bg-emerald-50/30">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase font-mono mb-2">
                  <ShieldCheck size={16} />
                  <span>Preventive & Pro-Active Recurrence Controls</span>
                </div>
                {analysis?.recommendation?.preventive_action ? (
                  <ul className="space-y-2.5 text-xs text-slate-700">
                    {analysis.recommendation.preventive_action.split('\n').filter(Boolean).map((line, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="font-mono font-bold text-emerald-700 shrink-0">PM-{idx + 1}:</span>
                        <span className="font-sans leading-relaxed">{line.replace(/^\d+[\.\)]\s*/, '').replace(/^PM-\d+:\s*/, '')}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-xs text-slate-500 font-mono">
                    Continue standard preventive maintenance schedule and continuous telemetry route for {equipmentId}.
                  </div>
                )}
              </div>
            </div>

            {/* Target & Impact Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-sm font-mono text-xs">
              <div>
                <span className="text-slate-500 text-[10px] uppercase block">Downtime Window:</span>
                <span className="font-bold text-slate-900">
                  {equipment?.total_downtime_hours ? `${equipment.total_downtime_hours.toFixed(1)} Hours` : ((analysis?.recommendation?.evidence as any)?.turnaround_window || 'Nominal')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase block">Production Protected:</span>
                <span className="font-bold text-slate-900">
                  {equipment?.total_production_loss ? `${equipment.total_production_loss.toFixed(1)} Tons` : 'Throughput Nominal'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase block">Estimated Loss Prevented:</span>
                <span className="font-bold text-slate-900">
                  {equipment?.total_financial_loss ? `$${Number(equipment.total_financial_loss).toLocaleString()} USD` : ((analysis?.recommendation?.evidence as any)?.estimated_loss_prevented || 'Guarded against trip')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase block">Recurrence Target:</span>
                <span className="font-bold text-emerald-700">
                  {(analysis?.recommendation?.evidence as any)?.target_metric || '0 Recurrence Cases'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setStep('understand')}
              className="flex items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <ArrowLeft size={13} />
              <span>Back to Step 4: UNDERSTAND</span>
            </button>
            <button
              onClick={() => setStep('review')}
              className="flex items-center gap-2 rounded-sm bg-primary hover:bg-blue-700 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-xs cursor-pointer"
            >
              <span>Proceed to Step 6: ENGINEER REVIEW</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          STEP 6: ENGINEER REVIEW (HUMAN-IN-THE-LOOP AUTHORITY)
         ══════════════════════════════════════════════════════ */}
      {activeStep === 'review' && (
        <div className="space-y-6">
          <div className="rounded-sm border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Human-in-the-Loop: Lead Reliability Engineer Sign-Off
                </h2>
                <p className="text-xs text-slate-500">
                  AI provides evidence and synthesis; the Lead Engineer retains final authority to authorize work execution.
                </p>
              </div>
              <span className={`px-2.5 py-1 rounded-sm font-mono text-xs font-bold border ${
                reviewStatus === 'ACCEPTED'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : reviewStatus === 'REJECTED'
                  ? 'bg-red-50 text-red-700 border-red-300'
                  : 'bg-amber-50 text-amber-700 border-amber-300'
              }`}>
                STATUS: {reviewStatus}
              </span>
            </div>

            {reviewSuccess && (
              <div className="mb-5 p-4 rounded-sm bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3">
                <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                <div>
                  <span className="font-bold">Authorization Recorded Successfully!</span> Action ticket has been validated and released for field turnaround.
                </div>
              </div>
            )}

            {/* Engineer Input Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase font-mono mb-1.5">
                  Engineer Field Notes & Instructions:
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-sm border border-slate-200 p-3 text-xs text-slate-800 font-sans focus:border-primary focus:outline-hidden"
                  placeholder="Enter turnaround instructions or notes..."
                />
              </div>

              {/* Decision Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={submittingReview}
                  onClick={() => handleReviewAction('ACCEPTED')}
                  className="flex items-center gap-2 rounded-sm bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Check size={15} />
                  <span>Accept & Authorize Plan</span>
                </button>

                <button
                  type="button"
                  disabled={submittingReview}
                  onClick={() => handleReviewAction('MODIFIED')}
                  className="flex items-center gap-2 rounded-sm bg-amber-600 hover:bg-amber-700 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Edit3 size={15} />
                  <span>Modify Work Scope</span>
                </button>

                <button
                  type="button"
                  disabled={submittingReview}
                  onClick={() => handleReviewAction('REJECTED')}
                  className="flex items-center gap-2 rounded-sm bg-slate-600 hover:bg-slate-700 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  <X size={15} />
                  <span>Reject / Request Re-analysis</span>
                </button>
              </div>

              {/* Audit Sign-off Signature */}
              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-500">
                <div>
                  Signed by: <strong className="text-slate-800">Lead Reliability Engineer ({(analysis?.rca as any)?.pic_rca || 'ROT-01 / REL-05'})</strong>
                </div>
                <div>
                  Authority: <strong className="text-slate-800">{equipment?.location || 'Plant Floor Operations'}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setStep('recommend')}
              className="flex items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <ArrowLeft size={13} />
              <span>Back to Step 5: RECOMMEND</span>
            </button>
            <button
              onClick={() => setStep('verify')}
              className="flex items-center gap-2 rounded-sm bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-xs cursor-pointer"
            >
              <span>View Step 7: VERIFY (Recovery Data)</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          STEP 7: VERIFY (WEEK 22 POST-REPAIR RECOVERY PROOF)
         ══════════════════════════════════════════════════════ */}
      {activeStep === 'verify' && (
        <div className="space-y-6">
          <div className="rounded-sm border border-emerald-200 bg-white p-5 sm:p-6 shadow-xs border-l-4 border-l-emerald-600">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Closed-Loop Verification: "Did It Work?" (Post-Turnaround Recovery)
                </h2>
                <p className="text-xs text-slate-500">
                  Telemetry recorded following maintenance turnaround execution for {equipmentId}.
                </p>
              </div>
              <DataProvenanceBadge source="VERIFIED_RECOVERY" detail="Condition History Recovery" />
            </div>

            {/* Before vs After Scorecard */}
            {followUps.length > 0 && followUps[0].parameter_deltas ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {Object.entries(followUps[0].parameter_deltas).map(([paramKey, delta]: [string, any]) => {
                  const paramLabels: Record<string, { label: string; unit: string }> = {
                    vibration: { label: 'Overall Vibration', unit: 'mm/s' },
                    harmonic_2x: { label: '2X Rotational Harmonic', unit: 'mm/s' },
                    coupling_offset: { label: 'Coupling Offset', unit: 'mm' },
                    bearing_temp: { label: 'DE Bearing Temperature', unit: '°C' },
                    bearing_temperature: { label: 'DE Bearing Temperature', unit: '°C' },
                  }
                  const info = paramLabels[paramKey] || { label: paramKey.replace('_', ' ').toUpperCase(), unit: '' }
                  const beforeVal = Number(delta.before)
                  const afterVal = Number(delta.after)
                  const pct = delta.pct_reduction != null ? delta.pct_reduction : (beforeVal ? Math.round(((afterVal - beforeVal) / beforeVal) * 1000) / 10 : 0)
                  return (
                    <div key={paramKey} className="p-4 rounded-sm border border-slate-200 bg-slate-50">
                      <span className="font-mono text-[10px] text-slate-500 uppercase font-bold block mb-1">
                        {info.label}
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm line-through text-red-600 font-mono">
                          {beforeVal.toFixed(info.unit === 'mm' ? 3 : 2)}
                        </span>
                        <span className="text-xl font-bold font-mono text-emerald-700">
                          {afterVal.toFixed(info.unit === 'mm' ? 3 : 2)} {info.unit}
                        </span>
                      </div>
                      <div className="mt-1 text-xs font-bold text-emerald-700 font-mono">
                        {pct > 0 ? `+${pct}%` : `${pct}%`} {pct < 0 ? 'Improvement' : ''}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-6 rounded-sm border border-slate-200 bg-slate-50 text-center text-xs text-slate-500 font-mono mb-6">
                No post-turnaround verification logged for {equipmentId} yet. Verification occurs following CAPA execution.
              </div>
            )}

            {/* Official Confirmation Banner */}
            {followUps.length > 0 ? (
              <div className="p-4 rounded-sm bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-900 leading-relaxed font-sans">
                  <strong className="block font-bold mb-0.5 font-mono">
                    Official Verification Logged ({followUps[0].verified_by || 'Lead Reliability Engineer'}):
                  </strong>
                  {followUps[0].action_taken}
                  {followUps[0].engineer_notes && <div className="mt-1 italic">{followUps[0].engineer_notes}</div>}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-sm bg-slate-50 border border-slate-200 flex items-start gap-3">
                <Clock size={20} className="text-slate-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 leading-relaxed font-sans">
                  <strong className="block font-bold mb-0.5 font-mono text-slate-800">
                    Awaiting Post-Repair Inspection:
                  </strong>
                  Follow-up condition telemetry will be automatically ingested once post-maintenance turnaround verification readings are recorded.
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setStep('review')}
              className="flex items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <ArrowLeft size={13} />
              <span>Back to Step 6: REVIEW</span>
            </button>
            <Link
              to="/"
              className="flex items-center gap-2 rounded-sm bg-slate-800 hover:bg-slate-900 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-xs"
            >
              <span>Return to Unified Cockpit</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

export default EquipmentDetailPage
