import React from 'react'
import { AlertOctagon, AlertTriangle, CheckCircle2, Zap, ArrowRight, Gauge } from 'lucide-react'

export interface EquipmentTrainSchematicProps {
  equipmentId?: string
  equipmentName?: string
  vibration?: number
  harmonic2X?: number
  couplingOffset?: number
  bearingTemp?: number
  isCritical?: boolean
  rootCause?: string
}

export const EquipmentTrainSchematic: React.FC<EquipmentTrainSchematicProps> = ({
  equipmentId = 'Asset',
  equipmentName = 'Rotating Machinery Train',
  vibration = 0,
  harmonic2X = 0,
  couplingOffset = 0,
  bearingTemp = 0,
  isCritical = false,
  rootCause,
}) => {
  // Dynamic threshold evaluations
  const isCouplingTrip = couplingOffset >= 0.15
  const isCouplingWarn = couplingOffset >= 0.05
  const isHarmonicAlarm = harmonic2X >= 5.0
  const isTempAlarm = bearingTemp >= 93.0
  const isTempWarn = bearingTemp >= 75.0
  const isVibTrip = vibration >= 11.0
  const isVibWarn = vibration >= 7.1

  const activeRootCause = rootCause || (
    isCouplingTrip || isCouplingWarn
      ? 'ROOT CAUSE: COUPLING MISALIGNMENT'
      : isVibTrip
      ? 'ROOT CAUSE: HIGH VIBRATION INTERLOCK'
      : 'OPERATING STATE: NOMINAL'
  )

  return (
    <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs font-sans space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-3 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-primary bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-sm">
              MECHANICAL TRAIN SCHEMATIC
            </span>
            <h3 className="text-sm font-bold text-slate-900 uppercase">
              {equipmentId} Physical Asset Breakdown
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Component-level telemetry correlation and physical root cause origin mapping
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span
            className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-mono font-bold ${
              isCritical || isCouplingTrip || isVibTrip
                ? 'bg-red-50 border border-red-200 text-red-700'
                : isCouplingWarn || isTempWarn
                ? 'bg-amber-50 border border-amber-200 text-amber-700'
                : 'bg-blue-50 border border-blue-200 text-primary'
            }`}
          >
            {(isCritical || isCouplingTrip || isVibTrip) && (
              <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
            )}
            <span>{activeRootCause}</span>
          </span>
        </div>
      </div>

      {/* Visual Train Block Diagram */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative items-stretch">
        {/* Component 1: Electric Motor */}
        <div className="rounded-sm border border-slate-200 bg-slate-50 p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-[10px] font-bold text-slate-400 uppercase">Stage 01</span>
              <span className="rounded-sm bg-blue-50 border border-blue-200 px-1.5 py-0.2 font-mono text-[9px] font-bold text-primary">
                NOMINAL
              </span>
            </div>
            <h4 className="text-xs font-bold text-slate-900">Electric Drive Motor</h4>
            <span className="text-[10px] text-slate-500 font-mono">350 kW • 2980 RPM</span>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-200 text-[11px] font-mono text-slate-600">
            <div>1X Harmonic: {(vibration * 0.25).toFixed(1)} mm/s</div>
            <div>Stator Temp: {(45 + (bearingTemp * 0.2)).toFixed(1)} °C</div>
          </div>
        </div>

        {/* Component 2: Flexible Coupling */}
        <div
          className={`rounded-sm p-3.5 flex flex-col justify-between shadow-xs ${
            isCouplingTrip
              ? 'border-2 border-red-500 bg-red-50/40 ring-2 ring-red-200'
              : isCouplingWarn
              ? 'border border-amber-400 bg-amber-50/30'
              : 'border border-slate-200 bg-slate-50'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span
                className={`font-mono text-[10px] font-bold uppercase ${
                  isCouplingTrip ? 'text-red-700' : isCouplingWarn ? 'text-amber-700' : 'text-slate-400'
                }`}
              >
                Stage 02 {isCouplingTrip ? '• FAULT' : ''}
              </span>
              <span
                className={`rounded-sm px-1.5 py-0.2 font-mono text-[9px] font-bold ${
                  isCouplingTrip
                    ? 'bg-red-600 text-white'
                    : isCouplingWarn
                    ? 'bg-amber-500 text-white'
                    : 'bg-blue-50 border border-blue-200 text-primary'
                }`}
              >
                {isCouplingTrip ? 'TRIP OFFSET' : isCouplingWarn ? 'WARN OFFSET' : 'NOMINAL'}
              </span>
            </div>
            <h4 className={`text-xs font-bold ${isCouplingTrip ? 'text-red-900' : 'text-slate-900'}`}>
              Flexible Disc Coupling
            </h4>
            <span className={`text-[10px] font-mono ${isCouplingTrip ? 'text-red-700 font-semibold' : 'text-slate-500'}`}>
              {isCouplingTrip ? 'Centerline Misalignment' : 'Direct Mechanical Drive'}
            </span>
          </div>

          <div
            className={`mt-3 pt-2 border-t text-[11px] font-mono space-y-0.5 ${
              isCouplingTrip
                ? 'border-red-200 text-red-800 font-bold'
                : isCouplingWarn
                ? 'border-amber-200 text-amber-800 font-semibold'
                : 'border-slate-200 text-slate-600'
            }`}
          >
            <div>Offset: {couplingOffset.toFixed(3)} mm (Tol ≤ 0.05)</div>
            <div>2X Harmonic: {harmonic2X.toFixed(2)} mm/s (Lim ≤ 5.0)</div>
          </div>
        </div>

        {/* Component 3: Drive End (DE) Bearing */}
        <div
          className={`rounded-sm p-3.5 flex flex-col justify-between ${
            isTempAlarm
              ? 'border border-amber-400 bg-amber-50/40 ring-1 ring-amber-300'
              : isTempWarn
              ? 'border border-amber-300 bg-amber-50/20'
              : 'border border-slate-200 bg-slate-50'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span
                className={`font-mono text-[10px] font-bold uppercase ${
                  isTempAlarm ? 'text-amber-700' : 'text-slate-400'
                }`}
              >
                Stage 03
              </span>
              <span
                className={`rounded-sm px-1.5 py-0.2 font-mono text-[9px] font-bold ${
                  isTempAlarm
                    ? 'bg-amber-100 border border-amber-300 text-amber-800'
                    : 'bg-blue-50 border border-blue-200 text-primary'
                }`}
              >
                {isTempAlarm ? 'ALARM TEMP' : isTempWarn ? 'WARN TEMP' : 'NOMINAL'}
              </span>
            </div>
            <h4 className="text-xs font-bold text-slate-900">DE Sleeve Bearing</h4>
            <span className="text-[10px] text-slate-500 font-mono">
              {isTempAlarm ? 'Friction Heating' : 'Hydrodynamic Film'}
            </span>
          </div>

          <div
            className={`mt-3 pt-2 border-t text-[11px] font-mono ${
              isTempAlarm
                ? 'border-amber-200 text-amber-800 font-bold'
                : 'border-slate-200 text-slate-600'
            }`}
          >
            <div>Bearing Temp: {bearingTemp.toFixed(1)} °C</div>
            <div className="text-[10px] font-normal text-slate-500">Threshold: ≥ 93.0 °C</div>
          </div>
        </div>

        {/* Component 4: Centrifugal Impeller / Casing */}
        <div
          className={`rounded-sm p-3.5 flex flex-col justify-between ${
            isVibTrip
              ? 'border border-red-400 bg-red-50/30 ring-1 ring-red-300'
              : isVibWarn
              ? 'border border-amber-300 bg-amber-50/20'
              : 'border border-slate-200 bg-slate-50'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span
                className={`font-mono text-[10px] font-bold uppercase ${
                  isVibTrip ? 'text-red-600' : 'text-slate-400'
                }`}
              >
                Stage 04
              </span>
              <span
                className={`rounded-sm px-1.5 py-0.2 font-mono text-[9px] font-bold ${
                  isVibTrip
                    ? 'bg-red-100 border border-red-300 text-red-800'
                    : isVibWarn
                    ? 'bg-amber-100 border border-amber-300 text-amber-800'
                    : 'bg-blue-50 border border-blue-200 text-primary'
                }`}
              >
                {isVibTrip ? 'TRIP VIB' : isVibWarn ? 'WARN VIB' : 'NOMINAL'}
              </span>
            </div>
            <h4 className="text-xs font-bold text-slate-900">{equipmentName || 'Recycle Gas Blower'}</h4>
            <span className="text-[10px] text-slate-500 font-mono">Process Gas Loop</span>
          </div>

          <div
            className={`mt-3 pt-2 border-t text-[11px] font-mono ${
              isVibTrip
                ? 'border-red-200 text-red-800 font-bold'
                : 'border-slate-200 text-slate-600'
            }`}
          >
            <div>Overall Vib: {vibration.toFixed(2)} mm/s</div>
            <div className="text-[10px] font-normal text-slate-500">Trip Interlock: ≥ 11.0</div>
          </div>
        </div>

        {/* Component 5: Non-Drive End (NDE) Bearing */}
        <div className="rounded-sm border border-slate-200 bg-slate-50 p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-[10px] font-bold text-slate-400 uppercase">Stage 05</span>
              <span className="rounded-sm bg-blue-50 border border-blue-200 px-1.5 py-0.2 font-mono text-[9px] font-bold text-primary">
                NOMINAL
              </span>
            </div>
            <h4 className="text-xs font-bold text-slate-900">NDE Sleeve Bearing</h4>
            <span className="text-[10px] text-slate-500 font-mono">Outboard Support</span>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-200 text-[11px] font-mono text-slate-600">
            <div>NDE Temp: {(bearingTemp * 0.62).toFixed(1)} °C</div>
            <div>Axial Float: Nominal</div>
          </div>
        </div>
      </div>

      {/* Technical Summary Strip */}
      <div className="rounded-sm bg-slate-50 border border-slate-200 p-3 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Zap size={15} className="text-primary shrink-0" />
          <span>
            <strong className="text-slate-900 font-semibold">Physical Mechanical Chain: </strong>
            {isCouplingTrip
              ? `Radial offset on Stage 02 disc coupling (${couplingOffset} mm) creates angular moment ➔ generates 2X rotational harmonic pulse (${harmonic2X} mm/s) ➔ transmits friction thermal load to Stage 03 DE bearing (${bearingTemp}°C).`
              : `Machinery train operating nominal with overall vibration at ${vibration} mm/s and bearing temperature at ${bearingTemp}°C.`}
          </span>
        </div>
        <span className="font-mono text-[11px] text-slate-500 shrink-0">ISO 10816-3 Class II/IV</span>
      </div>
    </div>
  )
}

export default EquipmentTrainSchematic
