import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ShieldCheck,
  UserCheck,
  Wrench,
  BarChart3,
  Database,
  ArrowRight,
  Lock,
  User,
  CheckCircle2,
  Cpu,
} from 'lucide-react'
import { useAuth, PRESET_USERS, UserRole } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import LanguageSwitcher from '../components/LanguageSwitcher'

export const LoginPage: React.FC = () => {
  const { t } = useLanguage()
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = (location.state as any)?.from?.pathname || '/'

  const [username, setUsername] = useState('lead.engineer')
  const [password, setPassword] = useState('••••••••••••')
  const [selectedRole, setSelectedRole] = useState<UserRole>('RELIABILITY_LEAD')
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      login(selectedRole)
      setLoading(false)
      navigate(from, { replace: true })
    }, 400)
  }

  const handleQuickRoleSelect = (role: UserRole) => {
    setSelectedRole(role)
    const preset = PRESET_USERS[role]
    setUsername(preset.username)
    login(role)
    navigate(from, { replace: true })
  }

  const ROLES_INFO: Array<{
    role: UserRole
    icon: any
    name: string
    title: string
    badge: string
    dept: string
    desc: string
    color: string
    bgLight: string
    border: string
  }> = [
    {
      role: 'RELIABILITY_LEAD',
      icon: ShieldCheck,
      name: PRESET_USERS.RELIABILITY_LEAD.name,
      title: t('roleLeadEngineer'),
      badge: 'Full Decision Authority',
      dept: 'Mechanical Reliability & Asset Integrity',
      desc: t('roleLeadEngineerDesc'),
      color: 'text-primary',
      bgLight: 'bg-blue-50/70',
      border: 'border-blue-200 hover:border-primary',
    },
    {
      role: 'MAINTENANCE_TECH',
      icon: Wrench,
      name: PRESET_USERS.MAINTENANCE_TECH.name,
      title: t('roleTechnician'),
      badge: 'Field Operations',
      dept: 'Rotating Machinery Crew',
      desc: t('roleTechnicianDesc'),
      color: 'text-blue-600',
      bgLight: 'bg-slate-50',
      border: 'border-slate-200 hover:border-primary',
    },
    {
      role: 'PLANT_MANAGER',
      icon: BarChart3,
      name: PRESET_USERS.PLANT_MANAGER.name,
      title: t('roleManager'),
      badge: 'Executive Oversight',
      dept: 'Polymer & Petrochemical Plant Operations',
      desc: t('roleManagerDesc'),
      color: 'text-amber-600',
      bgLight: 'bg-slate-50',
      border: 'border-slate-200 hover:border-amber-400',
    },
    {
      role: 'DATA_ENGINEER',
      icon: Database,
      name: PRESET_USERS.DATA_ENGINEER.name,
      title: t('roleDataAdmin'),
      badge: 'ETL & Ingestion Pipeline',
      dept: 'Plant Telemetry & IT/OT',
      desc: t('roleDataAdminDesc'),
      color: 'text-emerald-600',
      bgLight: 'bg-slate-50',
      border: 'border-slate-200 hover:border-emerald-400',
    },
  ]

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans flex flex-col justify-between selection:bg-primary selection:text-white">
      {/* Top Navbar */}
      <header className="w-full border-b border-slate-200 bg-white px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary text-white shadow-xs">
              <Cpu size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-extrabold tracking-tight text-slate-900">
                  {t('brandName')}
                </span>
                <span className="rounded-sm bg-blue-50 border border-blue-200 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                  CALIBER 2026
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {t('brandSubtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Column: Sign In Form */}
          <div className="lg:col-span-5 rounded-sm border border-slate-200 bg-white p-6 sm:p-8 shadow-xs flex flex-col justify-between">
            <div>
              <div className="mb-6">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary font-mono block mb-1">
                  Plant Security & Terminal Access
                </span>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  {t('loginTitle')}
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  {t('loginSubtitle')}
                </p>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t('loginUsername')}
                  </label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. lead.engineer"
                      required
                      className="w-full rounded-sm border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-primary focus:bg-white focus:outline-none transition-all shadow-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t('loginPassword')}
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full rounded-sm border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-2.5 text-xs text-slate-900 focus:border-primary focus:bg-white focus:outline-none transition-all shadow-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t('currentRole')}
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                    className="w-full rounded-sm border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-primary focus:bg-white focus:outline-none transition-all shadow-xs"
                  >
                    <option value="RELIABILITY_LEAD">👔 {t('roleLeadEngineer')}</option>
                    <option value="MAINTENANCE_TECH">🔧 {t('roleTechnician')}</option>
                    <option value="PLANT_MANAGER">📊 {t('roleManager')}</option>
                    <option value="DATA_ENGINEER">🗄️ {t('roleDataAdmin')}</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    <span>{t('loginRememberMe')}</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-sm bg-primary hover:bg-blue-700 py-3 px-5 text-xs font-bold uppercase tracking-wider text-white shadow-xs transition-all mt-2"
                >
                  <UserCheck size={16} />
                  <span>{loading ? 'Authenticating...' : t('loginButton')}</span>
                  <ArrowRight size={14} />
                </button>
              </form>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 text-center">
              <span className="font-mono text-[11px] text-slate-400">
                SERA v2.0 • ISO 10816-3 & Human-in-the-Loop Verified
              </span>
            </div>
          </div>

          {/* Right Column: Role-Based Access Control (RBAC) Persona Selector */}
          <div className="lg:col-span-7 rounded-sm border border-slate-200 bg-white p-6 sm:p-8 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-3.5 mb-4">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                    {t('loginDemoTitle')}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t('loginDemoDesc')}
                  </p>
                </div>
                <span className="rounded-sm bg-blue-50 border border-blue-200 px-2.5 py-1 font-mono text-[10px] font-bold text-primary">
                  1-Click Sign In
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {ROLES_INFO.map((item) => {
                  const Icon = item.icon
                  const isSelected = selectedRole === item.role
                  return (
                    <div
                      key={item.role}
                      onClick={() => handleQuickRoleSelect(item.role)}
                      className={`cursor-pointer rounded-sm border p-4 transition-all duration-150 flex flex-col justify-between ${
                        item.border
                      } ${
                        isSelected
                          ? 'bg-blue-50/70 border-primary ring-1 ring-primary shadow-xs'
                          : 'bg-white hover:bg-blue-50/30'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-sm bg-white border border-slate-200 ${item.color}`}>
                              <Icon size={16} />
                            </div>
                            <div>
                              <h3 className="text-xs font-bold text-slate-900 leading-tight">
                                {item.title}
                              </h3>
                              <span className="font-mono text-[10px] text-slate-500">
                                {item.name}
                              </span>
                            </div>
                          </div>
                          {isSelected && (
                            <CheckCircle2 size={16} className="text-primary shrink-0" />
                          )}
                        </div>

                        <span className="inline-block rounded-xs bg-white border border-slate-200 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-slate-600 mb-2">
                          {item.badge}
                        </span>

                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-mono">
                          {item.dept}
                        </span>
                        <span className="text-[11px] font-bold text-primary flex items-center gap-1">
                          <span>Sign In</span>
                          <ArrowRight size={12} />
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Core Principle Notice */}
            <div className="mt-6 rounded-sm bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-600 flex items-start gap-2.5">
              <ShieldCheck size={18} className="text-primary shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900">SERA RBAC Compliance: </strong>
                Turnaround work orders and maintenance modifications strictly require authorization by a verified{' '}
                <span className="font-bold text-primary">Lead Reliability Engineer</span>. Technicians and operators have read-and-log execution access.
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 bg-white py-3 px-4 text-center">
        <p className="text-xs text-slate-400 font-mono">
          SERA — System for Equipment Reliability Assessment • {t('allRightsReserved')}
        </p>
      </footer>
    </div>
  )
}

export default LoginPage
