import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
} from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useAuth, UserRole } from '../context/AuthContext'
import LanguageSwitcher from './LanguageSwitcher'
import GlobalSearchModal from './GlobalSearchModal'

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
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Keyboard shortcut Ctrl+K / Cmd+K to open search
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

  // Close dropdown on click outside
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

  const roleLabels: Record<UserRole, { label: string; icon: any; color: string }> = {
    RELIABILITY_LEAD: { label: t('roleLeadEngineer'), icon: ShieldCheck, color: 'text-primary' },
    MAINTENANCE_TECH: { label: t('roleTechnician'), icon: Wrench, color: 'text-blue-600' },
    PLANT_MANAGER: { label: t('roleManager'), icon: BarChart3, color: 'text-amber-600' },
    DATA_ENGINEER: { label: t('roleDataAdmin'), icon: Database, color: 'text-emerald-600' },
  }

  return (
    <>
      <header className="sticky top-0 z-40 flex w-full border-b border-slate-200 bg-white drop-shadow-1">
        <div className="flex flex-grow items-center justify-between px-4 py-3 md:px-6 2xl:px-11">
          {/* Left: Hamburger Button & Search Bar */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              aria-controls="sidebar"
              onClick={(e) => {
                e.stopPropagation()
                setSidebarOpen(!sidebarOpen)
              }}
              className="z-50 block rounded-sm border border-slate-200 bg-slate-50 p-2 text-slate-600 shadow-xs hover:text-primary lg:hidden"
            >
              <Menu size={18} />
            </button>

            {/* Global Search Bar */}
            <div className="hidden sm:block">
              <button
                type="button"
                onClick={() => setSearchModalOpen(true)}
                className="flex items-center gap-3 rounded-sm border border-slate-200 bg-slate-50 py-2 px-3.5 text-xs text-slate-500 hover:border-primary hover:bg-white transition-all w-64 lg:w-80 shadow-xs"
              >
                <Search size={14} className="text-slate-400" />
                <span className="truncate text-slate-500 font-medium">{t('searchPlaceholder')}</span>
                <kbd className="ml-auto rounded-sm bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-400 border border-slate-200">
                  Ctrl+K
                </kbd>
              </button>
            </div>
          </div>

          {/* Right: Language Switcher, Notifications & User Area */}
          <div className="flex items-center gap-3 2xl:gap-5">
            {/* Mobile search trigger */}
            <button
              type="button"
              onClick={() => setSearchModalOpen(true)}
              className="flex h-8.5 w-8.5 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 hover:text-primary sm:hidden"
              aria-label="Open Search"
            >
              <Search size={15} />
            </button>

            {/* Prominent Bilingual Switcher */}
            <LanguageSwitcher />

            {/* Plant Unit Indicator Pill */}
            <div className="hidden xl:flex items-center gap-2 rounded-sm border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-mono text-primary font-semibold">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span>Orion Polypropylene Plant (OPP) — Powder Handling</span>
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                className="relative flex h-8.5 w-8.5 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 hover:text-primary hover:bg-blue-50 transition-colors"
                aria-label="Notifications"
              >
                <Bell size={16} />
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500">
                  <span className="absolute -z-1 inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                </span>
              </button>
            </div>

            {/* User Profile & RBAC Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-3 pl-3 border-l border-slate-200 hover:opacity-90 transition-opacity text-left cursor-pointer"
              >
                <div className="hidden text-right lg:block">
                  <span className="block text-xs font-bold text-slate-900">
                    {user?.name || t('role')}
                  </span>
                  <span className="block text-[10px] font-mono text-primary font-semibold">
                    {user ? roleLabels[user.role]?.label : 'Lead Engineer'}
                  </span>
                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary font-bold text-xs text-white shadow-xs ring-2 ring-blue-100">
                  {user?.avatarInitials || 'RE'}
                </div>

                <ChevronDown size={14} className="hidden lg:block text-slate-400" />
              </button>

              {/* Dropdown Menu */}
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2.5 w-72 rounded-sm border border-slate-200 bg-white p-3 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="border-b border-slate-100 pb-2.5 mb-2.5">
                    <span className="block text-xs font-bold text-slate-900">
                      {user?.name}
                    </span>
                    <span className="block text-[11px] text-slate-500 font-mono">
                      {user?.department}
                    </span>
                    <span className="inline-block mt-1 rounded-sm bg-blue-50 border border-blue-200 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                      {user?.shift}
                    </span>
                  </div>

                  {/* RBAC Persona Switcher */}
                  <div className="space-y-1">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 px-1 font-mono">
                      {t('switchRole')}:
                    </span>

                    {(['RELIABILITY_LEAD', 'MAINTENANCE_TECH', 'PLANT_MANAGER', 'DATA_ENGINEER'] as UserRole[]).map((r) => {
                      const info = roleLabels[r]
                      const Icon = info.icon
                      const isCurrent = user?.role === r
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            switchRole(r)
                            setUserDropdownOpen(false)
                          }}
                          className={`w-full flex items-center justify-between rounded-sm p-2 text-left text-xs transition-colors ${
                            isCurrent
                              ? 'bg-blue-50 text-primary font-bold border border-blue-200'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon size={14} className={info.color} />
                            <span>{info.label}</span>
                          </div>
                          {isCurrent && <Check size={14} className="text-primary" />}
                        </button>
                      )
                    })}
                  </div>

                  {/* Sign Out */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 rounded-sm p-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={14} />
                      <span>{t('logout')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />
    </>
  )
}

export default Header
