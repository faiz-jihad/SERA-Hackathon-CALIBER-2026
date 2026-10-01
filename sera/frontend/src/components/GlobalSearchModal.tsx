import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, Cpu, AlertTriangle, Activity, ArrowRight } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { getEquipmentList, getIncidents } from '../api/client'
import StatusBadge from './StatusBadge'
import soundEffects from '../utils/soundEffects'

export interface GlobalSearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage()
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [equipment, setEquipment] = useState<any[]>([])
  const [incidents, setIncidents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      return
    }
    soundEffects.playNotification()
    const fetchSearchIndex = async () => {
      setLoading(true)
      try {
        const [eqList, incList] = await Promise.all([
          getEquipmentList().catch(() => []),
          getIncidents().catch(() => []),
        ])
        setEquipment(eqList)
        setIncidents(incList)
      } catch (err) {
        // silent fallback
      } finally {
        setLoading(false)
      }
    }
    fetchSearchIndex()
  }, [isOpen])

  // Keyboard shortcut ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!isOpen) return null

  const q = query.trim().toLowerCase()

  const matchedEquipment = q
    ? equipment.filter(
        (e) =>
          e.equipment_id.toLowerCase().includes(q) ||
          e.name.toLowerCase().includes(q) ||
          (e.type && e.type.toLowerCase().includes(q))
      )
    : equipment.slice(0, 5)

  const matchedIncidents = q
    ? incidents.filter(
        (i) =>
          i.equipment_id.toLowerCase().includes(q) ||
          (i.incident_title && i.incident_title.toLowerCase().includes(q)) ||
          (i.problem && i.problem.toLowerCase().includes(q)) ||
          (i.root_cause && i.root_cause.toLowerCase().includes(q))
      )
    : incidents.slice(0, 4)

  const hasResults = matchedEquipment.length > 0 || matchedIncidents.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 backdrop-blur-xs sm:pt-20 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-sm border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center border-b border-slate-200 bg-white px-4 py-3">
          <Search size={18} className="text-primary shrink-0 mr-3" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none font-sans"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="rounded p-1 text-slate-400 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-2 rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] text-slate-500 hover:bg-slate-100"
          >
            ESC
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4 bg-white">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500 font-mono">
              {t('loadingText')}
            </div>
          ) : !hasResults ? (
            <div className="py-8 text-center text-xs text-slate-500">
              {t('noSearchResults')}
            </div>
          ) : (
            <>
              {/* Equipment Matches */}
              {matchedEquipment.length > 0 && (
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                    {t('categoryEquipment')}
                  </span>
                  <div className="space-y-1.5">
                    {matchedEquipment.map((eq) => (
                      <div
                        key={eq.equipment_id}
                        onClick={() => {
                          soundEffects.playClick()
                          navigate(`/equipment/${eq.equipment_id}`)
                          onClose()
                        }}
                        className="flex cursor-pointer items-center justify-between rounded-sm border border-slate-200 bg-slate-50/70 p-2.5 hover:border-primary/50 hover:bg-blue-50/50 transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <Cpu size={15} className="text-primary shrink-0" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-900">
                                {eq.equipment_id}
                              </span>
                              <span className="text-xs text-slate-600">— {eq.name}</span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">{eq.type}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={eq.status} size="sm" />
                          <ArrowRight size={14} className="text-slate-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Incident Matches */}
              {matchedIncidents.length > 0 && (
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                    {t('categoryIncidents')}
                  </span>
                  <div className="space-y-1.5">
                    {matchedIncidents.map((inc) => (
                      <div
                        key={inc.id}
                        onClick={() => {
                          soundEffects.playClick()
                          navigate(`/incidents?highlight=${inc.id}`)
                          onClose()
                        }}
                        className="flex cursor-pointer items-center justify-between rounded-sm border border-slate-200 bg-slate-50/70 p-2.5 hover:border-amber-400 hover:bg-amber-50/40 transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <AlertTriangle size={15} className="text-amber-500 shrink-0" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-900">
                                {inc.equipment_id}
                              </span>
                              <span className="text-xs text-slate-700 font-medium">
                                {inc.incident_title || inc.problem}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 line-clamp-1">
                              RCA: {inc.root_cause}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-slate-500">
                            {inc.incident_date}
                          </span>
                          <ArrowRight size={14} className="text-slate-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-right">
          <span className="font-mono text-[10px] text-slate-400">
            SERA Global Reliability Directory • CALIBER 2026
          </span>
        </div>
      </div>
    </div>
  )
}

export default GlobalSearchModal
