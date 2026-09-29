// SERA Utility Functions

export function getStatusBadgeClass(status: string): string {
  const s = (status || '').toUpperCase()
  switch (s) {
    case 'NORMAL': return 'badge-normal'
    case 'WARNING': return 'badge-warning'
    case 'ALARM': return 'badge-alarm'
    case 'CRITICAL': return 'badge-critical'
    case 'TRIP': return 'badge-trip'
    default: return 'badge-unknown'
  }
}

export function getStatusDotClass(status: string): string {
  const s = (status || '').toUpperCase()
  switch (s) {
    case 'NORMAL': return 'status-dot-normal'
    case 'WARNING': return 'status-dot-warning'
    case 'ALARM': return 'status-dot-alarm'
    case 'CRITICAL': return 'status-dot-critical'
    case 'TRIP': return 'status-dot-trip'
    default: return 'status-dot bg-gray-500'
  }
}

export function getSeverityColor(severity: string): string {
  const s = (severity || '').toUpperCase()
  switch (s) {
    case 'LOW': return '#00C896'
    case 'MEDIUM': return '#F59E0B'
    case 'HIGH': return '#EF4444'
    case 'CRITICAL': return '#FF3B3B'
    default: return '#6B7280'
  }
}

export function getConfidenceColor(confidence: string): string {
  const c = (confidence || '').toUpperCase()
  switch (c) {
    case 'HIGH': return '#00C896'
    case 'MEDIUM': return '#F59E0B'
    case 'LOW': return '#EF4444'
    default: return '#6B7280'
  }
}

export function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return '—'
  return value.toFixed(decimals)
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return d.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  } catch {
    return dateStr
  }
}

export function getSeverityBadgeClass(severity: string): string {
  const s = (severity || '').toUpperCase()
  switch (s) {
    case 'LOW': return 'badge-normal'
    case 'MEDIUM': return 'badge-warning'
    case 'HIGH': return 'badge-alarm'
    case 'CRITICAL': return 'badge-critical'
    default: return 'badge-unknown'
  }
}
