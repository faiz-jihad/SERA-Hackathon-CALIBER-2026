import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Cpu,
  Activity,
  AlertTriangle,
  ClipboardCheck,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

export interface SidebarProps {
  sidebarOpen: boolean
  setSidebarOpen: (arg: boolean) => void
}

interface NavItem {
  to: string
  label: string
  icon: any
  exact?: boolean
  badge?: string
  badgeColor?: string
}

interface MenuGroup {
  name: string
  items: NavItem[]
}

export const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { t } = useLanguage()

  const MENU_GROUPS: MenuGroup[] = [
    {
      name: t('navOperations'),
      items: [
        {
          to: '/',
          label: t('navDashboard'),
          icon: LayoutDashboard,
          exact: true,
        },
        {
          to: '/equipment',
          label: t('navEquipment'),
          icon: Cpu,
          badge: '05 ASSETS',
          badgeColor: 'text-primary bg-blue-50 border-blue-200',
        },
      ],
    },
    {
      name: t('navDiagnostics'),
      items: [
        {
          to: '/analysis',
          label: t('navInvestigations'),
          icon: Activity,
          badge: 'DIAGNOSTICS',
          badgeColor: 'text-primary bg-blue-50 border-blue-200',
        },
        {
          to: '/incidents',
          label: t('navIncidents'),
          icon: AlertTriangle,
        },
      ],
    },
    {
      name: t('navEngineering'),
      items: [
        {
          to: '/recommendations',
          label: t('navRecommendations'),
          icon: ClipboardCheck,
          badge: 'REVIEW',
          badgeColor: 'text-amber-700 bg-amber-50 border-amber-200',
        },
        {
          to: '/follow-up',
          label: t('navFollowUp'),
          icon: ShieldCheck,
          badge: 'VERIFIED',
          badgeColor: 'text-blue-700 bg-blue-50 border-blue-200',
        },
      ],
    },
    {
      name: t('navDataSystems'),
      items: [
        {
          to: '/ingestion',
          label: t('navIngestion'),
          icon: UploadCloud,
        },
      ],
    },
  ]

  return (
    <>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Light White + Blue Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 z-50 flex h-screen w-72 flex-col justify-between border-r border-slate-200 bg-white shadow-sm transition-transform duration-300 ease-linear lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Brand Header */}
        <div>
          <div className="flex items-center justify-between gap-2 px-6 py-5 border-b border-slate-200 bg-white">
            <NavLink to="/" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-primary font-mono text-sm font-bold text-white shadow-sm">
                S
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold tracking-wider text-slate-900">
                    {t('brandName')}
                  </span>
                  <span className="rounded-sm bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[9px] font-mono font-bold tracking-wider text-primary">
                    CALIBER
                  </span>
                </div>
                <p className="text-[10px] font-medium text-slate-500 tracking-tight">
                  {t('tagline')}
                </p>
              </div>
            </NavLink>

            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="block rounded-sm p-1.5 text-slate-400 hover:text-slate-700 lg:hidden"
            >
              ✕
            </button>
          </div>

          {/* Navigation Links */}
          <div className="no-scrollbar flex flex-col overflow-y-auto px-4 py-4 space-y-6">
            {MENU_GROUPS.map((group) => (
              <div key={group.name}>
                <h3 className="mb-2.5 ml-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                  {group.name}
                </h3>
                <ul className="mb-2 flex flex-col gap-1">
                  {group.items.map((item) => {
                    const Icon = item.icon
                    return (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          end={item.exact}
                          onClick={() => {
                            if (window.innerWidth < 1024) setSidebarOpen(false)
                          }}
                          className={({ isActive }) => `
                            group relative flex items-center justify-between gap-2.5 rounded-sm py-2.5 px-3.5 font-semibold text-xs duration-150 ease-in-out ${
                              isActive
                                ? 'bg-blue-50 text-primary border-l-4 border-primary shadow-xs font-bold'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-primary'
                            }
                          `}
                        >
                          <div className="flex items-center gap-3 truncate">
                            <Icon size={17} className="shrink-0 text-slate-400 group-hover:text-primary" />
                            <span className="truncate">{item.label}</span>
                          </div>
                          {item.badge && (
                            <span
                              className={`rounded-sm border px-1.5 py-0.5 font-mono text-[9px] font-bold ${item.badgeColor}`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </NavLink>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Meta & Active User Pill */}
        <div className="border-t border-slate-200 p-4 bg-slate-50 space-y-3">
          <div className="rounded-sm border border-slate-200 bg-white p-3 shadow-xs">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500 font-semibold">SERA Engine</span>
              <span className="text-primary font-bold">v2.0.0</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 leading-tight">
              Deterministic evidence & RCA decision support
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar