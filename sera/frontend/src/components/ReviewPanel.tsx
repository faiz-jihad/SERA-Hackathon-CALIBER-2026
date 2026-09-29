import React, { useState, useEffect } from 'react'
import { CheckCircle2, Edit3, XCircle, Send, ShieldAlert, UserCheck, Wrench, Shield } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import StatusBadge from './StatusBadge'

export interface ReviewPanelProps {
  recommendationId: string
  equipmentId: string
  problemSummary?: string
  currentStatus?: string
  initialNotes?: string
  initialReviewer?: string
  initialAction?: string
  onReviewSubmitted?: (result: any) => void
  onSubmitReview: (data: {
    review_status: 'ACCEPTED' | 'MODIFIED' | 'REJECTED'
    engineer_notes: string
    reviewed_by: string
    final_action?: string
  }) => Promise<any>
}

export const ReviewPanel: React.FC<ReviewPanelProps> = ({
  recommendationId,
  equipmentId,
  problemSummary,
  currentStatus = 'PENDING',
  initialNotes = '',
  initialReviewer,
  initialAction = 'Execute precision laser alignment protocol and replace flexible coupling insert.',
  onReviewSubmitted,
  onSubmitReview,
}) => {
  const { t } = useLanguage()
  const { user, hasPermission } = useAuth()

  const defaultReviewer = initialReviewer || (user ? `${user.name} (${user.roleTitle})` : 'Lead Reliability Engineer')

  const [decision, setDecision] = useState<'ACCEPTED' | 'MODIFIED' | 'REJECTED'>('ACCEPTED')
  const [engineerNotes, setEngineerNotes] = useState(initialNotes)
  const [reviewedBy, setReviewedBy] = useState(defaultReviewer)
  const [finalAction, setFinalAction] = useState(initialAction)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    if (user && !initialReviewer) {
      setReviewedBy(`${user.name} (${user.roleTitle})`)
    }
  }, [user, initialReviewer])

  const canApprove = hasPermission('canApproveRecommendations')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (!canApprove) {
      setErrorMsg(t('unauthorizedWarning'))
      return
    }

    if (decision === 'REJECTED' && !engineerNotes.trim()) {
      setErrorMsg(t('rejectionReasonRequired'))
      return
    }

    setSubmitting(true)
    try {
      const res = await onSubmitReview({
        review_status: decision,
        engineer_notes: engineerNotes,
        reviewed_by: reviewedBy,
        final_action: decision === 'REJECTED' ? 'REJECTED_NO_WORK_ORDER' : finalAction,
      })
      setSuccessMsg(t('decisionAcceptedSuccess'))
      if (onReviewSubmitted) {
        onReviewSubmitted(res)
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-sm border border-slate-200 bg-white p-5 sm:p-6 shadow-xs font-sans">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-3.5 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck size={18} className="text-primary" />
            <h3 className="text-sm font-bold tracking-tight text-slate-900 uppercase">
              {t('reviewBoxTitle')}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{t('reviewBoxSubtitle')}</p>
        </div>
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <span className="text-xs text-slate-500 font-mono">Current Status:</span>
          <StatusBadge status={currentStatus} size="sm" />
        </div>
      </div>

      {!canApprove && (
        <div className="mb-4 rounded-sm bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex items-start gap-2">
          <Shield size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">RBAC View Mode: </strong>
            You are signed in as <span className="font-semibold text-slate-900">{user?.roleTitle}</span>. Official sign-off requires switching to the <strong className="text-primary">Lead Reliability Engineer</strong> persona.
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Decision Selection Tabs */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
            {t('reviewStatusLabel')} <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setDecision('ACCEPTED')}
              className={`flex items-center justify-center gap-2 rounded-sm border p-2.5 text-xs font-bold tracking-wide transition-all ${
                decision === 'ACCEPTED'
                  ? 'border-blue-500 bg-blue-50 text-primary ring-2 ring-blue-200 shadow-xs'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <CheckCircle2 size={15} className={decision === 'ACCEPTED' ? 'text-primary' : 'text-slate-400'} />
              <span>{t('statusAccepted')}</span>
            </button>

            <button
              type="button"
              onClick={() => setDecision('MODIFIED')}
              className={`flex items-center justify-center gap-2 rounded-sm border p-2.5 text-xs font-bold tracking-wide transition-all ${
                decision === 'MODIFIED'
                  ? 'border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-200 shadow-xs'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Edit3 size={15} className={decision === 'MODIFIED' ? 'text-amber-600' : 'text-slate-400'} />
              <span>{t('statusModified')}</span>
            </button>

            <button
              type="button"
              onClick={() => setDecision('REJECTED')}
              className={`flex items-center justify-center gap-2 rounded-sm border p-2.5 text-xs font-bold tracking-wide transition-all ${
                decision === 'REJECTED'
                  ? 'border-red-500 bg-red-50 text-red-700 ring-2 ring-red-200 shadow-xs'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <XCircle size={15} className={decision === 'REJECTED' ? 'text-red-600' : 'text-slate-400'} />
              <span>{t('statusRejected')}</span>
            </button>
          </div>
        </div>

        {/* Work Order Scope (Shown when ACCEPTED or MODIFIED) */}
        {decision !== 'REJECTED' && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Wrench size={13} className="text-primary" />
              <span>{t('finalActionLabel')}</span>
            </label>
            <input
              type="text"
              value={finalAction}
              onChange={(e) => setFinalAction(e.target.value)}
              placeholder={t('finalActionPlaceholder')}
              className="w-full rounded-sm border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-mono text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </div>
        )}

        {/* Reviewer Name and Engineering Notes */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              {t('reviewedByLabel')}
            </label>
            <input
              type="text"
              value={reviewedBy}
              onChange={(e) => setReviewedBy(e.target.value)}
              className="w-full rounded-sm border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              {t('reviewNotesLabel')} {decision === 'REJECTED' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              rows={2}
              value={engineerNotes}
              onChange={(e) => setEngineerNotes(e.target.value)}
              placeholder={t('reviewNotesPlaceholder')}
              className="w-full rounded-sm border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              required={decision === 'REJECTED'}
            />
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 rounded-sm bg-red-50 border border-red-200 p-3 text-xs text-red-700 font-medium">
            <ShieldAlert size={15} className="shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 rounded-sm bg-blue-50 border border-blue-200 p-3 text-xs text-primary font-medium">
            <CheckCircle2 size={15} className="shrink-0 text-primary" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 rounded-sm bg-primary hover:bg-blue-700 disabled:opacity-50 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition-all focus:outline-none"
          >
            <Send size={13} />
            <span>{submitting ? 'Processing...' : t('btnSubmitDecision')}</span>
          </button>
        </div>
      </form>
    </div>
  )
}

export default ReviewPanel
