import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

export const EmptyState: React.FC<{
  title?: string
  description?: string
  action?: React.ReactNode
}> = ({ title, description, action }) => {
  const { t } = useLanguage()
  return (
    <div className="flex flex-col items-center justify-center border border-slate-200 bg-white py-10 px-6 text-center rounded-sm">
      <p className="font-mono text-xs text-slate-400 uppercase tracking-wider">
        {title || t('emptyTitle')}
      </p>
      {description && (
        <p className="mt-1 text-[11px] text-slate-400 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export const ErrorState: React.FC<{
  title?: string
  message?: string
  onRetry?: () => void
}> = ({ title, message, onRetry }) => {
  const { t } = useLanguage()
  return (
    <div className="border border-red-200 bg-red-50 rounded-sm px-5 py-6 text-center">
      <div className="flex items-center justify-center gap-2 mb-2">
        <AlertTriangle size={14} className="text-red-600" />
        <span className="font-mono text-xs font-bold text-red-700 uppercase">
          {title || t('errorTitle')}
        </span>
      </div>
      <p className="text-xs text-slate-700 font-mono max-w-md mx-auto">
        {message || t('errorDesc')}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 flex items-center gap-1.5 mx-auto border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-sm"
        >
          <RefreshCw size={12} />
          <span>{t('btnRetry')}</span>
        </button>
      )}
    </div>
  )
}

export const LoadingState: React.FC<{ message?: string }> = ({ message }) => {
  const { t } = useLanguage()
  return (
    <div className="flex items-center gap-2 px-4 py-6 text-slate-400">
      <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500 flex-shrink-0" />
      <span className="font-mono text-xs tracking-wider">
        {message || t('loadingText')}
      </span>
    </div>
  )
}

export default EmptyState
