/**
 * Format utilities for the resort dashboard.
 */

/** Format a number as Indian Rupees */
export function formatRupees(value: number, compact = false): string {
  if (compact) {
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`
  }
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

/** Format a date string as "Sun 06 Sep 14:35" */
export function formatSimTime(iso: string, _includeSeconds = false): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('en-IN', {
      weekday: 'short', day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit', hour12: false,
    })
  } catch {
    return iso
  }
}

/** Format minutes remaining as "14m" or "2h 5m" */
export function formatMinutes(minutes: number): string {
  if (minutes < 0) return '0m'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

/** Format a percentage as "72.4%" */
export function formatPct(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

/** GERS band label and colour */
export function gersBand(score: number): { label: string; color: string } {
  if (score >= 70) return { label: 'Critical', color: 'var(--signal-crit)' }
  if (score >= 40) return { label: 'Watch', color: 'var(--signal-money)' }
  return { label: 'Fine', color: 'var(--signal-ok)' }
}

/** Health score colour */
export function healthColor(score: number): string {
  if (score < 40) return 'var(--signal-crit)'
  if (score < 70) return 'var(--signal-money)'
  return 'var(--signal-ok)'
}

/** Workload index colour */
export function workloadColor(wi: number): string {
  if (wi >= 80) return 'var(--signal-crit)'
  if (wi >= 60) return 'var(--signal-money)'
  return 'var(--signal-ops)'
}

/** Autonomy status badge colours */
export function autonomyColor(status: string): string {
  switch (status) {
    case 'auto':      return 'var(--signal-ok)'
    case 'proposed':  return 'var(--signal-money)'
    case 'approved':  return 'var(--signal-ok)'
    case 'rejected':  return 'var(--signal-crit)'
    case 'rolled_back': return 'var(--ink-dim)'
    default:          return 'var(--ink-dim)'
  }
}
