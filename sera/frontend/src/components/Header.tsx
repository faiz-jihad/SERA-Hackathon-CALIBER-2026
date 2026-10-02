import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  LogOut,
  UserCheck,
  ShieldCheck,
  Wrench,
  BarChart3,
  Database,
  Check,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useAuth, UserRole } from '../context/AuthContext'
import LanguageSwitcher from './LanguageSwitcher'
import GlobalSearchModal from './GlobalSearchModal'
import soundEffects from '../utils/soundEffects'

interface HeaderProps {
  sidebarOpen: boolean
  setSidebarOpen: (arg: boolean) => void
}

export const Header: React.FC<HeaderProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { t } = useLanguage()
  const { user, logout, switchRole } = useAuth()
  const navigate = useNavigate()
  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [soundOn, setSoundOn] = useState(soundEffects.isEnabled())
  const dropdownRef = useRef<HTMLDivElement>(null)

  const toggleSound = () => {
    const next = soundEffects.toggle()
    setSoundOn(next)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchModalOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    logout()
    setUserDropdownOpen(false)
    navigate('/login')
  }

  const roleLabels: Record<UserRole, { label: string; icon: any }> = {
    RELIABILITY_LEAD: { label: t('roleLeadEngineer'), icon: ShieldCheck },
    MAINTENANCE_TECH: { label: t('roleTechnician'), icon: Wrench },
    PLANT_MANAGER: { label: t('roleManager'), icon: BarChart3 },
    DATA_ENGINEER: { label: t('roleDataAdmin'), icon: Database },
  }

  return (
    <>
      <header className="sticky top-0 z-40 flex w-full border-b border-slate-200 bg-white">
        <div className="flex flex-grow items-center justify-between px-4 py-2 md:px-5">

          {/* Left: Hamburger + Search */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-controls="sidebar"
              onClick={(e) => {
                e.stopPropagation()
                setSidebarOpen(!sidebarOpen)
              }}
              className="block rounded-sm border border-slate-200 p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 lg:hidden"
            >
              <Menu size={16} />
            </button>

            {/* Search */}
            <button
              type="button"
              onClick={() => setSearchModalOpen(true)}
              className="hidden sm:flex items-center gap-2.5 border border-slate-200 bg-slate-50 rounded-sm py-1.5 px-3 text-xs text-slate-500 hover:border-slate-300 hover:bg-white transition-colors w-56 lg:w-72"
            >
              <Search size={13} className="text-slate-400 flex-shrink-0" />
              <span className="truncate text-slate-400">Search equipment, incidents... </span>
              <kbd className="ml-auto rounded bg-white border border-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                Ctrl+K
              </kbd>
            </button>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            {/* Mobile search */}
            <button
              type="button"
              onClick={() => setSearchModalOpen(true)}
              className="flex sm:hidden h-8 w-8 items-center justify-center border border-slate-200 rounded-sm text-slate-500 hover:text-slate-800"
              aria-label="Search"
            >
              <Search size={14} />
            </button>

            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Sound Effects Toggle */}
            <button
              type="button"
              onClick={toggleSound}
              title={soundOn ? 'Industrial Audio FX: Active (Click to mute)' : 'Industrial Audio FX: Muted (Click to enable)'}
              className={`h-8 w-8 flex items-center justify-center border rounded-sm transition-colors ${
                soundOn
                  ? 'border-slate-300 bg-white text-primary hover:bg-slate-50'
                  : 'border-slate-200 bg-slate-50 text-slate-400 hover:text-slate-600'
              }`}
              aria-label="Toggle Sound Effects"
            >
              {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>

            {/* Plant indicator */}
            <div className="hidden xl:flex items-center gap-1.5 border border-slate-200 rounded-sm px-2.5 py-1 text-[10px] font-mono text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Orion Polypropylene (OPP)
            </div>

            {/* Production status badge */}
            <div className="hidden md:flex items-center gap-1.5 border border-emerald-300 bg-emerald-50/80 px-2 py-0.5 rounded-sm text-[10px] font-mono text-emerald-800 font-bold tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              PRODUCTION
            </div>

            {/* Notification */}
            <button
              type="button"
              className="relative h-8 w-8 flex items-center justify-center border border-slate-200 rounded-sm text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              aria-label="Notifications"
            >
              <Bell size={14} />
              <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-red-500" />
            </button>

            {/* User */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 pl-3 border-l border-slate-200 hover:opacity-80 transition-opacity"
              >
                <div className="hidden text-right lg:block">
                  <span className="block text-xs font-semibold text-slate-900">{user?.name || 'Engineer'}</span>
                  <span className="block text-[10px] font-mono text-slate-500">
                    {user ? roleLabels[user.role]?.label : 'Lead Engineer'}
                  </span>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-slate-900 font-mono text-xs font-bold text-white flex-shrink-0">
                  {user?.avatarInitials || 'RE'}
                </div>
                <ChevronDown size={12} className="hidden lg:block text-slate-400" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-64 rounded-sm border border-slate-200 bg-white shadow-lg z-50">
                  {/* User info */}
                  <div className="border-b border-slate-100 px-3 py-2.5">
                    <div className="text-xs font-bold text-slate-900">{user?.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{user?.department}</div>
                    {user?.shift && (
                      <div className="mt-1 inline-block border border-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 rounded-sm">
                        {user.shift}
                      </div>
                    )}
                  </div>

                  {/* Role switcher */}
                  <div className="px-3 py-2">
                    <div className="text-[9px] font-bold font-mono uppercase tracking-widest text-slate-400 mb-1.5">
                      {t('switchRole')}
                    </div>
                    {(['RELIABILITY_LEAD', 'MAINTENANCE_TECH', 'PLANT_MANAGER', 'DATA_ENGINEER'] as UserRole[]).map((r) => {
                      const info = roleLabels[r]
                      const Icon = info.icon
                      const isCurrent = user?.role === r
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => { switchRole(r); setUserDropdownOpen(false) }}
                          className={`w-full flex items-center justify-between rounded-sm px-2 py-1.5 text-left text-xs transition-colors ${
                            isCurrent
                              ? 'bg-slate-900 text-white font-semibold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon size={13} />
                            <span>{info.label}</span>
                          </div>
                          {isCurrent && <Check size={12} />}
                        </button>
                      )
                    })}
                  </div>

                  {/* Logout */}
                  <div className="border-t border-slate-100 px-3 py-2">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={13} />
                      <span>{t('logout')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <GlobalSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />
    </>
  )
}

export default Header
