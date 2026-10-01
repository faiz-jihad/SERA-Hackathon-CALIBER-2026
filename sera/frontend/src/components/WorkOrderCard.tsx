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
  ArrowRight,
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
  reviewStatus?: string
  reviewedBy?: string
  onStepToggle?: (stepIndex: number) => void
}

export const WorkOrderCard: React.FC<WorkOrderCardProps> = ({
  equipmentId = 'BL-5702',
  equipmentName = 'Product Blower BL-5702',
  workOrderNo,
  notificationNo,
  correctiveAction,
  preventiveAction,
  priority = 'P1 - Emergency',
  downtimeHours = 14.0,
  reviewStatus = 'PENDING',
  reviewedBy,
}) => {
  const dynamicWorkOrderNo = workOrderNo || `WO-2026-${equipmentId.replace(/[^0-9]/g, '') || '5702'}`
  const dynamicNotifNo = notificationNo || `NOTIF-${equipmentId}-01`

  // Parse steps from corrective action if available
  const parsedSteps: WorkOrderItem[] = React.useMemo(() => {
    if (correctiveAction) {
      const lines = correctiveAction.split('\n').filter((l) => l.trim().length > 0)
      if (lines.length >= 2) {
        return lines.map((line, idx) => {
          const cleanText = line.replace(/^\d+[\.\)]\s*/, '').trim()
          // Extract PIC if present
          const picMatch = cleanText.match(/\(PIC:\s*([^)]+)\)/i)
          const pic = picMatch ? picMatch[1] : (idx === 0 || idx === 1 ? 'ROT-01 (Mechanical)' : 'REL-05 (Reliability)')
          const taskOnly = cleanText.replace(/\(PIC:[^)]+\)/i, '').trim()

          return {
            step: idx + 1,
            task: taskOnly,
            spec: idx === 0
              ? 'OEM genuine spider insert — zero fatigue cracks'
              : idx === 1
              ? 'Soft-foot tolerance < 0.05 mm (feeler gauge check)'
              : idx === 2
              ? 'Radial & angular shaft offset < 0.050 mm'
              : 'Continuous operation at 38 T/H load — vibration < 3.8 mm/s',
            responsible: pic,
            done: reviewStatus === 'ACCEPTED' ? idx < 2 : false,
          }
        })
      }
    }

    return [
      {
        step: 1,
        task: `Isolate ${equipmentId} motor breaker and verify zero energy state under LOTO protocol.`,
        spec: `LOTO Electrical Isolation Clearance on Feeder Breaker`,
        responsible: 'ROT-01 (Electrical/Ops)',
        done: reviewStatus === 'ACCEPTED',
      },
      {
        step: 2,
        task: 'Remove flexible coupling guard; replace cracked/aged elastomer spider insert with genuine OEM insert.',
        spec: 'OEM genuine spider element — inspect jaws for fretting wear',
        responsible: 'ROT-01 (Mechanical)',
        done: reviewStatus === 'ACCEPTED',
      },
      {
        step: 3,
        task: 'Check motor baseplate soft-foot condition using feeler gauge; re-shim with 304SS shims to < 0.05 mm.',
        spec: 'Soft-foot deflection < 0.05 mm on all 4 mounting feet',
        responsible: 'ROT-01 (Mechanical)',
        done: false,
      },
      {
        step: 4,
        task: 'Perform precision laser shaft alignment between motor and blower to within ±0.050 mm tolerance.',
        spec: 'Radial offset < 0.050 mm / Angular offset < 0.040 mm/100mm',
        responsible: 'ROT-01 (Mechanical)',
        done: false,
      },
      {
        step: 5,
        task: 'Re-install coupling guard, clear LOTO, restart blower, and confirm post-repair vibration baseline at 38 T/H load.',
        spec: 'Vibration < 4.5 mm/s (ISO 10816-3 Zone A/B)',
        responsible: 'REL-05 (Reliability)',
        done: false,
      },
    ]
  }, [correctiveAction, equipmentId, reviewStatus])

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

  // Execution status styling based on authorization status
  const isAccepted = reviewStatus === 'ACCEPTED'
  const isRejected = reviewStatus === 'REJECTED'
  const isModified = reviewStatus === 'MODIFIED'

  return (
    <div className="rounded-sm border border-slate-200 bg-white p-5 sm:p-6 shadow-xs font-sans space-y-5">
      {/* Top Banner: Enterprise Work Order Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-sm bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-bold text-white tracking-wider">
              {isAccepted ? 'SAP PM01 WORK ORDER' : 'PROPOSED MAINTENANCE SCOPE'}
            </span>
            <span className="font-mono text-sm font-bold text-slate-900">
              #{dynamicWorkOrderNo}
            </span>
            <span className={`border px-2 py-0.5 font-mono text-[10px] font-bold rounded-sm ${
              isAccepted
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                : isRejected
                ? 'border-red-300 bg-red-50 text-red-800'
                : isModified
                ? 'border-amber-300 bg-amber-50 text-amber-800'
                : 'border-slate-300 bg-slate-100 text-slate-700'
            }`}>
              {isAccepted ? 'RELEASED FOR EXECUTION' : isRejected ? 'REJECTED' : isModified ? 'APPROVED WITH MODIFICATIONS' : 'DRAFT PROPOSAL — PENDING APPROVAL'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            Plant Section: <strong className="text-slate-800">Orion Polypropylene Plant (OPP) — Powder Handling</strong> · Notif: {dynamicNotifNo}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-sm bg-red-700 px-2.5 py-1 text-xs font-mono font-bold text-white">
            {priority}
          </span>
          <span className="rounded-sm bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-mono text-slate-700">
            Downtime Window: <strong className="text-slate-900">{downtimeHours}h</strong>
          </span>
        </div>
      </div>

      {/* Grid: Machinery Info & Technical Scope */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 1: Equipment Details */}
        <div className="rounded-sm border border-slate-200 bg-slate-50 p-4 text-xs space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
            Target Asset
          </span>
          <div className="font-mono font-bold text-slate-900 text-sm">
            {equipmentId}
          </div>
          <div className="text-slate-700 font-medium">{equipmentName}</div>
          <div className="text-[11px] text-slate-500 font-mono pt-1.5 border-t border-slate-200">
            Operating Duty: 38 T/H PP Powder · Class A Critical
          </div>
        </div>

        {/* Card 2: Required Tools & Materials */}
        <div className="rounded-sm border border-slate-200 bg-slate-50 p-4 text-xs space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
            Required Tools & Spare Parts
          </span>
          <ul className="space-y-1 font-mono text-[11px] text-slate-700">
            <li>• Precision Dial/Laser Shaft Alignment System</li>
            <li>• Pre-cut Grade 304 SS Shims (0.05 – 0.20 mm)</li>
            <li>• Genuine OEM Flexible Spider Coupling Element</li>
            <li>• Calibrated Torque Wrench (Motor Foot Bolts)</li>
          </ul>
        </div>

        {/* Card 3: Safety & Permits */}
        <div className="rounded-sm border border-slate-200 bg-slate-50 p-4 text-xs space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
            Safety Clearance & Work Permit
          </span>
          <div className="flex items-center gap-1.5 text-slate-800 font-mono font-bold">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>Electrical LOTO Clearance</span>
          </div>
          <div className="text-slate-600 text-[11px] leading-relaxed">
            Motor breaker tagged out and zero-energy confirmed before coupling guard removal.
          </div>
        </div>
      </div>

      {/* Step-by-Step Corrective Action Protocol */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <Wrench size={15} className="text-slate-700" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Tindakan Korektif (Corrective Action Steps)
            </h4>
          </div>
          <span className="font-mono text-xs text-slate-600">
            Checklist: <strong className="text-slate-900">{completedCount} / {steps.length}</strong> Completed
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
                  : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50/50'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {step.done ? (
                  <CheckSquare size={16} className="text-emerald-700" />
                ) : (
                  <Square size={16} className="text-slate-400" />
                )}
              </div>

              <div className="flex-1 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className={`font-semibold ${step.done ? 'text-slate-600 line-through' : 'text-slate-900'}`}>
                    Langkah {step.step}: {step.task}
                  </span>
                  <span className="font-mono text-[10px] text-slate-600 rounded-xs bg-slate-100 border border-slate-200 px-2 py-0.5 self-start sm:self-auto shrink-0 font-bold">
                    PIC: {step.responsible}
                  </span>
                </div>
                <div className="mt-1 font-mono text-[11px] text-slate-500">
                  Target / Spesifikasi: {step.spec}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Preventive Maintenance Strategy (PAA - Preventive Action) */}
      <div className="rounded-sm border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-slate-700" />
          <h4 className="font-bold text-slate-900 uppercase tracking-wider">
            Tindakan Pencegahan Kekambuhan (Preventive Action Plan / PAA)
          </h4>
        </div>
        <div className="text-slate-700 leading-relaxed font-mono whitespace-pre-line text-[11px] bg-white p-3 border border-slate-200 rounded-sm">
          {preventiveAction ||
            '1. Add 6-monthly periodic laser alignment & soft-foot check to BL-5702 routine PM (PM-1, PIC: ROT-01).\n2. Establish plant-wide coupling element register and mandate replacement every 12 months (PM-2, PIC: REL-05).\n3. Shorten BL-5702 vibration monitoring route from monthly to weekly (PM-3, PIC: REL-05).\n4. Pro-Active Action: Roll out alignment check to all Class-A blowers in Orion Polypropylene Plant (OPP) by 18-Aug-2026.'}
        </div>
      </div>

      {/* Official Sign-Off & Authorization Footer */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200 text-xs font-mono text-slate-600">
        <div className="rounded-sm bg-slate-50 border border-slate-200 p-2.5">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">Generated Source</span>
          <span className="font-bold text-slate-900">SERA Reliability Recommendation Engine</span>
        </div>
        <div className="rounded-sm bg-slate-50 border border-slate-200 p-2.5">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">Authorized By</span>
          <span className={`font-bold ${isAccepted ? 'text-emerald-700' : isRejected ? 'text-red-700' : 'text-slate-700'}`}>
            {isAccepted
              ? (reviewedBy || 'Lead Reliability Engineer')
              : isRejected
              ? 'Rejected by Lead Engineer'
              : 'Pending Lead Engineer Sign-Off'}
          </span>
        </div>
        <div className="rounded-sm bg-slate-50 border border-slate-200 p-2.5">
          <span className="text-[10px] text-slate-400 block uppercase font-bold">Work Order Status</span>
          <span className={`font-bold ${
            isAccepted ? 'text-emerald-700' : isRejected ? 'text-red-700' : isModified ? 'text-amber-700' : 'text-slate-500'
          }`}>
            {isAccepted
              ? 'RELEASED FOR EXECUTION (PM01)'
              : isRejected
              ? 'CANCELLED / NOT ISSUED'
              : isModified
              ? 'APPROVED WITH AMENDMENTS'
              : 'AWAITING AUTHORIZATION'}
          </span>
        </div>
      </div>
    </div>
  )
}

export default WorkOrderCard
