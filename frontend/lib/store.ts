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
  setClock: (c: Partial<ClockState>) => void
  applySnapshot: (state: Record<string, unknown>, sim_ts: string) => void
  applyPatch: (paths: Record<string, unknown>, sim_ts: string) => void
  addEvents: (events: ResortEvent[]) => void
  addDecisions: (decisions: Decision[]) => void
}

const DEFAULT_KPIS: KPIs = {
  occupancy_pct: 0, occupied_rooms: 0, staff_on_duty: 0,
  open_tasks: 0, sla_breaches: 0, decisions_today: 0,
  rupees_protected: 0, guests_at_risk: 0, food_waste_pct: 4.2,
  reviews_prevented: 0,
}

const DEFAULT_CLOCK: ClockState = {
  sim_now: new Date().toISOString(), speed: '10x',
  sim_minutes_per_tick: 30, paused: false, tick_count: 0,
}

function toMap<T extends { id: number | string }>(arr: T[]): Record<number | string, T> {
  return Object.fromEntries((arr || []).map(item => [item.id, item]))
}

/** Apply a dot-notation patch path to a nested object */
function setPath(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const parts = path.split('.')
  if (parts.length === 1) return { ...obj, [path]: value }
  const [head, ...rest] = parts
  const nested = (obj[head] as Record<string, unknown>) || {}
  return { ...obj, [head]: setPath(nested, rest.join('.'), value) }
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

    setClock: (c) => set(s => ({ clock: { ...s.clock, ...c } })),

    applySnapshot: (state, sim_ts) => {
      set({
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
        decisions: (state.decisions as Decision[]) || [],
        events:    (state.events as ResortEvent[]) || [],
        segments:  (state.segments as unknown[]) || [],
        alerts:    (state.alerts as unknown[]) || [],
        stress_index: (state.stress_index as number) ?? 68,
        stress_trend: (state.stress_trend as number[]) ?? [58, 62, 54, 68, 60, 64, 68],
        weather: (state.weather as { temp: number; condition: string }) ?? { temp: 28, condition: 'Partly Cloudy' },
        clock:     (state.clock as ClockState) || DEFAULT_CLOCK,
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
