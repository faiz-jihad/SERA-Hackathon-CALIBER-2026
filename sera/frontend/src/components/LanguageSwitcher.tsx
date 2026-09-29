import React from 'react'
import { useLanguage } from '../context/LanguageContext'
import { Globe } from 'lucide-react'

export const LanguageSwitcher: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="flex items-center gap-1.5 rounded-sm border border-slate-200 bg-slate-50 p-1 shadow-xs">
      <Globe size={13} className="ml-1 text-slate-500" />
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={`px-2 py-0.5 text-xs font-bold tracking-wider rounded-sm transition-all duration-150 ${
            language === 'en'
              ? 'bg-primary text-white shadow-xs'
              : 'text-slate-600 hover:text-primary hover:bg-white'
          }`}
          title="Switch to English"
        >
          EN
        </button>
        <span className="text-slate-300 text-xs font-bold">|</span>
        <button
          type="button"
          onClick={() => setLanguage('id')}
          className={`px-2 py-0.5 text-xs font-bold tracking-wider rounded-sm transition-all duration-150 ${
            language === 'id'
              ? 'bg-primary text-white shadow-xs'
              : 'text-slate-600 hover:text-primary hover:bg-white'
          }`}
          title="Beralih ke Bahasa Indonesia"
        >
          ID
        </button>
      </div>
    </div>
  )
}

export default LanguageSwitcher
