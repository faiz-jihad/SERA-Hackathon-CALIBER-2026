import React from 'react'
import { GitBranch, AlertTriangle, ArrowDown, CheckCircle2, ShieldAlert, Wrench, Layers } from 'lucide-react'

export interface FaultTreeNode {
  level: number
  category: 'SYMPTOM' | 'HARMONIC' | 'MECHANICAL' | 'ORIGIN' | 'ROOT_CAUSE'
  title: string
  parameterTag?: string
  value?: string
  threshold?: string
  description: string
  status: 'TRIP' | 'ALARM' | 'CRITICAL' | 'ROOT_CAUSE'
}

export interface FaultTreeCardProps {
  equipmentId?: string
  title?: string
  subtitle?: string
  vibration?: number
  harmonic2X?: number
  couplingOffset?: number
  bearingTemp?: number
  primaryRootCause?: string
  rcaExplanation?: string
  nodes?: FaultTreeNode[]
}

export const FaultTreeCard: React.FC<FaultTreeCardProps> = ({
  equipmentId = 'Asset',
  title = 'Deterministic 5-Why Fault Tree Propagation',
  subtitle = 'Rigorous mechanical failure sequence deduced from telemetry and vibration spectrum analysis',
  vibration = 0,
  harmonic2X = 0,
  couplingOffset = 0,
  bearingTemp = 0,
  primaryRootCause,
  rcaExplanation,
  nodes,
}) => {
  const dynamicNodes: FaultTreeNode[] = nodes || [
    {
      level: 1,
      category: 'SYMPTOM',
      title: 'Overall Vibration Severity Breach',
      parameterTag: `VIB-${equipmentId}-RMS`,
      value: `${vibration.toFixed(2)} mm/s`,
      threshold: 'Trip Limit ≥ 11.00 mm/s',
      description: `Casing and bearing pedestal overall velocity (${vibration.toFixed(2)} mm/s) surpassed safety thresholds, inducing structural fatigue.`,
      status: vibration >= 11.0 ? 'TRIP' : vibration >= 8.5 ? 'ALARM' : 'CRITICAL',
    },
    {
      level: 2,
      category: 'HARMONIC',
      title: 'Dominant 2X Rotational Harmonic Surge',
      parameterTag: `FFT-${equipmentId}-2X`,
      value: `${harmonic2X.toFixed(2)} mm/s`,
      threshold: 'Alarm Limit ≥ 5.00 mm/s',
      description: `Vibration FFT spectrum reveals dominant 2X rotational harmonic peak (${harmonic2X.toFixed(2)} mm/s), characteristic of angular and radial misalignment.`,
      status: harmonic2X >= 5.0 ? 'ALARM' : 'CRITICAL',
    },
    {
      level: 3,
      category: 'MECHANICAL',
      title: 'Shaft Centerline Radial Coupling Misalignment',
      parameterTag: `ALIGN-${equipmentId}-RAD`,
      value: `${couplingOffset.toFixed(3)} mm`,
      threshold: 'Tolerance Limit ≤ 0.050 mm',
      description: `Shaft alignment sensor confirms radial centerline offset of ${couplingOffset.toFixed(3)} mm exceeding standard tolerance.`,
      status: couplingOffset >= 0.15 ? 'CRITICAL' : 'ALARM',
    },
    {
      level: 4,
      category: 'ORIGIN',
      title: 'Thermal Growth Differential & Friction Load',
      parameterTag: `TEMP-${equipmentId}-DE`,
      value: `${bearingTemp.toFixed(1)} °C`,
      threshold: 'Alarm Limit ≥ 93.0 °C',
      description: `Unequal casing thermal growth and misalignment moment generated friction heat in DE bearing (${bearingTemp.toFixed(1)} °C).`,
      status: bearingTemp >= 93.0 ? 'ALARM' : 'CRITICAL',
    },
    {
      level: 5,
      category: 'ROOT_CAUSE',
      title: primaryRootCause || 'Inadequate Post-Turnaround Laser Alignment & Soft-Foot Verification',
      parameterTag: `RCA-ROOT-${equipmentId}`,
      value: 'Verified by Rule Engine',
      threshold: 'Maintenance Procedure Protocol',
      description: rcaExplanation || 'No hot alignment verification was conducted after previous turnaround overhaul to compensate for steady-state thermal growth.',
      status: 'ROOT_CAUSE',
    },
  ]

  const faultNodes = dynamicNodes

  const getStatusBadge = (node: FaultTreeNode) => {
    switch (node.status) {
      case 'TRIP':
        return 'bg-red-600 text-white font-bold'
      case 'ALARM':
        return 'bg-amber-100 text-amber-900 border border-amber-300 font-bold'
      case 'CRITICAL':
        return 'bg-red-100 text-red-900 border border-red-300 font-bold'
      case 'ROOT_CAUSE':
        return 'bg-primary text-white font-bold'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  return (
    <div className="rounded-sm border border-slate-200 bg-white p-5 sm:p-6 shadow-xs font-sans space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-3 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-primary bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-sm">
              5-WHY RCA TREE
            </span>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
              {title}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-sm bg-slate-50 border border-slate-200 px-2.5 py-1 text-xs font-mono text-slate-600">
            Target: <strong className="text-slate-900">{equipmentId}</strong>
          </span>
        </div>
      </div>

      {/* Fault Tree Propagation Flow */}
      <div className="space-y-2.5">
        {faultNodes.map((node, index) => {
          const isLast = index === faultNodes.length - 1
          return (
            <React.Fragment key={node.level}>
              <div
                className={`rounded-sm border p-4 transition-all duration-150 ${
                  node.status === 'ROOT_CAUSE'
                    ? 'border-primary bg-blue-50/50 shadow-xs ring-1 ring-primary'
                    : node.status === 'TRIP'
                    ? 'border-red-300 bg-red-50/30'
                    : 'border-slate-200 bg-slate-50/60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-xs bg-slate-800 text-[10px] font-mono font-bold text-white">
                      W{node.level}
                    </span>
                    <span className="text-xs font-bold text-slate-900 tracking-tight">
                      {node.title}
                    </span>
                    {node.parameterTag && (
                      <span className="rounded-xs bg-white border border-slate-300 px-1.5 py-0.2 font-mono text-[10px] text-slate-600 font-semibold">
                        {node.parameterTag}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {node.value && (
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {node.value}
                      </span>
                    )}
                    <span className={`rounded-xs px-2 py-0.5 text-[9px] font-mono uppercase ${getStatusBadge(node)}`}>
                      {node.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                  <div className="sm:col-span-8 text-slate-700 leading-relaxed">
                    {node.description}
                  </div>
                  <div className="sm:col-span-4 font-mono text-[11px] text-slate-500 sm:text-right self-center">
                    {node.threshold}
                  </div>
                </div>
              </div>

              {!isLast && (
                <div className="flex justify-center my-0.5">
                  <div className="flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-0.5 text-[10px] font-mono text-slate-500">
                    <ArrowDown size={11} className="text-primary" />
                    <span>Propagates To / Caused By</span>
                  </div>
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* Engineering Recommendation Takeaway */}
      <div className="rounded-sm bg-slate-50 border border-slate-200 p-3.5 flex items-start gap-3 text-xs text-slate-700">
        <CheckCircle2 size={16} className="text-primary shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-900 font-semibold">Engineering Mitigation Strategy: </strong>
          Correcting the physical root cause requires cold alignment with laser precision + calculation of 0.08 mm thermal rise compensation on motor non-drive end feet.
        </div>
      </div>
    </div>
  )
}

export default FaultTreeCard
