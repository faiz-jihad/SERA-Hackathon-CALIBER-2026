import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Activity,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import {
  getEquipmentList,
  getEquipmentAnalysis,
  investigateEquipment,
  AnalysisResult,
  EquipmentSummary,
} from '../api/client'
import SectionHeader from '../components/SectionHeader'
import InvestigationStep from '../components/InvestigationStep'
import EvidenceGroup from '../components/EvidenceItem'
import WhatChangedTable from '../components/WhatChangedTable'
import EquipmentTrainSchematic from '../components/EquipmentTrainSchematic'
import FaultTreeCard from '../components/FaultTreeCard'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'

export const AnalysisPage: React.FC = () => {
  const { t } = useLanguage()
  const [searchParams, setSearchParams] = useSearchParams()

  const selectedEquipment = (searchParams.get('asset') || 'BL-5702').toUpperCase()

  const [equipmentList, setEquipmentList] = useState<EquipmentSummary[]>([])
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [investigating, setInvestigating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [eqs, ana] = await Promise.all([
        getEquipmentList(),
        getEquipmentAnalysis(selectedEquipment),
      ])
      setEquipmentList(eqs)
      setAnalysis(ana)
    } catch (err: any) {
      setError(err?.message || 'Failed to load investigation data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedEquipment])

  const handleRunInvestigation = async () => {
    setInvestigating(true)
    try {
      await investigateEquipment(selectedEquipment)
      await loadData()
    } catch (err: any) {
      console.warn('Investigation agent fallback:', err)
    } finally {
      setInvestigating(false)
    }
  }

  const targetEq = equipmentList.find((e) => e.equipment_id === selectedEquipment)
  const isCrit = targetEq?.status === 'CRITICAL' || targetEq?.status === 'TRIP' || targetEq?.status === 'ALARM'

  const vibParam = analysis?.what_changed?.comparison?.find(c => c.parameter_key === 'vibration')
  const harmParam = analysis?.what_changed?.comparison?.find(c => c.parameter_key === 'harmonic_2x')
  const offsetParam = analysis?.what_changed?.comparison?.find(c => c.parameter_key === 'coupling_offset')
  const tempParam = analysis?.what_changed?.comparison?.find(c => c.parameter_key === 'bearing_temperature')

  const currentVib = Number(vibParam?.current_value ?? targetEq?.latest_condition?.vibration ?? 0)
  const currentHarmonic = Number(harmParam?.current_value ?? targetEq?.latest_condition?.harmonic_2x ?? 0)
  const currentOffset = Number(offsetParam?.current_value ?? targetEq?.latest_condition?.coupling_offset ?? 0)
  const currentTemp = Number(tempParam?.current_value ?? targetEq?.latest_condition?.bearing_temperature ?? 0)

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Activity size={22} className="text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {t('navInvestigations')} & Failure Diagnostics
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Deterministic engineering evidence synthesis and Root Cause Analysis
          </p>
        </div>

        {/* Asset Selector */}
        <div className="flex items-center gap-2.5">
          <label className="text-xs text-slate-500 font-mono hidden sm:inline">Target Asset:</label>
          <select
            value={selectedEquipment}
            onChange={(e) => setSearchParams({ asset: e.target.value })}
            className="rounded-sm border border-slate-200 bg-white px-3.5 py-2 font-mono text-xs text-slate-900 focus:border-primary focus:outline-none shadow-xs"
          >
            {equipmentList.map((eq) => (
              <option key={eq.equipment_id} value={eq.equipment_id}>
                {eq.equipment_id} — {eq.name} ({eq.status})
              </option>
            ))}
          </select>

          <button
            onClick={handleRunInvestigation}
            disabled={investigating}
            className="flex items-center gap-2 rounded-sm bg-primary hover:bg-blue-700 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all"
          >
            <Sparkles size={14} className={investigating ? 'animate-spin' : ''} />
            <span>{investigating ? 'Running...' : 'Re-Run Investigation'}</span>
          </button>
        </div>
      </div>

      {/* 6-Step Workflow Tracker */}
      <InvestigationStep currentStep={isCrit ? 3 : 1} />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : (
        <div className="space-y-6">
          {/* Mechanical Train Component Synoptic */}
          <EquipmentTrainSchematic
            equipmentId={selectedEquipment}
            equipmentName={targetEq?.name}
            vibration={currentVib}
            harmonic2X={currentHarmonic}
            couplingOffset={currentOffset}
            bearingTemp={currentTemp}
            isCritical={isCrit}
            rootCause={analysis?.rca?.primary_root_cause}
          />

          {/* Section A: Measured Engineering Evidence (Section 19: Evidence FIRST) */}
          <div className="rounded-sm border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <SectionHeader
              number="01"
              title={t('evidenceSectionTitle')}
              subtitle={t('evidenceSectionSubtitle')}
              badge={
                <span className="rounded-sm bg-blue-50 border border-blue-200 text-primary font-mono text-[10px] font-bold px-2 py-0.5">
                  {t('evidenceStrength')}: {t('strengthStrong')}
                </span>
              }
            />

            {analysis?.evidence_layer && analysis.evidence_layer.length > 0 ? (
              <EvidenceGroup
                title="Active Parameter Breaches & Provenance"
                items={analysis.evidence_layer}
              />
            ) : (
              <EmptyState title="No active evidence breaches for this asset" />
            )}
          </div>

          {/* Section B: What Changed Comparative Table */}
          {analysis?.what_changed?.comparison && (
            <WhatChangedTable
              data={analysis.what_changed.comparison}
              summary={analysis.what_changed.summary}
              currentPeriod={analysis.what_changed.current_period}
              previousPeriod={analysis.what_changed.previous_period}
            />
          )}

          {/* Section C: Deterministic 5-Why Fault Tree Propagation */}
          <FaultTreeCard
            equipmentId={selectedEquipment}
            title="Deterministic 5-Why Root Cause Tree"
            subtitle="Mechanical failure propagation deduced from vibration frequency spectrum and operational logs"
            vibration={currentVib}
            harmonic2X={currentHarmonic}
            couplingOffset={currentOffset}
            bearingTemp={currentTemp}
            primaryRootCause={analysis?.rca?.primary_root_cause}
            rcaExplanation={analysis?.rca?.explanation}
          />

          {/* Section D: AI Investigation Summary (Visually subtle) */}
          <div className="rounded-sm border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <Sparkles size={16} className="text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                {t('aiSectionTitle')}
              </h3>
              <span className="rounded-sm bg-blue-50 border border-blue-200 px-2 py-0.5 font-mono text-[10px] text-primary font-semibold">
                Reasoning Layer
              </span>
            </div>

            <div className="rounded-sm bg-slate-50 border border-slate-200 p-4 text-xs text-slate-700 leading-relaxed space-y-2.5">
              <p>
                {analysis?.rca?.explanation || analysis?.what_changed?.summary || `Continuous telemetry analysis for ${selectedEquipment} indicates observed parameters evaluated against deterministic rule thresholds.`}
              </p>
              {analysis?.rca?.primary_root_cause && (
                <p>
                  <strong className="text-slate-900">Primary Root Cause: </strong>
                  {analysis.rca.primary_root_cause} (Confidence: {analysis.rca.confidence_level || 'HIGH'}).
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Link
                to={`/equipment/${selectedEquipment}?tab=recommendations`}
                className="flex items-center gap-2 rounded-sm bg-primary hover:bg-blue-700 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white shadow-xs transition-all"
              >
                <span>View Maintenance Recommendations</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AnalysisPage
