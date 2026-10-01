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
import soundEffects from '../utils/soundEffects'

export interface SidebarProps {
  sidebarOpen: boolean
  setSidebarOpen: (arg: boolean) => void
}

interface NavItem {
  to: string
  labelKey: string
  icon: any
  exact?: boolean
  badge?: string
  badgeVariant?: 'alert' | 'info' | 'success'
}

interface MenuGroup {
  nameKey: string
  items: NavItem[]
}

const MENU_GROUPS: MenuGroup[] = [
  {
    nameKey: 'sidebarGroupOverview',
    items: [
      { to: '/', labelKey: 'navDashboard', icon: LayoutDashboard, exact: true },
      { to: '/equipment', labelKey: 'navEquipment', icon: Cpu },
    ],
  },
  {
    nameKey: 'sidebarGroupInvestigation',
    items: [
      { to: '/analysis', labelKey: 'navInvestigations', icon: Activity },
      { to: '/incidents', labelKey: 'navIncidents', icon: AlertTriangle },
    ],
  },
  {
    nameKey: 'sidebarGroupEngineering',
    items: [
      { to: '/recommendations', labelKey: 'navRecommendations', icon: ClipboardCheck },
      { to: '/follow-up', labelKey: 'navFollowUp', icon: ShieldCheck },
    ],
  },
  {
    nameKey: 'sidebarGroupData',
    items: [
      { to: '/ingestion', labelKey: 'navIngestion', icon: UploadCloud },
    ],
  },
]

export const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { t } = useLanguage()

  return (
    <>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 flex h-screen w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="border-b border-slate-200 px-4 py-4">
          <NavLink to="/" className="block">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center bg-slate-900 text-white font-mono text-xs font-bold rounded-sm flex-shrink-0">
                S
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm tracking-tight">SERA</div>
                <div className="text-[10px] text-slate-500 leading-tight">
                  {t('brandSubtitle')}
                </div>
              </div>
            </div>
          </NavLink>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {MENU_GROUPS.map((group) => (
            <div key={group.nameKey}>
              <div className="px-2 mb-1 text-[9px] font-bold font-mono uppercase tracking-widest text-slate-400">
                {t(group.nameKey)}
              </div>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.exact}
                        onClick={() => {
                          soundEffects.playClick()
                          if (window.innerWidth < 1024) setSidebarOpen(false)
                        }}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 rounded-sm px-2 py-1.5 text-xs transition-colors ${
                            isActive
                              ? 'bg-slate-900 text-white font-semibold'
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }`
                        }
                      >
                        <Icon size={14} className="flex-shrink-0" />
                        <span className="truncate">{t(item.labelKey)}</span>
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-slate-400">SERA · CALIBER 2026</span>
            <span className="text-slate-400">v2.0</span>
          </div>
          <div className="mt-0.5 text-[9px] font-mono text-slate-300">
            Case 2 · OPP Powder Handling
          </div>
        </div>

        {/* Mobile close button */}
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-600 lg:hidden text-sm"
          aria-label="Close menu"
        >
          ✕
        </button>
      </aside>
    </>
  )
}

export default Sidebar