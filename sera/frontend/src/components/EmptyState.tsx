import React from 'react'
import { AlertTriangle, RefreshCw, Layers } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

export const EmptyState: React.FC<{
  title?: string
  description?: string
  action?: React.ReactNode
  icon?: React.ReactNode
}> = ({ title, description, action, icon }) => {
  const { t } = useLanguage()

  return (
    <div className="flex flex-col items-center justify-center rounded-sm border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-primary mb-3">
        {icon || <Layers size={22} />}
      </div>
      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
        {title || t('emptyTitle')}
      </h3>
      <p className="mt-1 max-w-sm text-xs text-slate-500 leading-relaxed font-medium">
        {description || t('emptyDesc')}
      </p>
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
    <div className="flex flex-col items-center justify-center rounded-sm border border-red-200 bg-red-50/40 p-8 text-center shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-3">
        <AlertTriangle size={22} />
      </div>
      <h3 className="text-sm font-bold text-red-700 uppercase tracking-wide">
        {title || t('errorTitle')}
      </h3>
      <p className="mt-1 max-w-md text-xs text-slate-700 leading-relaxed font-mono">
        {message || t('errorDesc')}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 flex items-center gap-1.5 rounded-sm bg-primary hover:bg-primary-hover px-4 py-2 text-xs font-semibold text-white transition-all shadow-sm"
        >
          <RefreshCw size={13} />
          <span>{t('btnRetry')}</span>
        </button>
      )}
    </div>
  )
}

export const LoadingState: React.FC<{ message?: string }> = ({ message }) => {
  const { t } = useLanguage()

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-primary mb-3" />
      <span className="text-xs font-mono text-slate-500 tracking-wider">
        {message || t('loadingText')}
      </span>
    </div>
  )
}

export default EmptyState
