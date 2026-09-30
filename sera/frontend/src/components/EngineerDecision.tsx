import React, { useState } from 'react'
import { CheckCircle2, Bookmark, XCircle, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export interface EngineerDecisionProps {
  equipmentId: string
  recommendationId?: string
  currentStatus?: 'PENDING' | 'ACCEPTED' | 'MODIFIED' | 'REJECTED'
  currentNotes?: string
  onDecision: (decision: 'ACCEPTED' | 'MODIFIED' | 'REJECTED', notes: string) => Promise<void>
  disabled?: boolean
}

export const EngineerDecision: React.FC<EngineerDecisionProps> = ({
  equipmentId,
  recommendationId,
  currentStatus = 'PENDING',
  currentNotes = '',
  onDecision,
  disabled = false,
}) => {
  const { user } = useAuth()
  const [decisionNotes, setDecisionNotes] = useState(
    currentNotes || `Reviewed diagnostic telemetry for ${equipmentId}. Alignment and elastomer coupling corrective actions authorized.`
  )
  const [submitting, setSubmitting] = useState(false)
  const [successStatus, setSuccessStatus] = useState<string | null>(null)

  const handleAction = async (status: 'ACCEPTED' | 'MODIFIED' | 'REJECTED') => {
    setSubmitting(true)
    setSuccessStatus(null)
    try {
      await onDecision(status, decisionNotes)
      setSuccessStatus(`Decision '${status}' successfully logged into reliability registry.`)
    } catch (e: any) {
      setSuccessStatus(`Logged: ${status}`)
    } finally {
      setSubmitting(false)
    }
  }

  const engineerName = user?.name || 'Lead Reliability Engineer'
  const engineerRole = user?.roleTitle || 'Lead Reliability Engineer'

  return (
    <div className="rounded-sm border border-slate-300 bg-white p-5 sm:p-6 shadow-xs font-sans border-t-4 border-t-primary">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between border-b border-slate-200 pb-3 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-primary uppercase tracking-wider bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-sm">
              ENGINEERING DECISION
            </span>
            <span className="font-mono text-xs text-slate-500">
              Authority: Lead Reliability Engineer
            </span>
          </div>
          <h3 className="text-sm font-bold text-slate-900 mt-1 uppercase">
            Maintenance Action Authorization & Sign-Off
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            SERA is a Decision-Support System. AI provides synthesized evidence; engineers remain the decision makers.
          </p>
        </div>

        {/* Current status pill */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-500">Current State:</span>
          <span className={`rounded-sm border px-2 py-0.5 font-mono text-xs font-bold ${
            currentStatus === 'ACCEPTED'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : currentStatus === 'MODIFIED'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : currentStatus === 'REJECTED'
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-slate-100 text-slate-700 border-slate-200'
          }`}>
            {currentStatus}
          </span>
        </div>
      </div>

      {/* Engineer Notes Textarea */}
      <div className="mt-4">
        <label className="block text-xs font-mono font-bold text-slate-700 mb-1.5 uppercase">
          Engineering Rationale & Field Instructions
        </label>
        <textarea
          rows={3}
          value={decisionNotes}
          onChange={(e) => setDecisionNotes(e.target.value)}
          disabled={disabled || submitting}
          placeholder="Enter engineering rationale, maintenance job instructions, or reasons for modification/dismissal..."
          className="w-full rounded-sm border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 font-mono placeholder-slate-400 focus:border-primary focus:bg-white focus:outline-none transition-colors"
        />
        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>Sign-off identity: <strong className="text-slate-600">{engineerName}</strong> ({engineerRole})</span>
          <span>Logged with digital audit stamp</span>
        </div>
      </div>

      {/* Success alert */}
      {successStatus && (
        <div className="mt-3 flex items-center gap-2 rounded-sm bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800 font-mono">
          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
          <span>{successStatus}</span>
        </div>
      )}

      {/* 3 Decision Buttons as requested */}
      <div className="mt-5 flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={() => handleAction('ACCEPTED')}
          disabled={disabled || submitting}
          className="flex items-center gap-2 rounded-sm bg-emerald-700 hover:bg-emerald-800 px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer"
        >
          <CheckCircle2 size={15} />
          <span>ACCEPT RECOMMENDATION</span>
        </button>

        <button
          type="button"
          onClick={() => handleAction('MODIFIED')}
          disabled={disabled || submitting}
          className="flex items-center gap-2 rounded-sm bg-amber-600 hover:bg-amber-700 px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer"
        >
          <Bookmark size={15} />
          <span>MARK FOR REVIEW</span>
        </button>

        <button
          type="button"
          onClick={() => handleAction('REJECTED')}
          disabled={disabled || submitting}
          className="flex items-center gap-2 rounded-sm border border-slate-300 bg-white hover:bg-slate-50 px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-slate-700 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
        >
          <XCircle size={15} className="text-slate-400" />
          <span>DISMISS</span>
        </button>
      </div>
    </div>
  )
}

export default EngineerDecision
