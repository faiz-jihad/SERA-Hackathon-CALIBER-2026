import React from 'react'
import { Check, ArrowRight } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

export interface InvestigationStepProps {
  currentStep: number // 1 to 6
  onSelectStep?: (step: number) => void
}

export const InvestigationStep: React.FC<InvestigationStepProps> = ({
  currentStep,
  onSelectStep,
}) => {
  const { t } = useLanguage()

  const steps = [
    { id: 1, label: t('stepDetect'), key: 'detect' },
    { id: 2, label: t('stepInvestigate'), key: 'investigate' },
    { id: 3, label: t('stepRCA'), key: 'rca' },
    { id: 4, label: t('stepRecommend'), key: 'recommend' },
    { id: 5, label: t('stepReview'), key: 'review' },
    { id: 6, label: t('stepVerify'), key: 'verify' },
  ]

  return (
    <div className="w-full overflow-x-auto py-1">
      <div className="flex min-w-[640px] items-center justify-between rounded-sm border border-slate-200 bg-white p-4 shadow-sm">
        {steps.map((step, idx) => {
          const isDone = step.id < currentStep
          const isCurrent = step.id === currentStep

          return (
            <React.Fragment key={step.id}>
              <div
                onClick={() => onSelectStep && onSelectStep(step.id)}
                className={`flex items-center gap-2.5 rounded-sm px-3 py-2 transition-all duration-150 ${
                  onSelectStep ? 'cursor-pointer hover:bg-slate-50' : ''
                } ${
                  isCurrent
                    ? 'bg-blue-50 border border-blue-300 text-primary shadow-xs font-bold'
                    : isDone
                    ? 'text-primary'
                    : 'text-slate-400'
                }`}
              >
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs font-bold transition-all ${
                    isDone
                      ? 'bg-primary text-white'
                      : isCurrent
                      ? 'bg-primary text-white ring-2 ring-blue-200'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {isDone ? <Check size={12} strokeWidth={2.5} /> : step.id}
                </div>
                <span
                  className={`text-xs font-semibold tracking-wide ${
                    isCurrent
                      ? 'text-primary font-bold'
                      : isDone
                      ? 'text-slate-800'
                      : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {idx < steps.length - 1 && (
                <ArrowRight
                  size={14}
                  className={`shrink-0 ${isDone ? 'text-primary' : 'text-slate-300'}`}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

export default InvestigationStep
