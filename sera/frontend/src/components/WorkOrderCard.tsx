import React, { useState, useEffect } from 'react'
import {
  Wrench,
  CheckSquare,
  Square,
  ShieldCheck,
  Clock,
  UserCheck,
  FileText,
  AlertTriangle,
  Layers,
  Sparkles,
} from 'lucide-react'

export interface WorkOrderItem {
  step: number
  task: string
  spec: string
  responsible: string
  done: boolean
}

export interface WorkOrderCardProps {
  equipmentId?: string
  equipmentName?: string
  workOrderNo?: string
  notificationNo?: string
  correctiveAction?: string
  preventiveAction?: string
  priority?: 'P1 - Emergency' | 'P2 - High' | 'P3 - Medium'
  downtimeHours?: number
  onStepToggle?: (stepIndex: number) => void
}

export const WorkOrderCard: React.FC<WorkOrderCardProps> = ({
  equipmentId = 'Asset',
  equipmentName = 'Plant Equipment',
  workOrderNo,
  notificationNo,
  correctiveAction,
  preventiveAction,
  priority,
  downtimeHours = 4.0,
}) => {
  const dynamicWorkOrderNo = workOrderNo || `WO-2026-${equipmentId.replace(/[^0-9]/g, '') || '0101'}`
  const dynamicNotifNo = notificationNo || `NOTIF-${equipmentId}-01`
  const dynamicPriority = priority || 'P1 - Emergency'

  // Parse steps from corrective action if available
  const parsedSteps: WorkOrderItem[] = React.useMemo(() => {
    if (correctiveAction) {
      const lines = correctiveAction.split('\n').filter((l) => l.trim().length > 0)
      if (lines.length >= 2) {
        return lines.map((line, idx) => {
          const cleanText = line.replace(/^\d+[\.\)]\s*/, '').trim()
          return {
            step: idx + 1,
            task: cleanText,
            spec: idx === 0
              ? `PTW #LOTO-${equipmentId} / Gas Safety Clearance`
              : idx === 1
              ? `Component inspection & tolerance check (< 0.05 mm)`
              : `Torque & ISO 10816-3 Baseline Verification`,
            responsible: idx === 0 ? 'Electrical / Ops' : idx === 1 ? 'Mechanical Tech' : 'Reliability Lead',
            done: idx === 0,
          }
        })
      }
    }

    return [
      {
        step: 1,
        task: `Isolate ${equipmentId} motor breaker, apply Lockout/Tagout (LOTO), and verify zero energy state.`,
        spec: `PTW #LOTO-2026-${equipmentId}-HOT / Gas Test CO < 25 ppm`,
        responsible: 'Electrical / Ops',
        done: true,
      },
      {
        step: 2,
        task: 'Disassemble flexible coupling guard; inspect polyurethane elastomer spider element for shear or heat cracking.',
        spec: `P/N EL-${equipmentId}-FLEX (Polyurethane 98 ShA)`,
        responsible: 'Mechanical Tech',
        done: true,
      },
      {
        step: 3,
        task: 'Mount dual laser alignment sensors (Easy-Laser XT770); measure radial offset and angular deflection.',
        spec: 'Radial Offset: < 0.050 mm / Angular: < 0.04 mm/100mm',
        responsible: 'Reliability Lead',
        done: false,
      },
      {
        step: 4,
        task: 'Correct soft-foot on motor inboard & outboard feet using Grade 304 SS precision shims.',
        spec: 'Torque bolts to 420 Nm ± 10 Nm in cross pattern',
        responsible: 'Mechanical Tech',
        done: false,
      },
      {
        step: 5,
        task: 'Re-install coupling guard, clear LOTO permit, perform bump test, and record baseline ISO 10816-3 vibration spectrum.',
        spec: 'Overall Vib Target < 3.8 mm/s / 2X Harmonic < 1.0 mm/s',
        responsible: 'Reliability Lead',
        done: false,
      },
    ]
  }, [correctiveAction, equipmentId])

  const [steps, setSteps] = useState<WorkOrderItem[]>(parsedSteps)

  useEffect(() => {
    setSteps(parsedSteps)
  }, [parsedSteps])

  const toggleStep = (index: number) => {
    setSteps((prev) =>
      prev.map((s, idx) => (idx === index ? { ...s, done: !s.done } : s))
    )
  }

  const completedCount = steps.filter((s) => s.done).length

  return (
    <div className="rounded-sm border border-slate-200 bg-white p-5 sm:p-6 shadow-xs font-sans space-y-5">
      {/* Top Banner: Enterprise Work Order Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-sm bg-blue-50 border border-blue-200 px-2 py-0.5 font-mono text-[11px] font-bold text-primary">
              SAP PM01 WORK ORDER
            </span>
            <span className="font-mono text-sm font-bold text-slate-900">
              #{workOrderNo}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Functional Location: <strong className="font-mono text-slate-700">FL-PLANT05-BLW-5702</strong> • Notif: <span className="font-mono">{notificationNo}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-sm bg-red-600 px-2.5 py-1 text-xs font-mono font-bold text-white shadow-xs">
            {priority}
          </span>
          <span className="rounded-sm bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-mono text-slate-700">
            Est. Outage: <strong className="text-slate-900">{downtimeHours} Hours</strong>
          </span>
        </div>
      </div>

      {/* Grid: Work Order Scope & Safety Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 1: Equipment Details */}
        <div className="rounded-sm border border-slate-200 bg-slate-50 p-4 text-xs space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Target Machine
          </span>
          <div className="font-mono font-bold text-slate-900 text-sm">
            {equipmentId}
          </div>
          <div className="text-slate-600 font-medium">{equipmentName}</div>
          <div className="text-[11px] text-slate-500 font-mono pt-1 border-t border-slate-200">
            Service: Synthesis Gas Circulation (350 kW / 6kV)
          </div>
        </div>

        {/* Card 2: Required Tooling & Materials */}
        <div className="rounded-sm border border-slate-200 bg-slate-50 p-4 text-xs space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Required Tools & Spare Parts
          </span>
          <ul className="space-y-1 font-mono text-[11px] text-slate-700">
            <li>• Laser Alignment Kit (Easy-Laser XT770)</li>
            <li>• Pre-cut SS304 Shims (0.05 - 0.20 mm)</li>
            <li>• Flexible Spider Element (P/N EL-5702-FLEX)</li>
            <li>• Calibrated Torque Wrench (100–500 Nm)</li>
          </ul>
        </div>

        {/* Card 3: Safety & Permits */}
        <div className="rounded-sm border border-slate-200 bg-slate-50 p-4 text-xs space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Permit To Work & Isolation
          </span>
          <div className="flex items-center gap-1.5 text-red-700 font-mono font-bold">
            <ShieldCheck size={14} />
            <span>LOTO-HOT-5702 Required</span>
          </div>
          <div className="text-slate-600 text-[11px]">
            Toxic Gas Clearance (CO / H2) signed by Shift Supervisor before coupling shield removal.
          </div>
        </div>
      </div>

      {/* Step-by-Step Execution Protocol */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <Wrench size={15} className="text-primary" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Maintenance Execution Protocol & Verification Checklist
            </h4>
          </div>
          <span className="font-mono text-xs text-slate-600">
            Progress: <strong className="text-primary">{completedCount} / {steps.length}</strong> Completed
          </span>
        </div>

        <div className="space-y-2">
          {steps.map((step, idx) => (
            <div
              key={step.step}
              onClick={() => toggleStep(idx)}
              className={`flex cursor-pointer items-start gap-3 rounded-sm border p-3.5 transition-all ${
                step.done
                  ? 'border-emerald-200 bg-emerald-50/40 text-slate-700'
                  : 'border-slate-200 bg-white hover:border-primary hover:bg-blue-50/20'
              }`}
            >
              <div className="mt-0.5 text-primary shrink-0">
                {step.done ? (
                  <CheckSquare size={16} className="text-emerald-600" />
                ) : (
                  <Square size={16} className="text-slate-400" />
                )}
              </div>

              <div className="flex-1 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className={`font-semibold ${step.done ? 'text-slate-900 line-through' : 'text-slate-900'}`}>
                    Step {step.step}: {step.task}
                  </span>
                  <span className="font-mono text-[10px] text-slate-500 rounded-xs bg-slate-100 px-2 py-0.5 self-start sm:self-auto shrink-0">
                    {step.responsible}
                  </span>
                </div>
                <div className="mt-1 font-mono text-[11px] text-slate-500">
                  Tolerance / Spec: {step.spec}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Preventive Recurrence Controls */}
      <div className="rounded-sm border border-blue-200 bg-blue-50/40 p-4 space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-primary" />
          <h4 className="font-bold text-primary uppercase tracking-wider">
            Preventive Maintenance Strategy & Recurrence Prevention
          </h4>
        </div>
        <p className="text-slate-700 leading-relaxed font-mono">
          {preventiveAction ||
            '1. Establish quarterly laser alignment inspection schedule on SAP PM plan PM-QTR-BLW.\n2. Add automated 2X harmonic vibration derivative alerts in SERA rule engine.\n3. Track coupling element fatigue lifecycle threshold at 18,000 continuous run hours.'}
        </p>
      </div>

      {/* Official Sign-Off Footer */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200 text-xs font-mono text-slate-600">
        <div className="rounded-sm bg-slate-50 border border-slate-200 p-2.5">
          <span className="text-[10px] text-slate-400 block uppercase">Work Order Planner</span>
          <span className="font-bold text-slate-900">SERA Automated Reliability Engine</span>
        </div>
        <div className="rounded-sm bg-slate-50 border border-slate-200 p-2.5">
          <span className="text-[10px] text-slate-400 block uppercase">Lead Reliability Engineer</span>
          <span className="font-bold text-primary">Authorized (H. Pratama - PE 48102)</span>
        </div>
        <div className="rounded-sm bg-slate-50 border border-slate-200 p-2.5">
          <span className="text-[10px] text-slate-400 block uppercase">Execution Status</span>
          <span className="font-bold text-emerald-700">RELEASED FOR FIELD WORK</span>
        </div>
      </div>
    </div>
  )
}

export default WorkOrderCard
