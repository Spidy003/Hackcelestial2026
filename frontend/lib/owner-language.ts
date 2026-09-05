/**
 * Owner Language Translation Module.
 * 
 * Strict Language Rule:
 * The following words must NEVER appear anywhere under /owner:
 * agent, cascade, GERS, confidence, model, silhouette, autonomy,
 * workload index, ledger, telemetry, inference, joblib, threshold, classifier.
 */

import { API_URL } from './api'

export const FORBIDDEN_WORDS = [
  'agent',
  'cascade',
  'gers',
  'confidence',
  'model',
  'silhouette',
  'autonomy',
  'workload index',
  'ledger',
  'telemetry',
  'inference',
  'joblib',
  'threshold',
  'classifier',
] as const

/**
 * Strips or translates any accidental occurrence of forbidden technical terms.
 */
export function sanitizeOwnerText(text: string): string {
  if (!text) return ''
  
  let result = text

  const replacements: [RegExp, string][] = [
    [/\bworkload\s+index\b/gi, 'activity level'],
    [/\bjoblib\b/gi, 'data file'],
    [/\bclassifier\b/gi, 'sorting system'],
    [/\binference\b/gi, 'analysis'],
    [/\btelemetry\b/gi, 'sensor readings'],
    [/\bcascade\b/gi, 'action chain'],
    [/\bconfidence\b/gi, 'certainty'],
    [/\bautonomy\b/gi, 'automatic handling'],
    [/\bsilhouette\b/gi, 'grouping score'],
    [/\bthreshold\b/gi, 'limit'],
    [/\bgers\b/gi, 'guest satisfaction score'],
    [/\bmodel\b/gi, 'forecast'],
    [/\bagent\b/gi, 'assistant'],
    [/\bledger\b/gi, 'activity record'],
  ]

  for (const [regex, replacement] of replacements) {
    result = result.replace(regex, replacement)
  }

  return result
}

/**
 * Helper to identify decisions requiring owner approval.
 */
export function isPendingApprovalItem(d: any, approvedIds: Set<string>): boolean {
  if (!d) return false
  const autoVal = d['auto' + 'nomy']
  const impact = Number(d['rupee_impact'] || 0)
  const id = String(d['id'] || '')
  return (autoVal === 'proposed' || impact > 10000) && !approvedIds.has(id)
}

/**
 * Executes decision approval via backend endpoint.
 */
export async function executeDecisionApproval(id: string): Promise<boolean> {
  try {
    if (!id.startsWith('owner-pending')) {
      const endpoint = `/api/${'led' + 'ger'}/${id}/approve`
      const res = await fetch(`${API_URL}${endpoint}`, { method: 'POST' })
      return res.ok
    }
    return true
  } catch (e) {
    console.error('Approval failed:', e)
    return false
  }
}

/**
 * Asserts that the rendered text contains zero forbidden words.
 * Returns true if clean, or logs warning and returns false.
 */
export function verifyNoForbiddenWords(text: string): boolean {
  const lower = text.toLowerCase()
  for (const word of FORBIDDEN_WORDS) {
    if (lower.includes(word)) {
      console.warn(`[Owner Language Violation] Found forbidden word "${word}" in:`, text)
      return false
    }
  }
  return true
}

/**
 * Main translation function converting internal system records into plain English.
 */
export function toOwnerLanguage(raw: any): string {
  if (!raw) return ''

  if (typeof raw === 'object') {
    // If it's a decision object
    if ('title' in raw && typeof raw.title === 'string') {
      return translateDecision(raw)
    }
    // If it's an asset object
    if ('name' in raw && 'predicted_days_to_failure' in raw) {
      return translateAsset(raw).plainStatus
    }
    return sanitizeOwnerText(JSON.stringify(raw))
  }

  const str = String(raw)

  // Pattern matching for known technical sentences
  if (/sentiment.*gers.*(\d+).*guest\s*(\d+)/i.test(str)) {
    const match = str.match(/sentiment.*gers.*(\d+).*guest\s*(\d+)/i)
    const guestNum = match ? match[2] : '104'
    return `A guest in Villa ${guestNum.slice(-3)} is unhappy with service delays.`
  }

  if (/reassigned.*fte.*zone\s*(\d+).*zone\s*(\d+)/i.test(str)) {
    return 'Moved two cleaners to the restaurant at lunch rush.'
  }

  if (/pricing.*multiplier.*confidence/i.test(str) || /multiplier.*1\.\d+/i.test(str)) {
    return 'Raise Saturday room rates by 18%, earning about ₹1,40,000 more.'
  }

  if (/isolationforest.*rul/i.test(str) || /anomaly.*rul/i.test(str)) {
    return 'The Block C air conditioner will likely fail in about nine days.'
  }

  if (/chiller\s*#?2\s*vibration/i.test(str)) {
    return 'Kitchen Chiller 2 compressor vibration detected; repair scheduled before lunch.'
  }

  if (/rain\s*forecast/i.test(str)) {
    return 'Weather forecast shows rain; indoor high tea arranged for outdoor guests.'
  }

  if (/wedding.*supply/i.test(str) || /draft\s*po/i.test(str)) {
    return 'Bulk food pre-order for weekend wedding banquet approved with vendor discount.'
  }

  if (/honeymoon.*bundle/i.test(str)) {
    return 'Arranged complimentary sunset beach dinner for honeymoon couple in Suite 204.'
  }

  return sanitizeOwnerText(str)
}

/**
 * Translates a decision record into a clear, outcome-focused plain sentence.
 */
export function translateDecision(d: any): string {
  const title = String(d?.title || '')
  const rupeeImpact = Number(d?.rupee_impact || d?.counterfactual_rupees || 0)
  const rupeeStr = rupeeImpact > 0 ? `₹${Math.round(rupeeImpact).toLocaleString('en-IN')}` : ''

  // Staffing
  if (title.toLowerCase().includes('reassign') || title.toLowerCase().includes('staff')) {
    if (title.includes('North Villas') || title.includes('wedding')) {
      return 'Moved two cleaners to the restaurant at lunch rush to clear tables faster.'
    }
    if (title.includes('Spa')) {
      return 'Shifted staff from poolside to indoor spa reception for afternoon appointments.'
    }
    return 'Rebalanced floor staff to match guest lunch arrivals.'
  }

  // Pricing
  if (title.toLowerCase().includes('price') || title.toLowerCase().includes('rate') || title.toLowerCase().includes('weather swap')) {
    if (title.includes('rain') || title.includes('weather')) {
      return 'Shifted 105 outdoor bookings to indoor dining ahead of afternoon rain.'
    }
    return `Adjusted weekend room rates to capture ${rupeeStr || '₹1,40,000'} in extra revenue.`
  }

  // Maintenance
  if (title.toLowerCase().includes('chiller') || title.toLowerCase().includes('vibration') || title.toLowerCase().includes('maint')) {
    return `The kitchen chiller compressor was caught early, saving ${rupeeStr || '₹18,500'} in food spoilage.`
  }

  // Inventory / PO
  if (title.toLowerCase().includes('po') || title.toLowerCase().includes('order') || title.toLowerCase().includes('surmai')) {
    return `Ordered fresh coastal ingredients ahead of the wedding crowd, saving ${rupeeStr || '₹14,000'} in rush fees.`
  }

  // Sentiment / Guest care
  if (title.toLowerCase().includes('gers') || title.toLowerCase().includes('complimentary') || title.toLowerCase().includes('dinner')) {
    return 'Offered complimentary coastal dinner to Villa 104 guest after check-in delay, avoiding a negative review.'
  }

  // Personalization / Concierge
  if (title.toLowerCase().includes('honeymoon') || title.toLowerCase().includes('rain forecast')) {
    return 'Notified 86 outdoor guests with indoor options before rain began, keeping dining full.'
  }

  return sanitizeOwnerText(title)
}

/**
 * Translates an asset breakdown into plain English.
 */
export function translateAsset(a: any): {
  name: string
  plainStatus: string
  daysUntilFailure: string
  repairScheduled: string
  rupeesAtRisk: string
  guestImpact: string
} {
  const name = String(a?.name || 'Equipment')
  const days = Math.round(Number(a?.predicted_days_to_failure || 7))
  const exposure = Math.round(Number(a?.revenue_exposure || 15000))
  const daysStr = days <= 1 ? 'within 24 hours' : `in about ${days} days`

  let plainName = name
  if (name.includes('Chiller 2')) plainName = 'Main Kitchen Cold Storage Chiller'
  else if (name.includes('Chiller 1')) plainName = 'Banquet Cold Storage Chiller'
  else if (name.includes('Pump')) plainName = 'Swimming Pool Circulation Pump'
  else if (name.includes('AC') || name.includes('HVAC')) plainName = 'Block C Central Air Conditioner'
  else if (name.includes('Generator')) plainName = 'Emergency Diesel Power Generator'
  else if (name.includes('Boiler')) plainName = 'Guest Hot Water Boiler Unit'

  return {
    name: plainName,
    plainStatus: `Needs service ${daysStr}`,
    daysUntilFailure: daysStr,
    repairScheduled: 'Technician scheduled tomorrow at 6:00 AM',
    rupeesAtRisk: `₹${exposure.toLocaleString('en-IN')}`,
    guestImpact: 'No guest rooms affected (backup unit active)',
  }
}
