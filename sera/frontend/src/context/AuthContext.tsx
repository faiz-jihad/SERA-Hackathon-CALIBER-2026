import React, { createContext, useContext, useState, useEffect } from 'react'

export type UserRole = 'RELIABILITY_LEAD' | 'MAINTENANCE_TECH' | 'PLANT_MANAGER' | 'DATA_ENGINEER'

export interface UserProfile {
  id: string
  username: string
  name: string
  role: UserRole
  roleTitle: string
  department: string
  shift: string
  avatarInitials: string
  permissions: string[]
}

export const PRESET_USERS: Record<UserRole, UserProfile> = {
  RELIABILITY_LEAD: {
    id: 'lead_engineer',
    username: 'lead.engineer',
    name: 'Ir. Budi Santoso, IPU',
    role: 'RELIABILITY_LEAD',
    roleTitle: 'Lead Reliability Engineer',
    department: 'Mechanical Reliability & Asset Integrity',
    shift: 'Shift 1 • Turnaround Command',
    avatarInitials: 'BS',
    permissions: [
      'canRunDiagnostics',
      'canApproveRecommendations',
      'canModifyScope',
      'canRejectRecommendations',
      'canVerifyFollowUp',
      'canIngestData',
      'canViewFleet',
      'canExportReports',
    ],
  },
  MAINTENANCE_TECH: {
    id: 'tech_surya',
    username: 'tech.surya',
    name: 'Surya Pratama, A.Md.',
    role: 'MAINTENANCE_TECH',
    roleTitle: 'Plant Maintenance Technician',
    department: 'Rotating Equipment Maintenance Crew',
    shift: 'Shift 1 • Field Inspection',
    avatarInitials: 'SP',
    permissions: [
      'canViewFleet',
      'canRecordFieldNotes',
      'canViewRecommendations',
      'canViewFollowUp',
      'canViewIncidents',
    ],
  },
  PLANT_MANAGER: {
    id: 'mgr_hartono',
    username: 'mgr.hartono',
    name: 'Drs. Hartono Wijaya, MM',
    role: 'PLANT_MANAGER',
    roleTitle: 'Plant Operations Manager',
    department: 'Polymer & Petrochemical Operations Division (OPP / ARP / SMX)',
    shift: 'General Daytime Operations',
    avatarInitials: 'HW',
    permissions: [
      'canViewFleet',
      'canViewFinancialKPIs',
      'canExportReports',
      'canViewRecommendations',
      'canViewFollowUp',
      'canViewAudit',
    ],
  },
  DATA_ENGINEER: {
    id: 'data_admin',
    username: 'data.admin',
    name: 'Ahmad Fauzi, S.Kom.',
    role: 'DATA_ENGINEER',
    roleTitle: 'Reliability Data Engineer',
    department: 'Plant Telemetry & IT/OT Systems',
    shift: 'Central Data Processing',
    avatarInitials: 'AF',
    permissions: [
      'canIngestData',
      'canTriggerBatch',
      'canConfigureThresholds',
      'canViewFleet',
      'canViewAudit',
    ],
  },
}

interface AuthContextType {
  user: UserProfile | null
  isAuthenticated: boolean
  login: (role?: UserRole, customUser?: Partial<UserProfile>) => void
  logout: () => void
  switchRole: (role: UserRole) => void
  hasPermission: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const STORAGE_KEY = 'sera_auth_user'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch {
      // ignore
    }
    // Require explicit login — no auto-login bypass
    return null
  })

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [user])

  const login = (role: UserRole = 'RELIABILITY_LEAD', customUser?: Partial<UserProfile>) => {
    const base = PRESET_USERS[role] || PRESET_USERS.RELIABILITY_LEAD
    const finalUser: UserProfile = customUser ? { ...base, ...customUser } : base
    setUser(finalUser)
  }

  const logout = () => {
    setUser(null)
  }

  const switchRole = (role: UserRole) => {
    if (PRESET_USERS[role]) {
      setUser(PRESET_USERS[role])
    }
  }

  const hasPermission = (permission: string): boolean => {
    if (!user) return false
    return user.permissions.includes(permission)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        switchRole,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
