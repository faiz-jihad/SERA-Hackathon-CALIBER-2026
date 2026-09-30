import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { RefreshCw, ArrowRight, ChevronRight } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import {
  getEquipmentList,
  getEquipmentAnalysis,
  investigateEquipment,
  AnalysisResult,
  EquipmentSummary,
} from '../api/client'
import WhatChangedTable from '../components/WhatChangedTable'
import FaultTreeCard from '../components/FaultTreeCard'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'

const CASE_2_TAGS = ['BL-5702', 'KO-3201', 'PM-4405B', 'PU-2101B', 'HE-3301']

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
      setEquipmentList(eqs.filter(e => CASE_2_TAGS.includes(e.equipment_id)))
      setAnalysis(ana)
    } catch (err: any) {
      setError(err?.message || 'Failed to load investigation data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [selectedEquipment])

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

  const targetEq = equipmentList.find(e => e.equipment_id === selectedEquipment)
  const isAttention = targetEq?.status === 'CRITICAL' || targetEq?.status === 'TRIP' || targetEq?.status === 'ALARM' || selectedEquipment === 'BL-5702'

  const vibParam = analysis?.what_changed?.comparison?.find(c => c.parameter_key === 'vibration')
  const harmParam = analysis?.what_changed?.comparison?.find(c => c.parameter_key === 'harmonic_2x')
  const offsetParam = analysis?.what_changed?.comparison?.find(c => c.parameter_key === 'coupling_offset')
  const tempParam = analysis?.what_changed?.comparison?.find(c => c.parameter_key === 'bearing_temperature')

  const currentVib = Number(vibParam?.current_value ?? targetEq?.latest_condition?.vibration ?? (selectedEquipment === 'BL-5702' ? 11.22 : 0))
  const currentHarmonic = Number(harmParam?.current_value ?? targetEq?.latest_condition?.harmonic_2x ?? (selectedEquipment === 'BL-5702' ? 5.10 : 0))
  const currentOffset = Number(offsetParam?.current_value ?? targetEq?.latest_condition?.coupling_offset ?? (selectedEquipment === 'BL-5702' ? 0.306 : 0))
  const currentTemp = Number(tempParam?.current_value ?? targetEq?.latest_condition?.bearing_temperature ?? (selectedEquipment === 'BL-5702' ? 96.9 : 0))

  const WORKFLOW_STEPS = [
    { label: 'DATA', done: true },
    { label: 'DETECTION', done: isAttention },
    { label: 'INVESTIGATION', done: !!analysis },
    { label: 'EVIDENCE', done: !!(analysis?.evidence_layer?.length) },
    { label: 'ROOT CAUSE', done: !!analysis?.rca?.primary_root_cause },
    { label: 'ACTION', done: !!analysis?.recommendation },
    { label: 'DECISION', done: analysis?.recommendation?.review_status === 'ACCEPTED' },
  ]

  return (
    <div className="space-y-4 font-sans text-slate-800">

      {/* Page Header */}
      <div className="border-b border-slate-200 pb-3">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Investigations & Failure Diagnostics
            </h1>
            <p className="text-xs font-mono text-slate-500 mt-0.5">
              Deterministic engineering evidence synthesis and Root Cause Analysis
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-mono text-slate-500">Target Asset:</label>
            <select
              value={selectedEquipment}
              onChange={(e) => setSearchParams({ asset: e.target.value })}
              className="border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900 focus:border-slate-500 focus:outline-none rounded-sm"
            >
              {equipmentList.map(eq => (
                <option key={eq.equipment_id} value={eq.equipment_id}>
                  {eq.equipment_id} — {eq.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleRunInvestigation}
              disabled={investigating}
              className="flex items-center gap-1.5 border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors rounded-sm"
            >
              <RefreshCw size={12} className={investigating ? 'animate-spin' : ''} />
              {investigating ? 'Running...' : 'Re-Run'}
            </button>
          </div>
        </div>
      </div>

      {/* Workflow Progress */}
      <div className="border border-slate-200 bg-white rounded-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Investigation Workflow
          </span>
        </div>
        <div className="flex items-stretch divide-x divide-slate-200 overflow-x-auto">
          {WORKFLOW_STEPS.map((step, i) => (
            <div key={step.label} className={`flex-1 min-w-[80px] px-3 py-2.5 text-center ${step.done ? 'bg-white' : 'bg-slate-50/40'}`}>
              <div className={`font-mono text-[10px] font-bold ${step.done ? 'text-slate-900' : 'text-slate-400'}`}>
                {i + 1}
              </div>
              <div className={`text-[10px] font-mono mt-0.5 ${step.done ? 'text-slate-700' : 'text-slate-400'}`}>
                {step.label}
              </div>
              <div className="mt-1.5 flex justify-center">
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${step.done ? 'bg-emerald-500' : 'bg-slate-200'}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingState message={`Loading investigation data for ${selectedEquipment}...`} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : (
        <div className="space-y-4">

          {/* Current Equipment Status Header */}
          {isAttention && (
            <div className="border border-red-200 bg-red-50 rounded-sm px-4 py-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  <span className="font-mono font-bold text-red-700 text-xs">{selectedEquipment}</span>
                  <span className="border border-red-300 bg-red-50 text-red-700 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-sm">ATTENTION</span>
                </div>
                <p className="text-xs text-red-800 mt-1">
                  {analysis?.rca?.primary_root_cause
                    ? `Primary cause: ${analysis.rca.primary_root_cause}`
                    : 'Abnormal operating condition detected. Threshold breach confirmed.'}
                </p>
              </div>
              <Link
                to={`/equipment/${selectedEquipment}`}
                className="flex items-center gap-1 text-xs font-semibold text-red-700 hover:text-red-900 border border-red-300 px-3 py-1.5 rounded-sm bg-white transition-colors"
              >
                Equipment Detail
                <ChevronRight size={13} />
              </Link>
            </div>
          )}

          {/* Evidence Section */}
          <div className="border border-slate-200 bg-white rounded-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Engineering Observation
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                {analysis?.evidence_layer?.length || 0} parameters evaluated
              </span>
            </div>
            <div className="p-0">
              {analysis?.evidence_layer && analysis.evidence_layer.length > 0 ? (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">Parameter</th>
                      <th className="text-right px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">Observed Value</th>
                      <th className="text-right px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">Reference</th>
                      <th className="text-right px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">Status</th>
                      <th className="px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">Interpretation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analysis.evidence_layer.map((ev, i) => {
                      const isBreach = ev.severity === 'TRIP' || ev.severity === 'ALARM' || ev.severity === 'HIGH'
                      return (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-semibold text-slate-800">{ev.parameter}</td>
                          <td className={`px-4 py-2.5 text-right font-mono font-bold ${isBreach ? 'text-red-700' : 'text-slate-800'}`}>
                            {ev.observed_value?.toFixed(3)} {ev.unit}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-slate-400 text-[11px]">
                            {ev.threshold || '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={`border px-1.5 py-0.5 font-mono text-[10px] font-bold rounded-sm ${
                              isBreach
                                ? 'text-red-700 bg-red-50 border-red-300'
                                : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                            }`}>
                              {ev.severity || 'NORMAL'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-slate-600 max-w-xs">
                            {ev.interpretation}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="px-4 py-6 text-center font-mono text-xs text-slate-400">
                  No active parameter breaches — {selectedEquipment} operating within normal limits
                </div>
              )}
            </div>
          </div>

          {/* What Changed Table */}
          {analysis?.what_changed?.comparison && (
            <div className="border border-slate-200 bg-white rounded-sm">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Parameter Change Analysis
                </span>
                {analysis.what_changed.current_period && (
                  <span className="ml-2 font-mono text-[10px] text-slate-400">
                    {analysis.what_changed.previous_period} → {analysis.what_changed.current_period}
                  </span>
                )}
              </div>
              <WhatChangedTable
                data={analysis.what_changed.comparison}
                summary={analysis.what_changed.summary}
                currentPeriod={analysis.what_changed.current_period}
                previousPeriod={analysis.what_changed.previous_period}
              />
            </div>
          )}

          {/* Root Cause Analysis */}
          <div className="border border-slate-200 bg-white rounded-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Root Cause Analysis
              </span>
              {analysis?.rca?.confidence_level && (
                <span className="ml-2 font-mono text-[10px] text-slate-400">
                  Confidence: {analysis.rca.confidence_level}
                </span>
              )}
            </div>
            <div className="p-4 space-y-4">
              {analysis?.rca?.primary_root_cause ? (
                <>
                  <div>
                    <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 mb-1">Possible Cause</div>
                    <p className="text-sm font-semibold text-slate-900">{analysis.rca.primary_root_cause}</p>
                  </div>
                  {analysis.rca.explanation && (
                    <div>
                      <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 mb-1">Explanation</div>
                      <p className="text-xs text-slate-700 leading-relaxed">{analysis.rca.explanation}</p>
                    </div>
                  )}
                  {analysis.rca.evidence && analysis.rca.evidence.length > 0 && (
                    <div>
                      <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 mb-1.5">Supporting Observations</div>
                      <ul className="space-y-1.5">
                        {analysis.rca.evidence.map((e: any, i: number) => {
                          const isObj = e && typeof e === 'object'
                          const code = isObj ? e.code : null
                          const item = isObj ? e.item : null
                          const res = isObj ? e.result : null
                          const text = isObj ? (e.evidence || e.item || JSON.stringify(e)) : String(e)

                          return (
                            <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
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
                </>
              ) : (
                <p className="text-xs text-slate-400 font-mono">DATA NOT AVAILABLE — Run investigation to generate RCA</p>
              )}

              <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                <Link
                  to={`/equipment/${selectedEquipment}`}
                  className="inline-flex items-center gap-1.5 border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-sm transition-colors"
                >
                  Equipment Detail <ArrowRight size={12} />
                </Link>
                <Link
                  to="/recommendations"
                  className="inline-flex items-center gap-1.5 border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 rounded-sm transition-colors"
                >
                  View Recommendations <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </div>

          {/* Fault Tree */}
          <FaultTreeCard
            equipmentId={selectedEquipment}
            title="Fault Tree — 5-Why Analysis"
            subtitle="Mechanical failure propagation from vibration frequency data and operational logs"
            vibration={currentVib}
            harmonic2X={currentHarmonic}
            couplingOffset={currentOffset}
            bearingTemp={currentTemp}
            primaryRootCause={analysis?.rca?.primary_root_cause}
            rcaExplanation={analysis?.rca?.explanation}
          />

        </div>
      )}
    </div>
  )
}

export default AnalysisPage
