'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useResortStore } from './store'

export interface LiveMetrics {
  occupancyPct: number
  occupiedRooms: number
  staffOnDuty: number
  openTasks: number
  slaBreaches: number
  decisionsToday: number
  rupeesProtected: number
  guestsAtRisk: number
  foodWastePct: number
  activeInHouseCount: number
  checkedOutCount: number
  totalRosterCount: number
  activeBookingsCount: number
  isWeddingRush: boolean
  isStaffShortage: boolean
  mounted: boolean
}

export function useLiveMetrics(): LiveMetrics {
  const { kpis } = useResortStore()
  const [activeBookings, setActiveBookings] = useState<any[]>([])
  const [activeChaos, setActiveChaos] = useState<any>(null)
  const [checkedOutCount, setCheckedOutCount] = useState<number>(0)
  const [mounted, setMounted] = useState(false)

  const sync = useCallback(() => {
    if (typeof window === 'undefined') return
    try {
      const b = JSON.parse(localStorage.getItem('resort_active_bookings') || '[]')
      setActiveBookings(Array.isArray(b) ? b : [])
    } catch {}
    try {
      const c = JSON.parse(localStorage.getItem('resort_active_chaos') || 'null')
      setActiveChaos(c)
    } catch {}
    try {
      const co = JSON.parse(localStorage.getItem('resort_checked_out_guests') || '[]')
      setCheckedOutCount(Array.isArray(co) ? co.length : 0)
    } catch {}
  }, [])

  useEffect(() => {
    setMounted(true)
    sync()
    window.addEventListener('storage', sync)
    window.addEventListener('resort-chaos-change', sync)
    window.addEventListener('resort-active-bookings-change', sync)
    window.addEventListener('resort-guest-checkout', sync)

    // Polling interval to catch any cross-component state updates
    const interval = setInterval(sync, 1000)

    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('resort-chaos-change', sync)
      window.removeEventListener('resort-active-bookings-change', sync)
      window.removeEventListener('resort-guest-checkout', sync)
      clearInterval(interval)
    }
  }, [sync])

  const isWeddingRush = activeChaos?.scenarioId === 'wedding_rush'
  const isStaffShortage = activeChaos?.scenarioId === 'staff_shortage'

  // Additional rooms demanded by user-created personalized bookings (e.g. party_size = 90)
  const addedRoomsFromUser = useMemo(() => {
    return activeBookings.reduce((sum, b) => {
      const pSize = Number(b.party_size || b.guests || 2)
      // 2 guests per room, with a minimum of 1 room per booking
      return sum + Math.max(1, Math.ceil(pSize / 2))
    }, 0)
  }, [activeBookings])

  const addedRevFromUser = useMemo(() => {
    return activeBookings.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0)
  }, [activeBookings])

  // Total roster: base in-house guests (5) + any personalized bookings created by user
  const totalRosterCount = 5 + activeBookings.length
  const activeInHouseCount = Math.max(0, totalRosterCount - checkedOutCount)
  const activeRatio = totalRosterCount > 0 ? activeInHouseCount / totalRosterCount : 0

  // Base occupied rooms from live backend or 76 (standard 5-star resort baseline out of 84)
  const baseOccupied = (kpis?.occupied_rooms && kpis.occupied_rooms > 40) ? kpis.occupied_rooms : 76

  // Real-time occupied rooms
  const occupiedRooms = useMemo(() => {
    if (isWeddingRush) return 80
    // If all guests have been checked out
    if (activeInHouseCount === 0) return 0
    // Proportional rooms from roster + any user booked rooms
    const baseCalc = Math.round(baseOccupied * activeRatio)
    const total = baseCalc + addedRoomsFromUser
    return Math.min(84, Math.max(1, total))
  }, [isWeddingRush, activeInHouseCount, baseOccupied, activeRatio, addedRoomsFromUser])

  // Real-time occupancy percentage
  const occupancyPct = useMemo(() => {
    if (isWeddingRush) return 96.0
    if (activeInHouseCount === 0) return 0.0
    const pct = (occupiedRooms / 84) * 100
    return Math.min(100.0, Math.round(pct * 10) / 10)
  }, [isWeddingRush, activeInHouseCount, occupiedRooms])

  // Staff on duty
  const staffOnDuty = useMemo(() => {
    if (activeInHouseCount === 0) return 12 // standby crew
    if (isStaffShortage) return 18
    if (isWeddingRush) return 40
    return kpis?.staff_on_duty && kpis.staff_on_duty > 0 ? kpis.staff_on_duty : 33
  }, [activeInHouseCount, isStaffShortage, isWeddingRush, kpis?.staff_on_duty])

  // Open tasks
  const openTasks = useMemo(() => {
    if (activeInHouseCount === 0) return 3 // turnaround sanitization
    if (isWeddingRush) return 24
    return kpis?.open_tasks && kpis.open_tasks > 0 ? kpis.open_tasks : 8
  }, [activeInHouseCount, isWeddingRush, kpis?.open_tasks])

  const slaBreaches = useMemo(() => {
    if (activeInHouseCount === 0) return 0
    return kpis?.sla_breaches ?? 0
  }, [activeInHouseCount, kpis?.sla_breaches])

  // AI Decisions today
  const decisionsToday = useMemo(() => {
    const base = kpis?.decisions_today && kpis.decisions_today > 0 ? kpis.decisions_today : 21
    return base + (activeBookings.length * 2) + checkedOutCount
  }, [kpis?.decisions_today, activeBookings.length, checkedOutCount])

  // Protected revenue
  const rupeesProtected = useMemo(() => {
    const baseRev = kpis?.rupees_protected && kpis.rupees_protected > 0 ? kpis.rupees_protected : 342000
    return baseRev + Math.round(addedRevFromUser * 0.15)
  }, [kpis?.rupees_protected, addedRevFromUser])

  const guestsAtRisk = useMemo(() => {
    if (activeInHouseCount === 0) return 0
    return kpis?.guests_at_risk ?? 0
  }, [activeInHouseCount, kpis?.guests_at_risk])

  const foodWastePct = useMemo(() => {
    if (activeInHouseCount === 0) return 1.5
    return kpis?.food_waste_pct && kpis.food_waste_pct > 0 ? kpis.food_waste_pct : 4.2
  }, [activeInHouseCount, kpis?.food_waste_pct])

  return {
    occupancyPct,
    occupiedRooms,
    staffOnDuty,
    openTasks,
    slaBreaches,
    decisionsToday,
    rupeesProtected,
    guestsAtRisk,
    foodWastePct,
    activeInHouseCount,
    checkedOutCount,
    totalRosterCount,
    activeBookingsCount: activeBookings.length,
    isWeddingRush,
    isStaffShortage,
    mounted
  }
}
