import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Activity, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react'

export interface MonitoredEquipmentItem {
  equipmentId: string
  equipmentName: string
  plant?: string
  location?: string
  equipmentType?: string
  condition: 'ATTENTION' | 'NORMAL' | 'WARNING' | 'TRIP' | 'DATA NOT AVAILABLE'
  primarySignal: string
  primarySignalValue?: string | number | null
  primarySignalUnit?: string
  trendStatus: 'INCREASING' | 'STABLE' | 'DECREASING' | 'DATA NOT AVAILABLE'
  investigationStatus: 'REQUIRED' | 'MONITORING' | 'IN_PROGRESS' | 'DATA NOT AVAILABLE'
}

export interface EquipmentCardProps {
  equipment: MonitoredEquipmentItem
  isSelected?: boolean
  onSelect?: (id: string) => void
}

export const EquipmentCard: React.FC<EquipmentCardProps> = ({
  equipment,
  isSelected = false,
  onSelect,
}) => {
  const isAttention =
    equipment.condition === 'ATTENTION' ||
    equipment.condition === 'TRIP' ||
    equipment.condition === 'WARNING'

  const conditionBadgeColor = isAttention
    ? 'bg-red-50 text-red-700 border-red-200'
    : equipment.condition === 'NORMAL'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-slate-100 text-slate-600 border-slate-200'

  const trendBadgeColor =
    equipment.trendStatus === 'INCREASING'
      ? 'text-red-700 bg-red-50 border-red-200'
      : equipment.trendStatus === 'STABLE'
      ? 'text-slate-600 bg-slate-50 border-slate-200'
      : 'text-slate-500 bg-slate-50 border-slate-200'

  const investigationBadgeColor =
    equipment.investigationStatus === 'REQUIRED'
      ? 'text-primary bg-blue-50 border-blue-200 font-bold'
      : 'text-slate-600 bg-slate-50 border-slate-200'

  return (
    <div
      onClick={() => onSelect?.(equipment.equipmentId)}
      className={`group relative rounded-sm border transition-all cursor-pointer p-4 bg-white shadow-xs ${
        isSelected
          ? 'border-primary ring-2 ring-primary/10 shadow-sm'
          : 'border-slate-200 hover:border-primary/50 hover:shadow-xs'
      }`}
    >
      {/* Header: Tag + Condition */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-slate-900 tracking-wider">
              {equipment.equipmentId}
            </span>
            {equipment.location && (
              <span className="font-mono text-[10px] text-slate-400">
                [{equipment.location}]
              </span>
            )}
          </div>
          <h4 className="text-xs font-semibold text-slate-700 mt-0.5 truncate max-w-[200px]" title={equipment.equipmentName}>
            {equipment.equipmentName}
          </h4>
        </div>

        <span
          className={`rounded-sm border px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider ${conditionBadgeColor}`}
        >
          {equipment.condition}
        </span>
      </div>

      {/* Grid of 3 key parameters */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-left">
        {/* Primary Signal */}
        <div className="rounded-sm bg-slate-50 p-2 border border-slate-100">
          <span className="block text-[10px] font-mono text-slate-400 uppercase font-medium">
            Primary Signal
          </span>
          <span className="mt-1 block text-xs font-bold text-slate-800 truncate" title={equipment.primarySignal}>
            {equipment.primarySignal}
          </span>
          <span className="mt-0.5 block font-mono text-[11px] font-semibold text-primary">
            {equipment.primarySignalValue != null && equipment.primarySignalValue !== ''
              ? `${equipment.primarySignalValue} ${equipment.primarySignalUnit || ''}`
              : 'DATA NOT AVAILABLE'}
          </span>
        </div>

        {/* Trend */}
        <div className="rounded-sm bg-slate-50 p-2 border border-slate-100">
          <span className="block text-[10px] font-mono text-slate-400 uppercase font-medium">
            Trend
          </span>
          <div className="mt-1 flex items-center gap-1">
            <span className={`inline-block rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-bold ${trendBadgeColor}`}>
              {equipment.trendStatus}
            </span>
          </div>
        </div>

        {/* Investigation */}
        <div className="rounded-sm bg-slate-50 p-2 border border-slate-100">
          <span className="block text-[10px] font-mono text-slate-400 uppercase font-medium">
            Investigation
          </span>
          <div className="mt-1 flex items-center gap-1">
            <span className={`inline-block rounded-sm border px-1.5 py-0.5 font-mono text-[10px] ${investigationBadgeColor}`}>
              {equipment.investigationStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Card Footer: Action */}
      <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs">
        <span className="text-[11px] text-slate-400 font-mono">
          {isSelected ? 'Active Selection' : 'Click to inspect trend'}
        </span>

        <Link
          to={`/equipment/${equipment.equipmentId}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 font-mono text-xs font-bold text-primary hover:text-blue-800 transition-colors"
        >
          <span>INVESTIGATE</span>
          <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  )
}

export default EquipmentCard
