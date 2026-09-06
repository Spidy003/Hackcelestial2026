/**
 * Zustand store — single source of truth for all resort state.
 * applyPatch() applies dot-notation paths like "zones.3.workload_index": 87
 * applySnapshot() replaces full state sections.
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

export interface Zone {
  id: number; name: string; kind: string; floor: number; capacity: number
  staff_required_baseline: number; workload_index: number; staff_on_duty: number
  staff_required_now: number; backlog_count: number
}

export interface Staff {
  id: number; name: string; role: string; skills: string[]; status: string
  current_zone_id: number; fatigue_score: number; utilisation_pct: number
  hours_this_week: number; quality_rating: number; shift_start: number; shift_end: number
}

export interface Task {
  id: number; type: string; title: string; priority: number; status: string
  guest_id?: number; assigned_staff_id?: number; sla_remaining: number
  is_breaching: boolean; zone_id?: number; sla_minutes: number; created_at: string
}

export interface Guest {
  id: number; name: string; language: string; loyalty_tier: string
  gers_score: number; gers_drivers: string[]; segment_id?: number
  propensity_discount: number; propensity_upsell: number
  stays_count: number; lifetime_value: number; avg_rating_given: number
}

export interface Asset {
  id: number; name: string; kind: string; zone_id: number; room_id?: number
  health_score: number; predicted_days_to_failure: number; revenue_exposure: number
  recommended_service_window?: string; criticality: number; runtime_hours: number
}

export interface InventoryItem {
  id: number; sku: string; name: string; category: string; unit: string
  on_hand: number; par_level: number; forecast_7d: number; days_of_cover: number
  shortfall_qty: number; expiring_soon_qty: number; unit_cost: number
}

export interface ServiceSlot {
  id: number; kind: string; name: string; start_ts: string
  capacity: number; booked: number; base_price: number
  current_price: number; fill_pct: number; minutes_to_expiry: number
}

export interface Decision {
  id: string; ts: string; agent: string; kind: string; title: string
  reasoning_steps: string[]; inputs: Record<string, unknown>; confidence: number
  rupee_impact: number; counterfactual_text: string; counterfactual_rupees: number
  autonomy: string; cascade_id?: string; linked_entity?: string
}

export interface ResortEvent {
  id: string; ts: string; sim_ts: string; type: string
  payload: Record<string, unknown>; emitted_by: string
  cascade_id: string; parent_event_id?: string
}

export interface AgentStatus {
  name: string; running: boolean; model_loaded: boolean
  decision_count: number; last_decision_title: string
  last_decision_ts?: string; last_confidence: number
}

export interface KPIs {
  occupancy_pct: number; occupied_rooms: number
  staff_on_duty: number; open_tasks: number; sla_breaches: number
  decisions_today: number; rupees_protected: number; guests_at_risk: number
  food_waste_pct: number; reviews_prevented: number
}

export interface ClockState {
  sim_now: string; speed: string; sim_minutes_per_tick: number
  paused: boolean; tick_count: number
}

interface ResortStore {
  // Connection
  connectionStatus: 'disconnected' | 'connecting' | 'connected'
  setConnectionStatus: (s: ResortStore['connectionStatus']) => void

  // Resort state
  zones: Record<number, Zone>
  staff: Record<number, Staff>
  tasks: Record<number, Task>
  guests: Record<number, Guest>
  assets: Record<number, Asset>
  inventory: Record<number, InventoryItem>
  slots: Record<number, ServiceSlot>
  agents: Record<string, AgentStatus>
  kpis: KPIs
  clock: ClockState

  // Derived Intelligence
  events: ResortEvent[]
  decisions: Decision[]
  segments: unknown[]
  alerts: unknown[]
  stress_index: number
  stress_trend: number[]
  weather: { temp: number; condition: string }

  // Theme
  theme: 'white' | 'dark'
  setTheme: (t: 'white' | 'dark') => void

  // Actions
  recomputeLiveOccupancy: () => void
  setClock: (c: Partial<ClockState>) => void
  applySnapshot: (state: Record<string, unknown>, sim_ts: string) => void
  applyPatch: (paths: Record<string, unknown>, sim_ts: string) => void
  addEvents: (events: ResortEvent[]) => void
  addDecisions: (decisions: Decision[]) => void
}

/**
 * Reads localStorage to compute live occupancy based on checked-out guests.
 * ONLY safe to call on the client (inside useEffect or event handlers).
 * Never call this during SSR or inside store initialisation.
 */
export function getLiveOccupancy(baseOccupied = 76): { occupied_rooms: number; occupancy_pct: number } {
  if (typeof window === 'undefined') {
    return { occupied_rooms: baseOccupied, occupancy_pct: Math.round((baseOccupied / 84) * 1000) / 10 }
  }
  try {
    const activeBookings: any[] = JSON.parse(localStorage.getItem('resort_active_bookings') || '[]')
    const activeChaos: any = JSON.parse(localStorage.getItem('resort_active_chaos') || 'null')
    const checkedOut: string[] = JSON.parse(localStorage.getItem('resort_checked_out_guests') || '[]')

    const totalRosterCount = 5 + activeBookings.length
    const checkedOutCount = checkedOut.length
    const activeInHouseCount = Math.max(0, totalRosterCount - checkedOutCount)
    const activeRatio = totalRosterCount > 0 ? (activeInHouseCount / totalRosterCount) : 0

    const addedRooms = activeBookings.reduce(
      (sum, b) => sum + Math.max(1, Math.ceil((b.party_size || 2) / 2)),
      0
    )

    const isWeddingRush = activeChaos?.scenarioId === 'wedding_rush'
    const base = (baseOccupied && baseOccupied > 40) ? baseOccupied : 76

    const occupied_rooms = isWeddingRush
      ? 80
      : (activeInHouseCount === 0 ? 0 : Math.min(84, Math.max(1, Math.round(base * activeRatio) + addedRooms)))

    const occupancy_pct = isWeddingRush
      ? 96.0
      : (activeInHouseCount === 0 ? 0.0 : Math.min(99.0, Math.round((occupied_rooms / 84) * 1000) / 10))

    return { occupied_rooms, occupancy_pct }
  } catch {
    return { occupied_rooms: baseOccupied, occupancy_pct: Math.round((baseOccupied / 84) * 1000) / 10 }
  }
}

// Static defaults — no Date.now() or Math.random() to prevent SSR mismatch
const DEFAULT_KPIS: KPIs = {
  occupancy_pct: 85.7, occupied_rooms: 72, staff_on_duty: 28,
  open_tasks: 6, sla_breaches: 0, decisions_today: 14,
  rupees_protected: 128500, guests_at_risk: 1, food_waste_pct: 4.2,
  reviews_prevented: 3,
}

const DEFAULT_CLOCK: ClockState = {
  sim_now: '2026-01-01T00:00:00.000Z', speed: '10x',
  sim_minutes_per_tick: 30, paused: false, tick_count: 0,
}

function toMap<T extends { id: number | string }>(arr: T[]): Record<number | string, T> {
  return Object.fromEntries((arr || []).map(item => [item.id, item]))
}

export const useResortStore = create<ResortStore>()(
  subscribeWithSelector((set, get) => ({
    connectionStatus: 'disconnected',
    setConnectionStatus: (s) => set({ connectionStatus: s }),

    zones: {}, staff: {}, tasks: {}, guests: {}, assets: {},
    inventory: {}, slots: {}, agents: {}, segments: [], alerts: [],
    events: [], decisions: [],
    kpis: DEFAULT_KPIS,
    clock: DEFAULT_CLOCK,
    stress_index: 68,
    stress_trend: [58, 62, 54, 68, 60, 64, 68],
    weather: { temp: 28, condition: 'Partly Cloudy' },
    theme: 'white',
    setTheme: (t) => set({ theme: t }),

    /**
     * Client-only: reads localStorage checked-out guests and adjusts occupancy.
     * Called after checkout events; never called during SSR.
     */
    recomputeLiveOccupancy: () => {
      if (typeof window === 'undefined') return
      set(state => {
        const live = getLiveOccupancy(state.kpis?.occupied_rooms ?? 76)
        return {
          kpis: {
            ...state.kpis,
            occupied_rooms: live.occupied_rooms,
            occupancy_pct: live.occupancy_pct,
          }
        }
      })
    },

    setClock: (c) => set(s => ({ clock: { ...s.clock, ...c } })),

    applySnapshot: (state, sim_ts) => {
      set(current => {
        const incomingKpis = (state.kpis as KPIs) || current.kpis || DEFAULT_KPIS
        // Use backend occupancy directly — do NOT apply localStorage here (SSR-unsafe)
        return {
          zones:     toMap((state.zones as Zone[]) || []),
          staff:     toMap((state.staff as Staff[]) || []),
          tasks:     toMap((state.tasks as Task[]) || []),
          guests:    toMap((state.guests as Guest[]) || []),
          assets:    toMap((state.assets as Asset[]) || []),
          inventory: toMap((state.inventory as InventoryItem[]) || []),
          slots:     toMap((state.slots as ServiceSlot[]) || []),
          agents:    Object.fromEntries(
            ((state.agents as AgentStatus[]) || []).map(a => [a.name, a])
          ),
          kpis:      incomingKpis,
          decisions: (state.decisions as Decision[]) || [],
          events:    (state.events as ResortEvent[]) || [],
          segments:  (state.segments as unknown[]) || [],
          alerts:    (state.alerts as unknown[]) || [],
          stress_index: (state.stress_index as number) ?? 68,
          stress_trend: (state.stress_trend as number[]) ?? [58, 62, 54, 68, 60, 64, 68],
          weather: (state.weather as { temp: number; condition: string }) ?? { temp: 28, condition: 'Partly Cloudy' },
          clock:     (state.clock as ClockState) || DEFAULT_CLOCK,
        }
      })
    },

    applyPatch: (paths, sim_ts) => {
      set(state => {
        const updates: Partial<ResortStore> = {}

        for (const [path, value] of Object.entries(paths)) {
          if (path === 'clock') {
            updates.clock = value as ClockState
            continue
          }
          if (path === 'stress_index') {
            updates.stress_index = value as number
            continue
          }
          if (path === 'stress_trend') {
            updates.stress_trend = value as number[]
            continue
          }
          if (path === 'weather') {
            updates.weather = value as { temp: number; condition: string }
            continue
          }
          if (path.startsWith('kpis.')) {
            const key = path.slice(5) as keyof KPIs
            updates.kpis = { ...(updates.kpis || state.kpis), [key]: value }
            continue
          }
          // Entity patches: zones.3.workload_index → zones[3].workload_index
          const parts = path.split('.')
          if (parts.length >= 3) {
            const [entity, id, field] = parts
            const collection = entity as keyof ResortStore
            const entityMap = (updates[collection] || state[collection]) as Record<string, unknown>
            if (entityMap && id in entityMap) {
              const updated = { ...(entityMap[id] as Record<string, unknown>), [field]: value }
              updates[collection] = { ...entityMap, [id]: updated } as never
            }
          }
        }

        // DO NOT call getLiveOccupancy here — this runs during patch application
        // which may happen server-side. recomputeLiveOccupancy() is triggered
        // client-side via window event listeners below.

        return updates
      })
    },

    addEvents: (newEvents) => {
      set(state => ({
        events: [...newEvents, ...state.events].slice(0, 200)
      }))
    },

    addDecisions: (newDecisions) => {
      set(state => {
        const existing = new Set(state.decisions.map(d => d.id))
        const fresh = newDecisions.filter(d => !existing.has(d.id))
        return { decisions: [...fresh, ...state.decisions].slice(0, 500) }
      })
    },
  }))
)

// -----------------------------------------------------------------------
// Client-only: sync occupancy after guest checkouts / bookings / chaos.
// These listeners are only registered in the browser — never during SSR.
// -----------------------------------------------------------------------
if (typeof window !== 'undefined') {
  const handleOccupancySync = () => {
    useResortStore.getState().recomputeLiveOccupancy()
  }
  window.addEventListener('resort-guest-checkout', handleOccupancySync)
  window.addEventListener('storage', handleOccupancySync)
  window.addEventListener('resort-active-bookings-change', handleOccupancySync)
  window.addEventListener('resort-chaos-change', handleOccupancySync)
}
