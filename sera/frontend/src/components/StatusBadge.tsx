import React from 'react'
import { CheckCircle2, AlertTriangle, AlertOctagon, XCircle, HelpCircle, ShieldCheck } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

export interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
}) => {
  const { t } = useLanguage()
  const s = (status || '').toUpperCase()

  let colorStyles = 'bg-slate-100 text-slate-700 border-slate-200'
  let Icon = HelpCircle
  let label = s || 'UNKNOWN'

  if (s === 'NORMAL' || s === 'HEALTHY' || s === 'GOOD' || s === 'VERIFIED' || s === 'VERIFIED_RECOVERED') {
    colorStyles = 'bg-blue-50 text-blue-700 border-blue-200 font-semibold'
    Icon = s.includes('VERIFIED') ? ShieldCheck : CheckCircle2
    label = s.includes('VERIFIED') ? t('statusVerified') : t('statusNormal')
  } else if (s === 'WARNING') {
    colorStyles = 'bg-amber-50 text-amber-700 border-amber-200 font-semibold'
    Icon = AlertTriangle
    label = t('statusWarning')
  } else if (s === 'ALARM') {
    colorStyles = 'bg-amber-100 text-amber-800 border-amber-300 font-bold'
    Icon = AlertTriangle
    label = t('statusAlarm')
  } else if (s === 'CRITICAL') {
    colorStyles = 'bg-red-50 text-red-700 border-red-300 font-bold animate-pulse'
    Icon = AlertOctagon
    label = t('statusCritical')
  } else if (s === 'TRIP' || s === 'FAILURE') {
    colorStyles = 'bg-red-100 text-red-800 border-red-400 font-bold animate-pulse'
    Icon = XCircle
    label = t('statusTrip')
  } else if (s === 'ACCEPTED') {
    colorStyles = 'bg-blue-50 text-primary border-blue-200 font-semibold'
    Icon = CheckCircle2
    label = t('statusAccepted')
  } else if (s === 'PENDING') {
    colorStyles = 'bg-slate-100 text-slate-700 border-slate-200'
    Icon = HelpCircle
    label = t('statusPending')
  } else if (s === 'MODIFIED') {
    colorStyles = 'bg-amber-50 text-amber-700 border-amber-200'
    Icon = AlertTriangle
    label = t('statusModified')
  } else if (s === 'REJECTED') {
    colorStyles = 'bg-red-50 text-red-700 border-red-200'
    Icon = XCircle
    label = t('statusRejected')
  }

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2',
  }[size]

  return (
    <span
      className={`inline-flex items-center rounded-full border font-mono tracking-wider transition-all duration-150 ${sizeStyles} ${colorStyles}`}
    >
      {showIcon && <Icon size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} className="shrink-0" />}
      <span>{label}</span>
    </span>
  )
}

export default StatusBadge
