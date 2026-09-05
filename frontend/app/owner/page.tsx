'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useResortStore, Zone } from '@/lib/store'
import { formatRupees } from '@/lib/format'
import { API_URL } from '@/lib/api'
import { toOwnerLanguage, isPendingApprovalItem, executeDecisionApproval } from '@/lib/owner-language'
import { 
  CloudSun, CloudRain, AlertTriangle, CheckCircle2, 
  ArrowUpRight, ArrowDownRight, Clock, FileText, 
  Check, X, Sparkles, Zap, Bell, ShieldAlert,
  Flame, Building2, Users, UserCheck, Package, ShoppingCart,
  Plus, Minus, RefreshCw, Layers
} from 'lucide-react'
import { useOwnerTheme } from '@/lib/owner-theme'
import Retro8BitcnWidget from '@/components/Retro8BitcnWidget'


interface AlertItem {
  id: string
  title: string
  line: string
  severity: 'high' | 'medium' | 'info' | 'low'
  time: string
  zone: string
  recommendedAction: string
  department?: string
}

interface VisualPin {
  id: string | number
  name: string
  subtitle: string
  x: number // percentage (0-100)
  y: number // percentage (0-100)
  load: number
  status: string
  statusType: 'calm' | 'busy' | 'stretched' | 'hotel'
  isKeyHub: boolean
  isHotel?: boolean
  description: string
  staffOnDuty: number
  staffNeeded: number
  activeRequests: number
  department: string
}

interface RestockItem {
  id: string
  name: string
  category: 'Restaurant & Kitchen' | 'Housekeeping' | 'Bar & Spa'
  unit: string
  onHand: number
  parLevel: number
  recommendedQty: number
  orderQty: number
  unitPrice: number
  supplier: string
  daysOfCover: number
}

const INITIAL_RESTOCK_ITEMS: RestockItem[] = [
  {
    id: 'restock-surmai',
    name: 'Fresh King Fish (Surmai)',
    category: 'Restaurant & Kitchen',
    unit: 'kg',
    onHand: 8.5,
    parLevel: 25.0,
    recommendedQty: 16.5,
    orderQty: 16.5,
    unitPrice: 650,
    supplier: 'Alibaug Fresh Catch Harbor',
    daysOfCover: 1.8,
  },
  {
    id: 'restock-paneer',
    name: 'Fresh Artisan Malai Paneer',
    category: 'Restaurant & Kitchen',
    unit: 'kg',
    onHand: 5.0,
    parLevel: 18.0,
    recommendedQty: 13.0,
    orderQty: 13.0,
    unitPrice: 380,
    supplier: 'Sahyadri Artisan Dairy',
    daysOfCover: 1.6,
  },
  {
    id: 'restock-mangoes',
    name: 'GI Alphonso Mangoes (Grade A)',
    category: 'Restaurant & Kitchen',
    unit: 'crates',
    onHand: 4.0,
    parLevel: 15.0,
    recommendedQty: 11.0,
    orderQty: 11.0,
    unitPrice: 1400,
    supplier: 'Konkan Certified Orchards',
    daysOfCover: 1.5,
  },
  {
    id: 'restock-rice',
    name: 'Aged Long-Grain Basmati Rice',
    category: 'Restaurant & Kitchen',
    unit: '25kg bag',
    onHand: 4.0,
    parLevel: 10.0,
    recommendedQty: 6.0,
    orderQty: 6.0,
    unitPrice: 2200,
    supplier: 'Punjab Royal Heritage',
    daysOfCover: 2.2,
  },
  {
    id: 'restock-towels',
    name: 'Organic Cotton Pool Towels',
    category: 'Housekeeping',
    unit: 'pcs',
    onHand: 180.0,
    parLevel: 250.0,
    recommendedQty: 70.0,
    orderQty: 70.0,
    unitPrice: 450,
    supplier: 'Bombay Fine Textiles',
    daysOfCover: 2.4,
  },
  {
    id: 'restock-linen',
    name: '500-TC Egyptian Cotton Bed Sets',
    category: 'Housekeeping',
    unit: 'sets',
    onHand: 16.0,
    parLevel: 40.0,
    recommendedQty: 24.0,
    orderQty: 24.0,
    unitPrice: 1850,
    supplier: 'Imperial Luxury Linens',
    daysOfCover: 2.1,
  },
  {
    id: 'restock-amenities',
    name: 'Botanical Shower & Bath Care',
    category: 'Housekeeping',
    unit: '5L refill',
    onHand: 4.0,
    parLevel: 12.0,
    recommendedQty: 8.0,
    orderQty: 8.0,
    unitPrice: 1200,
    supplier: 'Forest Herbs Eco-Amenities',
    daysOfCover: 1.9,
  },
  {
    id: 'restock-gin',
    name: 'Jaisalmer Craft Indian Gin',
    category: 'Bar & Spa',
    unit: 'bottles',
    onHand: 14.0,
    parLevel: 20.0,
    recommendedQty: 6.0,
    orderQty: 6.0,
    unitPrice: 2800,
    supplier: 'Artisanal Spirits Ltd',
    daysOfCover: 3.2,
  },
  {
    id: 'restock-spa-oil',
    name: 'Dhanwantharam Herbal Spa Oil',
    category: 'Bar & Spa',
    unit: 'litres',
    onHand: 6.2,
    parLevel: 12.0,
    recommendedQty: 5.8,
    orderQty: 6.0,
    unitPrice: 1200,
    supplier: 'Kerala Ayurvedic Sanctuary',
    daysOfCover: 3.5,
  }
]

export default function OwnerDashboardPage() {
  const { 
    clock, kpis, zones, staff, tasks, 
    decisions, stress_index, stress_trend, weather 
  } = useResortStore()
  const { theme, toggleTheme, is8Bit } = useOwnerTheme()

  // Modal states for middle-of-screen popup
  const [activeModalAlert, setActiveModalAlert] = useState<AlertItem | null>(null)
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null)
  const [selectedPinDetails, setSelectedPinDetails] = useState<VisualPin | null>(null)
  const [showHotelAggregateModal, setShowHotelAggregateModal] = useState(false)
  const [selectedScenario, setSelectedScenario] = useState('98% Occupancy — evening peak')
  const [simulationResult, setSimulationResult] = useState<string | null>(null)
  const [simulating, setSimulating] = useState(false)
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set())
  const [applying, setApplying] = useState(false)
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Set<string>>(new Set())
  const [pinFilter, setPinFilter] = useState<'all' | 'key'>('key')
  const [showStaffOverlay, setShowStaffOverlay] = useState(true)
  const [extraStaffBoost, setExtraStaffBoost] = useState<Record<string, number>>({})

  // ── Inventory / Restock State ──
  const [showInventoryModal, setShowInventoryModal] = useState(false)
  const [inventoryCategory, setInventoryCategory] = useState<'all' | 'Restaurant & Kitchen' | 'Housekeeping' | 'Bar & Spa'>('all')
  const [restockItems, setRestockItems] = useState<RestockItem[]>(INITIAL_RESTOCK_ITEMS)
  const [showOnlyPending, setShowOnlyPending] = useState(true)
  const [orderSubmitted, setOrderSubmitted] = useState(false)
  const [escalatedAlerts, setEscalatedAlerts] = useState<AlertItem[]>([])

  // ── 1. Simulated Date & Greeting ──
  const simDate = useMemo(() => {
    try {
      const d = new Date(clock?.sim_now || Date.now())
      return {
        formatted: d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) + ' • ' +
                   d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        hour: d.getHours(),
      }
    } catch {
      return { formatted: 'May 15, 2026 • 7:45 PM', hour: 19 }
    }
  }, [clock?.sim_now])

  const greeting = useMemo(() => {
    const h = simDate.hour
    if (h < 12) return 'Good morning, Manager 👋'
    if (h < 17) return 'Good afternoon, Manager 👋'
    return 'Good evening, Manager 👋'
  }, [simDate.hour])

  // ── Live Active Bookings (from /guests) & Active Chaos (from /simulate) & Checkouts ──
  const [activeBookings, setActiveBookings] = useState<any[]>([])
  const [activeChaos, setActiveChaos] = useState<any>(null)
  const [checkedOutCount, setCheckedOutCount] = useState<number>(0)

  useEffect(() => {
    const syncLocal = () => {
      try {
        const b = JSON.parse(localStorage.getItem('resort_active_bookings') || '[]')
        setActiveBookings(b)
      } catch {}
      try {
        const c = JSON.parse(localStorage.getItem('resort_active_chaos') || 'null')
        setActiveChaos(c)
      } catch {}
      try {
        const co = JSON.parse(localStorage.getItem('resort_checked_out_guests') || '[]')
        setCheckedOutCount(co.length)
      } catch {}
    }
    syncLocal()
    window.addEventListener('storage', syncLocal)
    window.addEventListener('resort-chaos-change', syncLocal)
    window.addEventListener('resort-active-bookings-change', syncLocal)
    window.addEventListener('resort-guest-checkout', syncLocal)
    return () => {
      window.removeEventListener('storage', syncLocal)
      window.removeEventListener('resort-chaos-change', syncLocal)
      window.removeEventListener('resort-active-bookings-change', syncLocal)
      window.removeEventListener('resort-guest-checkout', syncLocal)
    }
  }, [])

  // User added bookings from /guests
  const addedRoomsFromUser = useMemo(() => {
    return activeBookings.reduce((sum, b) => sum + Math.max(1, Math.ceil((b.party_size || 2) / 2)), 0)
  }, [activeBookings])

  const addedRevFromUser = useMemo(() => {
    return activeBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0)
  }, [activeBookings])

  // Chaos effects
  const isWeddingRush = activeChaos?.scenarioId === 'wedding_rush'
  const isStaffShortage = activeChaos?.scenarioId === 'staff_shortage'
  const isMonsoon = activeChaos?.scenarioId === 'monsoon_storm'
  const isChiller = activeChaos?.scenarioId === 'chiller_failure'
  const isVip = activeChaos?.scenarioId === 'vip_critical'

  // Occupied rooms & occupancy pct:
  // Base from backend (or fallback to healthy 76 rooms) - minus real-time checkouts
  const baseOccupied = (kpis?.occupied_rooms && kpis.occupied_rooms > 40) ? kpis.occupied_rooms : 76
  const chaosRoomBoost = isWeddingRush ? 6 : 0
  const occupiedRooms = Math.min(84, Math.max(0, baseOccupied + addedRoomsFromUser + chaosRoomBoost - checkedOutCount))
  const occPct = isWeddingRush ? 98 : Math.min(99, Math.round((occupiedRooms / 84) * 100))

  const staffList = Object.values(staff || {})
  const staffLoad = useMemo(() => {
    if (isStaffShortage) return 92
    if (isWeddingRush) return 88
    if (staffList.length === 0) return 74
    const total = staffList.reduce((acc, s) => acc + (s.utilisation_pct || 72), 0)
    return Math.min(96, Math.max(72, Math.round(total / staffList.length)))
  }, [staffList, isStaffShortage, isWeddingRush])

  const staffAvailable = useMemo(() => {
    if (isStaffShortage) return 4
    if (isWeddingRush) return 8
    const count = staffList.filter(s => s.status === 'idle').length
    return count > 0 ? Math.min(18, count) : 12
  }, [staffList, isStaffShortage, isWeddingRush])

  const taskList = Object.values(tasks || {})
  const avgWaitMin = useMemo(() => {
    if (isStaffShortage) return 22
    if (isWeddingRush) return 15
    if (taskList.length === 0) return 10
    const totalMin = taskList.reduce((acc, t) => acc + (t.sla_minutes ? Math.round(t.sla_minutes / 2.5) : 10), 0)
    return Math.max(8, Math.round(totalMin / taskList.length))
  }, [taskList, isStaffShortage, isWeddingRush])

  const revenueToday = useMemo(() => {
    const baseRev = (occupiedRooms * 8500) + 194000
    const chaosRev = isWeddingRush ? 385000 : 0
    return baseRev + addedRevFromUser + chaosRev
  }, [occupiedRooms, addedRevFromUser, isWeddingRush])

  // ── 3. Exact Alerts Specified by User + Live Guest Escalations ──
  const rawAlerts: AlertItem[] = [
    {
      id: 'alt-pool',
      title: 'Swimming Pool Maintenance Notice',
      severity: 'high',
      line: 'Water circulation pump flow low. Scheduled inspection advised within 4 hours.',
      time: '7 min ago',
      zone: 'Swimming Pool & Deck',
      recommendedAction: 'Dispatch maintenance technician to inspect circulation valve and clean secondary filter.'
    },
    {
      id: 'alt-restaurant',
      title: 'Mandwa Restaurant Demand Rising',
      severity: 'medium',
      line: 'Dinner dining tables at 86% capacity. Reallocate 2 staff for 7 PM - 10 PM.',
      time: '15 min ago',
      zone: 'Mandwa Dining & Bar',
      recommendedAction: 'Reassign 2 idle staff from North Villas to dining room floor.'
    },
    {
      id: 'alt-turn-down',
      title: 'Housekeeping Evening Turn-Down',
      severity: 'info',
      line: '32 rooms scheduled for evening service. Turn-down running 5 minutes ahead.',
      time: '18 min ago',
      zone: 'Guest Villas & Suites',
      recommendedAction: 'Confirm guest turn-down completion check for Block C suites.'
    },
    {
      id: 'alt-chiller',
      title: 'Kitchen Cold Storage Scheduled Check',
      severity: 'low',
      line: 'Routine preventive check due tomorrow 6:00 AM. Zero guest rooms affected.',
      time: '25 min ago',
      zone: 'Kitchen Cold Storage',
      recommendedAction: 'Verify backup cooling compressor operational before morning shift.'
    },
  ]

  const alertItems = [...escalatedAlerts, ...rawAlerts].filter(a => !acknowledgedAlerts.has(a.id))

  // ── 4. Highest-Value Recommendation ──
  const topRecommendation = useMemo(() => {
    const list = decisions
      .filter(d => isPendingApprovalItem(d as unknown as Record<string, unknown>, approvedIds))
      .sort((a, b) => b.rupee_impact - a.rupee_impact)

    if (list.length > 0) {
      const best = list[0]
      return {
        id: best.id,
        title: toOwnerLanguage(best),
        rupees: best.rupee_impact,
        impactLine: `Estimated wait reduction: 7 minutes • Protects ${formatRupees(best.rupee_impact)}`,
      }
    }

    return {
      id: 'rec-default',
      title: 'Add 2 housekeeping staff in evening shift',
      rupees: 42000,
      impactLine: 'Estimated wait reduction: 7 minutes • Protects ₹42,000 in guest satisfaction',
    }
  }, [decisions, approvedIds])

  const handleApplyRecommendation = async () => {
    setApplying(true)
    const recTitleLower = topRecommendation.title.toLowerCase()
    const targetZone = (recTitleLower.includes('dining') || recTitleLower.includes('restaurant') || recTitleLower.includes('mandwa') || recTitleLower.includes('sagar'))
      ? 'sagar-restaurant'
      : (recTitleLower.includes('pool') || recTitleLower.includes('pump') || recTitleLower.includes('water'))
      ? 'swimming-pool'
      : (recTitleLower.includes('villa') || recTitleLower.includes('housekeeping') || recTitleLower.includes('turn-down'))
      ? 'villa-zone-a'
      : 'hotel-main'

    const riskReduction = '65% → 22%'
    const loadReduction = 'Workload balanced • Service wait reduced 7m'
    const staffAlloc = 2

    // Apply immediate visual pin override so dashboard updates in real time
    setPinOverrides(prev => ({
      ...prev,
      [targetZone]: {
        load: targetZone === 'swimming-pool' ? 24 : targetZone === 'sagar-restaurant' ? 52 : 36,
        status: 'Optimal',
        statusType: 'calm',
        subtitle: `${targetZone === 'sagar-restaurant' ? 16 : 12} Staff Working • Recommendation Applied (Calm)`
      }
    }))

    const dispatchRecord = {
      id: `disp-rec-${Date.now()}`,
      alertId: topRecommendation.id,
      actionName: topRecommendation.title,
      department: 'Operations & Guest Experience',
      targetZone: targetZone,
      riskReduction: riskReduction,
      loadReduction: loadReduction,
      details: topRecommendation.impactLine,
      timestamp: new Date().toISOString(),
      staffAllocated: staffAlloc,
      status: 'completed'
    }

    if (typeof window !== 'undefined') {
      try {
        const existing = JSON.parse(localStorage.getItem('resort_dispatched_operations') || '[]')
        localStorage.setItem('resort_dispatched_operations', JSON.stringify([
          dispatchRecord,
          ...existing.filter((x: any) => x.id !== dispatchRecord.id && x.actionName !== dispatchRecord.actionName)
        ]))
        window.dispatchEvent(new Event('storage'))
      } catch (e) {
        console.warn('localStorage error', e)
      }
    }

    try {
      await executeDecisionApproval(topRecommendation.id)
      setApprovedIds(prev => new Set([...prev, topRecommendation.id]))

      // Broadcast to backend in real-time
      await fetch(`${API_URL}/api/resort/dispatch-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert_id: topRecommendation.id,
          action_name: topRecommendation.title,
          department: 'Operations & Guest Experience',
          target_zone: targetZone,
          risk_reduction: riskReduction,
          load_reduction: loadReduction,
          details: topRecommendation.impactLine,
          staff_allocated: staffAlloc,
          rupee_impact: topRecommendation.rupees || 42000.0
        })
      })
    } catch (e) {
      console.warn('Real-time backend recommendation dispatch error:', e)
      setApprovedIds(prev => new Set([...prev, topRecommendation.id]))
    } finally {
      setApplying(false)
    }
  }

  // ── 5. What-If Simulator Action ──
  const handleRunSimulation = () => {
    setSimulating(true)
    setTimeout(() => {
      setSimulating(false)
      if (selectedScenario.includes('98% Occupancy')) {
        setSimulationResult('Projected Revenue: +₹1,85,000 • Staff Needed: +4 servers at Mandwa • Guest Wait: 14 min')
      } else if (selectedScenario.includes('Monsoon Storm')) {
        setSimulationResult('Poolside closed • Shifted to Sunset Lounge • Lounge Spend: +₹54,000 • Zero safety incidents')
      } else {
        setSimulationResult('Backup Chiller engaged • Serviced 6 AM • ₹0 food loss • Zero guest disruption')
      }
    }, 500)
  }

  // ── 6. Seven-Day Stress Trend & Index ──
  const currentStress = useMemo(() => {
    if (isChiller) return 85
    if (isWeddingRush) return 86
    if (isStaffShortage) return 82
    if (isMonsoon) return 78
    if (isVip) return 76
    return Math.max(58, stress_index || 68)
  }, [isChiller, isWeddingRush, isStaffShortage, isMonsoon, isVip, stress_index])

  const trendPoints = useMemo(() => {
    const base = stress_trend && stress_trend.length >= 6 ? [...stress_trend] : [58, 62, 54, 68, 60, 64]
    return [...base.slice(0, 6), currentStress]
  }, [stress_trend, currentStress])

  const stressLevel = currentStress > 75 ? 'HIGH' : currentStress > 50 ? 'MODERATE' : 'CALM'

  // ── 7. Aggregated Hotel Calculation ──
  const hotelAggregatedStats = useMemo(() => {
    const zoneWeights = [
      { name: 'Villa Zone A (North Ocean)', load: 61, weight: 0.18, staff: 12 + (extraStaffBoost['villa-zone-a'] || 0), guests: 48, status: 'Busy', department: 'Housekeeping & Butler' },
      { name: 'Villa Zone B (South Garden)', load: 35, weight: 0.14, staff: 8 + (extraStaffBoost['villa-zone-b'] || 0), guests: 26, status: 'Calm', department: 'Housekeeping' },
      { name: 'Sagar / Mandwa Restaurant', load: 86, weight: 0.16, staff: 14 + (extraStaffBoost['sagar-restaurant'] || 0), guests: 64, status: 'High Demand', department: 'Food & Beverage' },
      { name: 'Main Swimming Pool', load: 82, weight: 0.12, staff: 4 + (extraStaffBoost['swimming-pool'] || 0), guests: 38, status: 'Attention', department: 'Lifeguard & Maintenance' },
      { name: 'Sunset Lounge Bar', load: 42, weight: 0.10, staff: 5 + (extraStaffBoost['sunset-lounge'] || 0), guests: 22, status: 'Calm', department: 'Beverage & Service' },
      { name: 'Ananda Spa & Wellness', load: 18, weight: 0.08, staff: 6 + (extraStaffBoost['ananda-spa'] || 0), guests: 9, status: 'Calm', department: 'Therapists & Wellness' },
      { name: 'Mahal Banquet & Lawns', load: 30, weight: 0.12, staff: 7 + (extraStaffBoost['mahal-banquet'] || 0), guests: 16, status: 'Calm', department: 'Events & Banqueting' },
      { name: 'Water Sports Jetty', load: 25, weight: 0.10, staff: 4 + (extraStaffBoost['water-sports-jetty'] || 0), guests: 12, status: 'Calm', department: 'Marine Operations' },
    ]

    const calculatedAvgLoad = Math.round(
      zoneWeights.reduce((sum, z) => sum + (z.load * z.weight), 0)
    )

    const totalStaffCount = zoneWeights.reduce((sum, z) => sum + z.staff, 0)
    const totalActiveGuests = zoneWeights.reduce((sum, z) => sum + z.guests, 0)

    return {
      calculatedLoad: calculatedAvgLoad,
      status: calculatedAvgLoad > 75 ? 'Stretched' : calculatedAvgLoad > 50 ? 'Busy' : 'Optimal',
      totalStaffCount,
      totalActiveGuests,
      zones: zoneWeights,
      roomCount: 84,
      occupiedRooms: occupiedRooms,
      occupancyPct: occPct,
    }
  }, [occupiedRooms, occPct, extraStaffBoost])

  // ── 8. Visual Pins on the Aerial Resort Map ──
  const visualPins: VisualPin[] = useMemo(() => {
    return [
      {
        id: 'hotel-main',
        name: 'Main Hotel (Central Complex)',
        subtitle: `${hotelAggregatedStats.totalStaffCount} Staff Working • ${hotelAggregatedStats.calculatedLoad}% Total Load`,
        x: 48,
        y: 24,
        load: hotelAggregatedStats.calculatedLoad,
        status: hotelAggregatedStats.status,
        statusType: 'hotel',
        isKeyHub: true,
        isHotel: true,
        department: 'Executive Operations & Central Front Desk',
        description: `Central Resort Complex • Aggregated live metrics across all 8 zones (${hotelAggregatedStats.occupiedRooms}/84 rooms occupied, ${hotelAggregatedStats.totalStaffCount} personnel on active duty).`,
        staffOnDuty: hotelAggregatedStats.totalStaffCount,
        staffNeeded: 46,
        activeRequests: 4,
      },
      {
        id: 'villa-zone-a',
        name: 'Villa Zone A',
        subtitle: `${12 + (extraStaffBoost['villa-zone-a'] || 0)} Staff Working • 61% Load`,
        x: 34,
        y: 11,
        load: 61,
        status: 'Busy',
        statusType: 'busy',
        isKeyHub: true,
        department: 'Housekeeping, Butler & Concierge',
        description: 'Luxury beachfront villas with private plunge pools. High guest service requests.',
        staffOnDuty: 12 + (extraStaffBoost['villa-zone-a'] || 0),
        staffNeeded: 14,
        activeRequests: 3,
      },
      {
        id: 'sagar-restaurant',
        name: 'Sagar Restaurant',
        subtitle: `${14 + (extraStaffBoost['sagar-restaurant'] || 0)} Staff Working • 86% Demand`,
        x: 23,
        y: 22,
        load: 86,
        status: 'High Demand',
        statusType: 'stretched',
        isKeyHub: true,
        department: 'Food & Beverage Service & Kitchen',
        description: 'Multi-cuisine dining hall. Dinner tables at 86% capacity. Extra servers recommended.',
        staffOnDuty: 14 + (extraStaffBoost['sagar-restaurant'] || 0),
        staffNeeded: 16,
        activeRequests: 5,
      },
      {
        id: 'swimming-pool',
        name: 'Main Swimming Pool',
        subtitle: `${4 + (extraStaffBoost['swimming-pool'] || 0)} Staff Working • 82% Risk`,
        x: 60,
        y: 44,
        load: 82,
        status: 'Attention',
        statusType: 'stretched',
        isKeyHub: true,
        department: 'Lifeguards & Facility Technicians',
        description: 'Coastal freshwater lagoon pool. Water circulation pump flow low. Service team notified.',
        staffOnDuty: 4 + (extraStaffBoost['swimming-pool'] || 0),
        staffNeeded: 5,
        activeRequests: 2,
      },
      {
        id: 'sunset-lounge',
        name: 'Sunset Lounge Bar',
        subtitle: `${5 + (extraStaffBoost['sunset-lounge'] || 0)} Staff Working • 42% Load`,
        x: 58,
        y: 8,
        load: 42,
        status: 'Calm',
        statusType: 'calm',
        isKeyHub: true,
        department: 'Mixology & Lounge Stewards',
        description: 'Open-air panoramic cocktail terrace facing the ocean. Ambient sunset seating.',
        staffOnDuty: 5 + (extraStaffBoost['sunset-lounge'] || 0),
        staffNeeded: 5,
        activeRequests: 1,
      },
      {
        id: 'ananda-spa',
        name: 'Ananda Spa',
        subtitle: `${6 + (extraStaffBoost['ananda-spa'] || 0)} Staff Working • 18% Load`,
        x: 12,
        y: 34,
        load: 18,
        status: 'Calm',
        statusType: 'calm',
        isKeyHub: true,
        department: 'Ayurvedic Therapists & Reception',
        description: 'Ayurvedic wellness pavilion and massage suites. Smooth operations.',
        staffOnDuty: 6 + (extraStaffBoost['ananda-spa'] || 0),
        staffNeeded: 6,
        activeRequests: 0,
      },
      {
        id: 'mahal-banquet',
        name: 'Mahal Banquet Hall',
        subtitle: `${7 + (extraStaffBoost['mahal-banquet'] || 0)} Staff Working • 30% Load`,
        x: 80,
        y: 45,
        load: 30,
        status: 'Calm',
        statusType: 'calm',
        isKeyHub: true,
        department: 'Banquet Stewards & Event Techs',
        description: 'Grand event pavilion and beachfront celebration lawns.',
        staffOnDuty: 7 + (extraStaffBoost['mahal-banquet'] || 0),
        staffNeeded: 7,
        activeRequests: 1,
      },
      {
        id: 'water-sports-jetty',
        name: 'Water Sports Jetty',
        subtitle: `${4 + (extraStaffBoost['water-sports-jetty'] || 0)} Staff Working • Ocean Clear`,
        x: 91,
        y: 18,
        load: 25,
        status: 'Calm',
        statusType: 'calm',
        isKeyHub: true,
        department: 'Marine Skippers & Safety Instructors',
        description: 'Private pier for catamarans, jet-skis, and deep-sea diving charters.',
        staffOnDuty: 4 + (extraStaffBoost['water-sports-jetty'] || 0),
        staffNeeded: 4,
        activeRequests: 0,
      },
      {
        id: 'in-room-dining',
        name: 'In-Room Dining',
        subtitle: `${5 + (extraStaffBoost['in-room-dining'] || 0)} Staff Working • 44% Load`,
        x: 21,
        y: 7,
        load: 44,
        status: 'Calm',
        statusType: 'calm',
        isKeyHub: false,
        department: 'Villa Express Dispatch Kitchen',
        description: 'Dedicated room-service dispatch kitchen for private ocean villas.',
        staffOnDuty: 5 + (extraStaffBoost['in-room-dining'] || 0),
        staffNeeded: 5,
        activeRequests: 2,
      },
      {
        id: 'beach-shack',
        name: 'Beach Shack Grill',
        subtitle: `${4 + (extraStaffBoost['beach-shack'] || 0)} Staff Working • 52% Load`,
        x: 42,
        y: 7,
        load: 52,
        status: 'Busy',
        statusType: 'busy',
        isKeyHub: false,
        department: 'Grill Chefs & Beach Service',
        description: 'Casual open-flame seafood grill right on the sand.',
        staffOnDuty: 4 + (extraStaffBoost['beach-shack'] || 0),
        staffNeeded: 4,
        activeRequests: 1,
      },
      {
        id: 'water-park',
        name: 'Water Park & Kids Pool',
        subtitle: `${3 + (extraStaffBoost['water-park'] || 0)} Staff Working • 48% Load`,
        x: 35,
        y: 42,
        load: 48,
        status: 'Calm',
        statusType: 'calm',
        isKeyHub: false,
        department: 'Pool Attendants & Recreation',
        description: 'Splash pad and supervised children swimming zones.',
        staffOnDuty: 3 + (extraStaffBoost['water-park'] || 0),
        staffNeeded: 3,
        activeRequests: 0,
      },
      {
        id: 'indoor-games',
        name: 'Indoor Games Room',
        subtitle: `${2 + (extraStaffBoost['indoor-games'] || 0)} Staff Working • 32% Load`,
        x: 62,
        y: 76,
        load: 32,
        status: 'Calm',
        statusType: 'calm',
        isKeyHub: false,
        department: 'Recreation Attendants',
        description: 'Billiards, arcade, table tennis and family lounge.',
        staffOnDuty: 2 + (extraStaffBoost['indoor-games'] || 0),
        staffNeeded: 2,
        activeRequests: 0,
      },
      {
        id: 'cycle-rental',
        name: 'Cycle & Buggy Rental',
        subtitle: `${3 + (extraStaffBoost['cycle-rental'] || 0)} Staff Working • 8 Available`,
        x: 25,
        y: 92,
        load: 28,
        status: 'Calm',
        statusType: 'calm',
        isKeyHub: false,
        department: 'Mobility Fleet Attendants',
        description: 'Eco electric cart fleet and bicycle rentals for resort mobility.',
        staffOnDuty: 3 + (extraStaffBoost['cycle-rental'] || 0),
        staffNeeded: 3,
        activeRequests: 1,
      },
      {
        id: 'conference-room',
        name: 'Conference Room',
        subtitle: `${2 + (extraStaffBoost['conference-room'] || 0)} Staff Working • 20% Load`,
        x: 86,
        y: 70,
        load: 20,
        status: 'Calm',
        statusType: 'calm',
        isKeyHub: false,
        department: 'Conference Coordinators',
        description: 'Executive boardroom and climate-controlled seminar suites.',
        staffOnDuty: 2 + (extraStaffBoost['conference-room'] || 0),
        staffNeeded: 2,
        activeRequests: 0,
      }
    ]
  }, [hotelAggregatedStats, extraStaffBoost])

  const [pinOverrides, setPinOverrides] = useState<Record<string, Partial<VisualPin>>>({})

  const displayedPins = useMemo(() => {
    const base = pinFilter === 'key' ? visualPins.filter(p => p.isKeyHub) : visualPins
    return base.map(p => ({
      ...p,
      ...(pinOverrides[String(p.id)] || {})
    }))
  }, [visualPins, pinFilter, pinOverrides])

  // Quick reassign +1 staff helper
  const handleDeployStaff = (pinId: string) => {
    setExtraStaffBoost(prev => ({
      ...prev,
      [pinId]: (prev[pinId] || 0) + 1
    }))
  }

  // ── Sync Dispatched Operations on Mount & Real-Time Event Listening ──
  useEffect(() => {
    const syncOperations = async () => {
      if (typeof window !== 'undefined') {
        const ackIds = new Set<string>()
        const overrides: Record<string, Partial<VisualPin>> = {}

        // 1. Check local storage
        try {
          const savedDispatches = JSON.parse(localStorage.getItem('resort_dispatched_operations') || '[]')
          if (Array.isArray(savedDispatches)) {
            savedDispatches.forEach((d: any) => {
              if (d.alertId) ackIds.add(d.alertId)
              const tz = d.targetZone || ''
              if (tz === 'swimming-pool' || tz.includes('pool')) {
                overrides['swimming-pool'] = { load: 24, status: 'Optimal', statusType: 'calm', subtitle: '4 Staff Working • 24% Risk (Restored)' }
              } else if (tz === 'sagar-restaurant' || tz.includes('restaurant') || tz.includes('dining')) {
                overrides['sagar-restaurant'] = { load: 54, status: 'Balanced', statusType: 'calm', staffOnDuty: 16, subtitle: '16 Staff Working • 54% Load (Balanced)' }
              } else if (tz === 'villa-zone-a' || tz.includes('villa')) {
                overrides['villa-zone-a'] = { load: 38, status: 'Optimal', statusType: 'calm', subtitle: '12 Staff Working • 38% Load (Turn-Down Active)' }
              } else if (tz === 'hotel-main' || tz.includes('kitchen')) {
                overrides['hotel-main'] = { load: 28, status: 'Optimal', statusType: 'calm', subtitle: 'Cold Storage Calibrated • Optimal' }
              }
            })
          }

          const savedInv = localStorage.getItem('resort_inventory_items')
          if (savedInv) {
            const parsedInv = JSON.parse(savedInv)
            if (Array.isArray(parsedInv) && parsedInv.length > 0) {
              setRestockItems(parsedInv)
            }
          }
        } catch (e) {
          console.warn('Could not read local operations or inventory', e)
        }

        // 2. Fetch real-time backend dispatches
        try {
          const res = await fetch(`${API_URL}/api/resort/dispatched-actions`)
          if (res.ok) {
            const data = await res.json()
            if (data.operations && Array.isArray(data.operations)) {
              data.operations.forEach((op: any) => {
                if (op.alert_id) ackIds.add(op.alert_id)
                const tz = op.target_zone || ''
                if (tz === 'swimming-pool' || tz.includes('pool')) {
                  overrides['swimming-pool'] = { load: 24, status: 'Optimal', statusType: 'calm', subtitle: '4 Staff Working • 24% Risk (Restored)' }
                } else if (tz === 'sagar-restaurant' || tz.includes('restaurant') || tz.includes('dining')) {
                  overrides['sagar-restaurant'] = { load: 54, status: 'Balanced', statusType: 'calm', staffOnDuty: 16, subtitle: '16 Staff Working • 54% Load (Balanced)' }
                } else if (tz === 'villa-zone-a' || tz.includes('villa')) {
                  overrides['villa-zone-a'] = { load: 38, status: 'Optimal', statusType: 'calm', subtitle: '12 Staff Working • 38% Load (Turn-Down Active)' }
                } else if (tz === 'hotel-main' || tz.includes('kitchen')) {
                  overrides['hotel-main'] = { load: 28, status: 'Optimal', statusType: 'calm', subtitle: 'Cold Storage Calibrated • Optimal' }
                }
              })
            }
          }
        } catch (e) {
          // Backend may be offline during build/tests
        }

        // 3. Load live escalated guest feedback alerts from localStorage & backend
        const activeEscalated: AlertItem[] = []
        try {
          const savedEsc = localStorage.getItem('resort_escalated_alerts')
          if (savedEsc) {
            const parsedEsc = JSON.parse(savedEsc)
            if (Array.isArray(parsedEsc)) {
              parsedEsc.forEach((a: any) => {
                if (!ackIds.has(a.id)) {
                  activeEscalated.push(a)
                }
              })
            }
          }
        } catch (e) {}

        try {
          const resAlerts = await fetch(`${API_URL}/api/alerts`)
          if (resAlerts.ok) {
            const dbAlerts = await resAlerts.json()
            if (Array.isArray(dbAlerts)) {
              dbAlerts.forEach((da: any) => {
                const altId = `alt-esc-${da.id}`
                if (!ackIds.has(altId) && !activeEscalated.some(x => x.id === altId)) {
                  activeEscalated.push({
                    id: altId,
                    title: da.message.includes('🚨') ? da.message.split(':')[0] : `🚨 Guest Escalation [${da.entity_ref || 'In-House'}]`,
                    line: da.message,
                    severity: 'high',
                    time: 'Just now',
                    zone: 'Guest Villas & Suites',
                    recommendedAction: 'Dispatch Executive Service Recovery: Duty Manager visit with dining credit & apology amenity.',
                    department: 'Guest Experience & Front Office'
                  })
                }
              })
            }
          }
        } catch (e) {}

        setEscalatedAlerts(activeEscalated)

        if (ackIds.size > 0) setAcknowledgedAlerts(prev => new Set([...prev, ...ackIds]))
        if (Object.keys(overrides).length > 0) setPinOverrides(prev => ({ ...prev, ...overrides }))
      }
    }

    syncOperations()

    // Sync across tabs and local events
    const handleStorageChange = () => syncOperations()
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const handleDispatchAlert = async (alt: AlertItem) => {
    setAcknowledgedAlerts(prev => new Set([...prev, alt.id]))
    setActiveModalAlert(null)

    const isEscalated = alt.id.startsWith('alt-esc-') || alt.title.includes('Guest Escalation')

    const actionWorkName = isEscalated
      ? `Duty Manager Service Recovery & Guest Care Visit (${alt.title})`
      : alt.id === 'alt-pool'
      ? 'Swimming Pool Circulation Pump Serviced & Flow Restored'
      : alt.id === 'alt-restaurant'
      ? 'Mandwa / Sagar Restaurant Peak Dining Staff Reallocation'
      : alt.id === 'alt-turn-down'
      ? 'Ocean Villa Priority Evening Turn-Down Service'
      : alt.id === 'alt-chiller'
      ? 'Kitchen Cold Storage Sensor & Compressor Calibration'
      : alt.title

    const riskReduction = isEscalated
      ? 'Critical Risk Resolved • Guest Calmed (100% GERS Protected)'
      : alt.id === 'alt-pool'
      ? '82% → 24%'
      : alt.id === 'alt-restaurant'
      ? '86% → 54%'
      : alt.id === 'alt-turn-down'
      ? '61% → 38%'
      : 'Low Risk Resolved'

    const targetZone = isEscalated
      ? 'villa-zone-a'
      : alt.id === 'alt-pool'
      ? 'swimming-pool'
      : alt.id === 'alt-restaurant'
      ? 'sagar-restaurant'
      : alt.id === 'alt-turn-down'
      ? 'villa-zone-a'
      : 'hotel-main'

    const loadReduction = isEscalated
      ? 'General Manager personal apology & dining credit provided'
      : alt.id === 'alt-pool'
      ? 'Normal circulation flow restored (180 L/min)'
      : alt.id === 'alt-restaurant'
      ? 'Dining table wait reduced from 18m to 4m (+2 staff)'
      : alt.id === 'alt-turn-down'
      ? '32 Villas serviced 5m ahead of schedule'
      : 'Preventive compressor check verified'

    const staffAlloc = isEscalated ? 1 : alt.id === 'alt-restaurant' ? 2 : 1

    // If escalated alert, remove from localStorage.resort_escalated_alerts
    if (isEscalated && typeof window !== 'undefined') {
      try {
        const savedEsc = JSON.parse(localStorage.getItem('resort_escalated_alerts') || '[]')
        const filteredEsc = savedEsc.filter((x: any) => x.id !== alt.id)
        localStorage.setItem('resort_escalated_alerts', JSON.stringify(filteredEsc))
      } catch (e) {}
    }

    // Real-time zone risk and load reduction
    if (isEscalated || alt.id === 'alt-turn-down') {
      setPinOverrides(prev => ({
        ...prev,
        'villa-zone-a': {
          load: 34,
          status: 'Optimal',
          statusType: 'calm',
          staffOnDuty: 13,
          subtitle: '13 Staff Working • Service Recovery Dispatched (Calm)'
        }
      }))
    } else if (alt.id === 'alt-pool') {
      setPinOverrides(prev => ({
        ...prev,
        'swimming-pool': {
          load: 24,
          status: 'Optimal',
          statusType: 'calm',
          subtitle: '4 Staff Working • 24% Risk (Restored)'
        }
      }))
    } else if (alt.id === 'alt-restaurant') {
      setPinOverrides(prev => ({
        ...prev,
        'sagar-restaurant': {
          load: 54,
          status: 'Balanced',
          statusType: 'calm',
          staffOnDuty: 16,
          subtitle: '16 Staff Working • 54% Load (Balanced)'
        }
      }))
      setExtraStaffBoost(prev => ({ ...prev, 'sagar-restaurant': (prev['sagar-restaurant'] || 0) + 2 }))
    } else if (alt.id === 'alt-turn-down') {
      setPinOverrides(prev => ({
        ...prev,
        'villa-zone-a': {
          load: 38,
          status: 'Optimal',
          statusType: 'calm',
          subtitle: '12 Staff Working • 38% Load (Turn-Down Active)'
        }
      }))
    } else if (alt.id === 'alt-chiller') {
      setPinOverrides(prev => ({
        ...prev,
        'hotel-main': {
          load: 28,
          status: 'Optimal',
          statusType: 'calm',
          subtitle: 'Cold Storage Calibrated • Optimal'
        }
      }))
    } else {
      setPinOverrides(prev => ({
        ...prev,
        [targetZone]: {
          load: 30,
          status: 'Optimal',
          statusType: 'calm',
          subtitle: `${actionWorkName.slice(0, 30)} • Resolved`
        }
      }))
    }

    // Persist dispatched record in localStorage for weekly report & audit
    const dispatchRecord = {
      id: `disp-${Date.now()}`,
      alertId: alt.id,
      actionName: actionWorkName,
      department: alt.department || (alt.id === 'alt-pool' ? 'Facility Maintenance' : alt.id === 'alt-restaurant' ? 'Food & Beverage' : 'Housekeeping'),
      targetZone: targetZone,
      riskReduction: riskReduction,
      loadReduction: loadReduction,
      details: alt.recommendedAction,
      timestamp: new Date().toISOString(),
      staffAllocated: staffAlloc,
    }

    if (typeof window !== 'undefined') {
      try {
        const existing = JSON.parse(localStorage.getItem('resort_dispatched_operations') || '[]')
        localStorage.setItem('resort_dispatched_operations', JSON.stringify([
          dispatchRecord,
          ...existing.filter((x: any) => x.alertId !== alt.id)
        ]))
        // Notify all report and dashboard tabs immediately
        window.dispatchEvent(new Event('storage'))
      } catch (e) {
        console.warn('localStorage error', e)
      }
    }

    // Broadcast to backend in real-time
    try {
      await fetch(`${API_URL}/api/resort/dispatch-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert_id: alt.id,
          action_name: actionWorkName,
          department: alt.department || 'Executive Operations',
          target_zone: targetZone,
          risk_reduction: riskReduction,
          load_reduction: loadReduction,
          details: alt.recommendedAction,
          staff_allocated: staffAlloc,
          rupee_impact: 45000.0
        })
      })
    } catch (e) {
      console.warn('Real-time backend dispatch logged locally:', e)
    }
  }

  const [submittingOrder, setSubmittingOrder] = useState(false)
  const [activePoNum, setActivePoNum] = useState('PO-2026-0518')

  // ── Inventory Filter & Total Cost Calculations ──
  const filteredRestockItems = useMemo(() => {
    let list = restockItems
    if (showOnlyPending) {
      list = list.filter(i => i.orderQty > 0)
    }
    if (inventoryCategory !== 'all') {
      list = list.filter(i => i.category === inventoryCategory)
    }
    return list
  }, [restockItems, inventoryCategory, showOnlyPending])

  const pendingRestockCount = useMemo(() => {
    return restockItems.filter(i => i.orderQty > 0).length
  }, [restockItems])

  const totalRestockCost = useMemo(() => {
    return restockItems.reduce((sum, item) => sum + (item.orderQty * item.unitPrice), 0)
  }, [restockItems])

  const handleUpdateQty = (id: string, delta: number) => {
    setRestockItems(prev => {
      const updated = prev.map(item => {
        if (item.id === id) {
          const newQty = Math.max(0, Math.round((item.orderQty + delta) * 10) / 10)
          return { ...item, orderQty: newQty }
        }
        return item
      })
      if (typeof window !== 'undefined') {
        localStorage.setItem('resort_inventory_items', JSON.stringify(updated))
        window.dispatchEvent(new Event('storage'))
      }
      return updated
    })
  }

  const handleRemoveItem = (id: string) => {
    setRestockItems(prev => {
      const updated = prev.map(item => {
        if (item.id === id) {
          return { ...item, orderQty: 0, recommendedQty: 0 }
        }
        return item
      })
      if (typeof window !== 'undefined') {
        localStorage.setItem('resort_inventory_items', JSON.stringify(updated))
        window.dispatchEvent(new Event('storage'))
      }
      return updated
    })
  }

  const handleUpdatePrice = (id: string, newPrice: number) => {
    setRestockItems(prev => {
      const updated = prev.map(item => {
        if (item.id === id) {
          return { ...item, unitPrice: Math.max(0, newPrice) }
        }
        return item
      })
      if (typeof window !== 'undefined') {
        localStorage.setItem('resort_inventory_items', JSON.stringify(updated))
      }
      return updated
    })
  }

  const handleResetRestock = () => {
    setRestockItems(INITIAL_RESTOCK_ITEMS)
    if (typeof window !== 'undefined') {
      localStorage.setItem('resort_inventory_items', JSON.stringify(INITIAL_RESTOCK_ITEMS))
      window.dispatchEvent(new Event('storage'))
    }
    setOrderSubmitted(false)
  }

  const handlePlaceRestockOrder = async () => {
    setSubmittingOrder(true)
    const currentOrderLines = restockItems.filter(i => i.orderQty > 0)
    const genPo = `PO-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`
    setActivePoNum(genPo)

    // Persist restock order in localStorage for weekly report & audit
    const restockOrderRecord = {
      poNumber: genPo,
      timestamp: new Date().toISOString(),
      itemsCount: currentOrderLines.length,
      totalCost: totalRestockCost,
      items: currentOrderLines.map(i => ({ name: i.name, qty: i.orderQty, unit: i.unit, price: i.unitPrice }))
    }

    if (typeof window !== 'undefined') {
      try {
        const existingOrders = JSON.parse(localStorage.getItem('resort_restock_orders') || '[]')
        localStorage.setItem('resort_restock_orders', JSON.stringify([restockOrderRecord, ...existingOrders]))
        window.dispatchEvent(new Event('storage'))
      } catch (e) {
        console.warn('localStorage error', e)
      }
    }

    try {
      await fetch(`${API_URL}/api/inventory/restock/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: currentOrderLines.map(i => ({
            id: i.id,
            name: i.name,
            category: i.category,
            order_qty: i.orderQty,
            unit_price: i.unitPrice,
            unit: i.unit
          })),
          po_number: genPo,
          notes: 'Confirmed and dispatched from Executive Dashboard'
        })
      })
    } catch (e) {
      console.warn('Real-time backend update triggered locally:', e)
    }

    // Refresh inventory in real-time across the app & persist to localStorage:
    // Replenish onHand, clear orderQty to 0, boost cover to 7.5+ days!
    const updatedInventory = restockItems.map(item => {
      if (item.orderQty > 0) {
        const replenishedStock = Math.round((item.onHand + item.orderQty) * 10) / 10
        return {
          ...item,
          onHand: replenishedStock,
          recommendedQty: 0,
          orderQty: 0,
          daysOfCover: Math.max(7.5, Math.round((replenishedStock / (item.parLevel / 7)) * 10) / 10)
        }
      }
      return item
    })

    setRestockItems(updatedInventory)
    if (typeof window !== 'undefined') {
      localStorage.setItem('resort_inventory_items', JSON.stringify(updatedInventory))
      window.dispatchEvent(new Event('storage'))
    }

    setSubmittingOrder(false)
    setOrderSubmitted(true)
  }

  return (
    <div className="h-full max-h-full overflow-hidden flex flex-col justify-between p-2.5 lg:p-3 gap-2">
      {/* ══════════════════════════════════════════════════════════════
          TOP BAR: Greeting, Date/Time, Live Indicator, Weather, Alert Count & Restock Pill
          ══════════════════════════════════════════════════════════════ */}
      <header className={`shrink-0 min-h-11 py-1.5 ${is8Bit ? 'bg-white border-3 border-black shadow-[4px_4px_0px_#000] rounded-none' : 'neumorph-card'} px-3 sm:px-4 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap`}>
        <div className="flex items-center gap-2.5">
          <h1 className={`font-bold text-xs sm:text-sm tracking-tight ${is8Bit ? 'font-pixel text-[11px] text-black' : 'text-slate-900'}`}>
            {greeting}
          </h1>
          <span className={`hidden md:inline-block text-[11px] font-medium border-l pl-2.5 ${is8Bit ? 'border-black text-black font-pixel text-[9px]' : 'border-slate-300 text-slate-500'}`}>
            Resort Operations Suite
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs flex-wrap">
          {/* 🕹️ Theme Switch Button (Switch between Executive UI and 8bitcn UI) */}
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-1.5 px-3 py-1 font-bold cursor-pointer transition-transform active:translate-x-[2px] active:translate-y-[2px] ${
              is8Bit
                ? 'pixel-pill-black text-[9px] rounded-full shadow-[2px_2px_0px_#000]'
                : 'rounded-full text-[11px] bg-slate-900 text-white hover:bg-black border border-slate-700 shadow-xs'
            }`}
            title="Switch between Executive UI and 8bitcn Retro UI"
          >
            {is8Bit ? (
              <>
                <Layers className="w-3 h-3 text-emerald-400" />
                <span className="font-pixel text-[9px]">👔 EXECUTIVE UI</span>
              </>
            ) : (
              <>
                <span className="animate-pulse">🕹️</span>
                <span className="font-pixel text-[9px] text-[#00ff66]">8BITCN UI</span>
              </>
            )}
          </button>

          {/* Live Indicator */}
          <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold shadow-xs ${is8Bit ? 'bg-black text-white border border-black font-pixel text-[8px]' : 'bg-emerald-50 text-emerald-700'}`}>
            <span className={`w-2 h-2 rounded-full ${is8Bit ? 'bg-[#00ff66]' : 'bg-emerald-500 animate-ping'}`} />
            <span className="text-[10px] tracking-wide">LIVE</span>
          </div>

          {/* Automated Inventory Restock Quick Action Pill */}
          <button
            onClick={() => {
              setOrderSubmitted(false)
              setShowInventoryModal(true)
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-bold shadow-xs transition-colors cursor-pointer text-[11px] border ${
              is8Bit
                ? 'bg-white text-black border-2 border-black font-pixel text-[9px] shadow-[2px_2px_0px_#000]'
                : pendingRestockCount === 0
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300/80 hover:bg-emerald-100'
                : 'bg-blue-50 text-blue-800 border-blue-200/60 hover:bg-blue-100'
            }`}
            title="Automated Supply Restock List"
          >
            {pendingRestockCount === 0 ? (
              <>
                <CheckCircle2 className={`w-3.5 h-3.5 ${is8Bit ? 'text-black' : 'text-emerald-600'}`} />
                <span>All Par Levels Secured</span>
              </>
            ) : (
              <>
                <Package className={`w-3.5 h-3.5 ${is8Bit ? 'text-black' : 'text-blue-600'}`} />
                <span>Restock Orders ({pendingRestockCount})</span>
                <span className="hidden sm:inline font-normal">• {formatRupees(totalRestockCost, true)}</span>
              </>
            )}
          </button>

          {/* Weather Chip */}
          <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full shadow-xs font-medium text-[11px] ${is8Bit ? 'bg-white text-black border-2 border-black font-pixel text-[9px]' : 'bg-white text-slate-700'}`}>
            {weather?.condition === 'Rainy' ? (
              <CloudRain className={`w-3.5 h-3.5 ${is8Bit ? 'text-black' : 'text-blue-600'}`} />
            ) : (
              <CloudSun className={`w-3.5 h-3.5 ${is8Bit ? 'text-black' : 'text-amber-500'}`} />
            )}
            <span>{weather?.temp || 28}°C {weather?.condition || 'Clear Ocean'}</span>
          </div>

          {/* Simulated Date & Time */}
          <div suppressHydrationWarning className={`hidden sm:flex items-center px-2.5 py-0.5 rounded-full shadow-xs font-medium text-[11px] ${is8Bit ? 'bg-white text-black border-2 border-black font-pixel text-[8px]' : 'bg-white text-slate-700'}`}>
            {simDate.formatted}
          </div>

          {/* Alert Count Pill */}
          <button
            onClick={() => alertItems.length > 0 && setActiveModalAlert(alertItems[0])}
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold shadow-xs cursor-pointer text-[11px] ${is8Bit ? 'bg-white text-rose-700 border-2 border-black font-pixel text-[8px]' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}
            title="Click to view urgent alert"
          >
            <Bell className="w-3.5 h-3.5 text-rose-600" />
            <span>{alertItems.length} Alerts</span>
          </button>
        </div>
      </header>




      {/* ══════════════════════════════════════════════════════════════
          HERO ROW: Live Digital Twin Aerial Map (Left) + Resort Alerts (Right)
          ══════════════════════════════════════════════════════════════ */}
      <section className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5">
        {/* HERO: Live Digital Twin Aerial Photo with Pinpoint Markers */}
        <div className="lg:col-span-8 neumorph-card p-2.5 flex flex-col justify-between min-h-0 overflow-hidden">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/70 shrink-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold tracking-wide">
                LIVE DIGITAL TWIN
              </span>
              <h2 className="font-bold text-xs sm:text-sm text-slate-900">
                Ocean Bliss Aerial Map • Real-Time Spatial Points
              </h2>

              {/* Real-time Personnel Badge */}
              <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50/80 text-blue-800 text-[10px] font-bold border border-blue-200/60">
                <Users className="w-3 h-3 text-blue-600 animate-pulse" />
                <span>{hotelAggregatedStats.totalStaffCount} Staff Active in Real Time</span>
                <span className="text-blue-500 font-normal">({staffAvailable} on standby)</span>
              </div>
            </div>

            {/* Filter Buttons & Controls */}
            <div className="flex items-center gap-2">
              {/* Quick Restock List Button */}
              <button
                onClick={() => {
                  setOrderSubmitted(false)
                  setShowInventoryModal(true)
                }}
                className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-1 shadow-xs"
                title="View Automated Restock List"
              >
                <Package className="w-2.5 h-2.5 text-blue-600" />
                <span>Restock List</span>
              </button>

              <button
                onClick={() => setShowStaffOverlay(!showStaffOverlay)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 border ${
                  showStaffOverlay 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                title="Toggle Real-Time Staff Count Badges on Pins"
              >
                <Users className="w-2.5 h-2.5" />
                <span>Staff {showStaffOverlay ? 'ON' : 'OFF'}</span>
              </button>

              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[10px] font-semibold text-slate-600">
                <button
                  onClick={() => setPinFilter('key')}
                  className={`px-2 py-0.5 rounded-md transition-all ${
                    pinFilter === 'key' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'hover:text-slate-900'
                  }`}
                >
                  Key Hubs
                </button>
                <button
                  onClick={() => setPinFilter('all')}
                  className={`px-2 py-0.5 rounded-md transition-all ${
                    pinFilter === 'all' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'hover:text-slate-900'
                  }`}
                >
                  All Points ({visualPins.length})
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-2.5 text-[10px] font-semibold text-slate-600 pl-1 border-l border-slate-200">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Calm
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Busy
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> Attention
                </span>
              </div>
            </div>
          </div>

          {/* Aerial Map Container with Visual Pins */}
          <div className="relative flex-1 min-h-0 w-full neumorph-inset p-1 rounded-2xl overflow-hidden group">
            <div className="relative w-full h-full rounded-xl overflow-hidden bg-slate-900 select-none">
              {/* Actual Drone Aerial Photograph */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/resort-aerial.jpg"
                alt="Live Digital Twin Aerial Drone Map"
                className="w-full h-full object-cover object-center pointer-events-none"
              />

              {/* Ocean Tag on the right beach shore */}
              <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-slate-900/70 backdrop-blur-xs border border-sky-400/30 text-[10px] font-bold text-sky-200 flex items-center gap-1.5 shadow-md pointer-events-none">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                <span>Ocean Space & Beachfront</span>
              </div>

              {/* Visual Pins Overlay with Real-Time Staff Counts */}
              {displayedPins.map((pin) => {
                const isHotel = pin.isHotel
                const isStretched = pin.statusType === 'stretched'
                const isBusy = pin.statusType === 'busy'

                return (
                  <div
                    key={pin.id}
                    onClick={() => {
                      if (isHotel) {
                        setShowHotelAggregateModal(true)
                      } else {
                        setSelectedPinDetails(pin)
                        setSelectedZone({
                          id: Number(pin.id) || 10,
                          name: pin.name,
                          workload_index: pin.load,
                          staff_on_duty: pin.staffOnDuty,
                          staff_required_now: pin.staffNeeded,
                          backlog_count: pin.activeRequests,
                        } as Zone)
                      }
                    }}
                    style={{
                      left: `${pin.x}%`,
                      top: `${pin.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className={`absolute z-20 cursor-pointer transition-all duration-200 hover:scale-110 hover:z-30 group/pin`}
                  >
                    {/* Hotel Special Pill vs Regular Zone Pill */}
                    {isHotel ? (
                      <div className="flex flex-col items-center">
                        <div className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-blue-900/95 via-indigo-900/95 to-blue-950/95 text-white border-2 border-amber-400/90 shadow-[0_4px_16px_rgba(0,0,0,0.6)] backdrop-blur-md flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center font-black text-[9px] shadow-sm">
                            ★
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 leading-none">
                              <span className="font-extrabold text-[11px] tracking-tight text-amber-200">
                                {pin.name}
                              </span>
                              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/90 text-white text-[8px] font-bold">
                                {hotelAggregatedStats.calculatedLoad}% LOAD
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[8.5px] font-bold text-sky-200 flex items-center gap-1">
                                <Users className="w-2.5 h-2.5 text-sky-300" /> {hotelAggregatedStats.totalStaffCount} Staff Working
                              </span>
                              <span className="text-[8px] text-slate-300">
                                • {hotelAggregatedStats.occupiedRooms}/84 Keys
                              </span>
                            </div>
                          </div>
                        </div>
                        {/* Downward Pointer Triangle */}
                        <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-amber-400 drop-shadow-sm" />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className={`px-2 py-1 rounded-lg backdrop-blur-md border shadow-[0_3px_10px_rgba(0,0,0,0.45)] flex items-center gap-1.5 transition-colors ${
                          isStretched 
                            ? 'bg-rose-950/90 border-rose-400/80 text-white' 
                            : isBusy 
                            ? 'bg-amber-950/90 border-amber-400/80 text-white' 
                            : 'bg-slate-900/85 border-white/30 text-white'
                        }`}>
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            isStretched 
                              ? 'bg-rose-500 animate-ping' 
                              : isBusy 
                              ? 'bg-amber-400' 
                              : 'bg-emerald-400'
                          }`} />

                          <div className="leading-tight">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[10px] whitespace-nowrap">
                                {pin.name}
                              </span>
                              {showStaffOverlay && (
                                <span className="px-1 py-0.2 rounded bg-blue-500/30 text-sky-200 text-[8px] font-bold flex items-center gap-0.5">
                                  <Users className="w-2 h-2" /> {pin.staffOnDuty}
                                </span>
                              )}
                            </div>
                            <span className={`text-[8.5px] font-medium block whitespace-nowrap mt-0.5 ${
                              isStretched ? 'text-rose-200' : isBusy ? 'text-amber-200' : 'text-slate-300'
                            }`}>
                              {pin.staffOnDuty} Staff Working • {pin.load}% Load
                            </span>
                          </div>
                        </div>
                        <div className={`w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] ${
                          isStretched ? 'border-t-rose-500' : isBusy ? 'border-t-amber-400' : 'border-t-slate-800'
                        }`} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 shrink-0 px-1">
            <span className="flex items-center gap-1.5">
              <Users className="w-3 h-3 text-blue-600" />
              <span>Real-Time Staffing: <strong>{hotelAggregatedStats.totalStaffCount} on duty</strong> across 8 facilities • <strong>{staffAvailable} standby</strong>.</span>
            </span>
            <span className="font-semibold text-blue-600">
              Villa Zone A: {12 + (extraStaffBoost['villa-zone-a'] || 0)} Staff Working (61% Load)
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: Resort Alerts (Click opens modal in middle) */}
        <div className="lg:col-span-4 neumorph-card p-2.5 flex flex-col justify-between min-h-0 overflow-hidden">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/70 shrink-0">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-xs sm:text-sm text-slate-900">
                Resort Alerts
              </h3>
            </div>
            <span className="text-[10px] text-slate-500 font-medium">
              Newest first
            </span>
          </div>

          {/* Interactive Alert List */}
          <div className="space-y-1.5 flex-1 overflow-y-auto py-1 pr-1 scrollbar-thin">
            {alertItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <CheckCircle2 className="w-7 h-7 text-emerald-500 mb-1" />
                <span className="text-xs font-semibold text-slate-700">All Alerts Cleared</span>
                <span className="text-[10px] text-slate-500">Zero active operational issues</span>
              </div>
            ) : (
              alertItems.map((alt) => (
                <div
                  key={alt.id}
                  onClick={() => setActiveModalAlert(alt)}
                  className="p-2 neumorph-card-sm transition-all hover:translate-x-1 cursor-pointer group flex items-start justify-between gap-2"
                >
                  <div className="space-y-0.5 overflow-hidden">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        alt.severity === 'high' ? 'bg-rose-500' :
                        alt.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                      }`} />
                      <span className="font-bold text-[11px] text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                        {alt.title}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-600 line-clamp-1 leading-tight">
                      {alt.line}
                    </p>
                    <span className="text-[9px] text-slate-500 font-medium flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" /> {alt.time}
                    </span>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase shrink-0 ${
                    alt.severity === 'high' ? 'bg-rose-100 text-rose-700' :
                    alt.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {alt.severity}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Quick Actions (Two Buttons) */}
          <div className="pt-2 border-t border-slate-200/70 grid grid-cols-2 gap-2 shrink-0">
            <button
              onClick={() => {
                const el = document.getElementById('what-if-card')
                el?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="py-1.5 px-2 neumorph-btn text-slate-700 hover:text-slate-900 text-[11px] font-bold flex items-center justify-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              <span>What-If Sim</span>
            </button>

            <Link
              href="/owner/week"
              className="py-1.5 px-2 neumorph-btn-blue text-[11px] font-bold flex items-center justify-center gap-1.5 text-center"
            >
              <FileText className="w-3.5 h-3.5 text-white" />
              <span>Weekly Report</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Active Chaos Notification Banner */}
      {activeChaos && (
        <div className={`p-2.5 flex items-center justify-between gap-3 border-2 ${
          is8Bit 
            ? 'bg-[#1a0a0a] border-[#ff0055] text-white shadow-[4px_4px_0px_#000]' 
            : 'bg-gradient-to-r from-amber-50 to-rose-50 border-rose-300 text-rose-900 rounded-xl shadow-sm'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-base animate-bounce">⚡</span>
            <div>
              <span className={`block uppercase font-bold tracking-wider ${is8Bit ? 'font-pixel text-[8px] text-[#ff0055]' : 'text-[11px] text-rose-700'}`}>
                LIVE CHAOS TEST INJECTED:
              </span>
              <span className={`font-black ${is8Bit ? 'font-pixel text-xs text-white' : 'text-xs text-rose-950 font-bold'}`}>
                {activeChaos.title || activeChaos.scenarioId}
              </span>
            </div>
          </div>
          <button
            onClick={async () => {
              try {
                localStorage.removeItem('resort_active_chaos')
                window.dispatchEvent(new Event('resort-chaos-change'))
                window.dispatchEvent(new Event('storage'))
                await fetch(`${API_URL}/api/sim/reset_demo`, { method: 'POST' }).catch(() => {})
              } catch {}
            }}
            className={`px-3 py-1.5 uppercase font-bold text-xs transition-all ${
              is8Bit
                ? 'font-pixel text-[8px] bg-[#ff0055] text-black border-2 border-black hover:bg-white'
                : 'bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm text-[11px]'
            }`}
          >
            Reset Baseline
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          KPI ROW: 4 Cards (Value, Comparison vs Yesterday, Sparkline)
          ══════════════════════════════════════════════════════════════ */}
      <section className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-2">
        {/* 1. OCCUPANCY */}
        <div className={`p-2.5 flex items-center justify-between ${is8Bit ? 'bg-white border-3 border-black shadow-[4px_4px_0px_#000]' : 'neumorph-card'}`}>
          <div>
            <span className={`block uppercase tracking-wide ${is8Bit ? 'font-pixel text-[8px] text-black' : 'text-[9px] font-bold text-slate-500'}`}>
              OCCUPANCY
            </span>
            <span className={`my-0.5 block leading-none font-black ${is8Bit ? 'font-pixel text-lg sm:text-xl text-black' : 'text-xl sm:text-2xl text-slate-900'}`}>
              {occPct}%
            </span>
            <span className={`flex items-center gap-0.5 font-bold ${is8Bit ? 'font-pixel text-[8px] text-[#047857]' : 'text-[10px] text-emerald-600'}`}>
              <ArrowUpRight className="w-3 h-3" /> 6.2% vs yday
            </span>
          </div>
          {is8Bit ? (
            <div className="w-14 h-7 flex items-end justify-between gap-1 pb-0.5 border-b-2 border-black bg-white">
              <div className="w-2.5 bg-black" style={{ height: '40%' }} />
              <div className="w-2.5 bg-[#4b5563]" style={{ height: '70%' }} />
              <div className="w-2.5 bg-black" style={{ height: '90%' }} />
            </div>
          ) : (
            <svg className="w-14 h-7 overflow-visible" viewBox="0 0 70 30">
              <path
                d="M 0,22 Q 15,10 30,18 T 70,5"
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.5"
              />
              <circle cx="70" cy="5" r="3.5" fill="#2563eb" />
            </svg>
          )}
        </div>

        {/* 2. STAFF LOAD */}
        <div className={`p-2.5 flex items-center justify-between ${is8Bit ? 'bg-white border-3 border-black shadow-[4px_4px_0px_#000]' : 'neumorph-card'}`}>
          <div>
            <span className={`block uppercase tracking-wide ${is8Bit ? 'font-pixel text-[8px] text-black' : 'text-[9px] font-bold text-slate-500'}`}>
              STAFF LOAD
            </span>
            <span className={`my-0.5 block leading-none font-black ${is8Bit ? 'font-pixel text-lg sm:text-xl text-black' : 'text-xl sm:text-2xl text-slate-900'}`}>
              {staffLoad}%
            </span>
            <span className={`block ${is8Bit ? 'font-pixel text-[8px] text-slate-600' : 'text-[10px] font-medium text-slate-600'}`}>
              {staffAvailable} available
            </span>
          </div>
          {is8Bit ? (
            <div className="w-14 h-7 flex items-end justify-between gap-1 pb-0.5 border-b-2 border-black bg-white">
              <div className="w-2.5 bg-black" style={{ height: '55%' }} />
              <div className="w-2.5 bg-[#4b5563]" style={{ height: '35%' }} />
              <div className="w-2.5 bg-black" style={{ height: '74%' }} />
            </div>
          ) : (
            <svg className="w-14 h-7 overflow-visible" viewBox="0 0 70 30">
              <path
                d="M 0,10 Q 20,25 40,12 T 70,8"
                fill="none"
                stroke="#0284c7"
                strokeWidth="2.5"
              />
              <circle cx="70" cy="8" r="3.5" fill="#0284c7" />
            </svg>
          )}
        </div>

        {/* 3. GUEST WAIT */}
        <div className={`p-2.5 flex items-center justify-between ${is8Bit ? 'bg-white border-3 border-black shadow-[4px_4px_0px_#000]' : 'neumorph-card'}`}>
          <div>
            <span className={`block uppercase tracking-wide ${is8Bit ? 'font-pixel text-[8px] text-black' : 'text-[9px] font-bold text-slate-500'}`}>
              GUEST WAIT
            </span>
            <span className={`my-0.5 block leading-none font-black ${is8Bit ? 'font-pixel text-lg sm:text-xl text-black' : 'text-xl sm:text-2xl text-slate-900'}`}>
              {avgWaitMin} min
            </span>
            <span className={`flex items-center gap-0.5 font-bold ${is8Bit ? 'font-pixel text-[8px] text-[#047857]' : 'text-[10px] text-emerald-600'}`}>
              <ArrowDownRight className="w-3 h-3" /> 3 min today
            </span>
          </div>
          {is8Bit ? (
            <div className="w-14 h-7 flex items-end justify-between gap-1 pb-0.5 border-b-2 border-black bg-white">
              <div className="w-2.5 bg-black" style={{ height: '80%' }} />
              <div className="w-2.5 bg-[#4b5563]" style={{ height: '50%' }} />
              <div className="w-2.5 bg-black" style={{ height: '30%' }} />
            </div>
          ) : (
            <svg className="w-14 h-7 overflow-visible" viewBox="0 0 70 30">
              <path
                d="M 0,8 Q 25,22 45,14 T 70,20"
                fill="none"
                stroke="#7c3aed"
                strokeWidth="2.5"
              />
              <circle cx="70" cy="20" r="3.5" fill="#7c3aed" />
            </svg>
          )}
        </div>

        {/* 4. TODAY'S REVENUE */}
        <div className={`p-2.5 flex items-center justify-between ${is8Bit ? 'bg-white border-3 border-black shadow-[4px_4px_0px_#000]' : 'neumorph-card'}`}>
          <div>
            <span className={`block uppercase tracking-wide ${is8Bit ? 'font-pixel text-[8px] text-black' : 'text-[9px] font-bold text-slate-500'}`}>
              TODAY&apos;S REVENUE
            </span>
            <span className={`my-0.5 block leading-none font-black ${is8Bit ? 'font-pixel text-lg sm:text-xl text-black' : 'text-xl sm:text-2xl text-slate-900'}`}>
              {formatRupees(revenueToday, true)}
            </span>
            <span className={`flex items-center gap-0.5 font-bold ${is8Bit ? 'font-pixel text-[8px] text-[#047857]' : 'text-[10px] text-emerald-600'}`}>
              <ArrowUpRight className="w-3 h-3" /> 8.7% vs fcst
            </span>
          </div>
          {is8Bit ? (
            <div className="w-14 h-7 flex items-end justify-between gap-1 pb-0.5 border-b-2 border-black bg-white">
              <div className="w-2.5 bg-black" style={{ height: '45%' }} />
              <div className="w-2.5 bg-[#4b5563]" style={{ height: '70%' }} />
              <div className="w-2.5 bg-black" style={{ height: '95%' }} />
            </div>
          ) : (
            <svg className="w-14 h-7 overflow-visible" viewBox="0 0 70 30">
              <path
                d="M 0,20 Q 20,15 45,8 T 70,4"
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.5"
              />
              <circle cx="70" cy="4" r="3.5" fill="#2563eb" />
            </svg>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          BOTTOM ROW: 4 Panels
          1. Resort Stress Index (Circular Ring Gauge or 8bitcn Health Bars)
          2. What-If Simulator (With EASY/NORMAL/HARD Difficulty Pills in 8bitcn)
          3. Highest-Value Recommendation
          4. 7-Day Stress Trend (Paired Pixel Bar Chart in 8bitcn style)
          ══════════════════════════════════════════════════════════════ */}
      <section className="shrink-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        {/* PANEL 1: RESORT STRESS INDEX */}
        <div className={`p-2.5 flex flex-col justify-between ${is8Bit ? 'bg-white border-3 border-black shadow-[4px_4px_0px_#000]' : 'neumorph-card'}`}>
          <div className="flex items-center justify-between pb-1 border-b border-slate-200/70">
            <span className={`uppercase tracking-wide ${is8Bit ? 'font-pixel text-[8px] text-black' : 'text-[9px] font-bold text-slate-500'}`}>
              RESORT STRESS INDEX
            </span>
            <span className={`px-2 py-0.2 rounded-full font-bold ${is8Bit ? 'border border-black font-pixel text-[8px] bg-white text-black' : 'text-[8.5px] bg-amber-50 text-amber-700'}`}>
              {stressLevel}
            </span>
          </div>

          {is8Bit ? (
            /* 8bitcn Segmented Red Health Meters (Exact to Reference Image) */
            <div className="space-y-2 my-1">
              <div>
                <div className="flex justify-between items-center text-[8px] font-pixel text-black mb-0.5">
                  <span>Facility Health</span>
                  <span>{100 - currentStress}%</span>
                </div>
                <div className="pixel-health-meter">
                  <div
                    className="pixel-health-segmented"
                    style={{ width: `${Math.max(15, 100 - currentStress)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center text-[8px] font-pixel text-black mb-0.5">
                  <span>System Stress</span>
                  <span>{currentStress}%</span>
                </div>
                <div className="pixel-health-meter">
                  <div
                    className="pixel-health-segmented"
                    style={{ width: `${currentStress}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center my-0.5">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="3.5"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="3.5"
                    strokeDasharray={`${currentStress}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute w-11 h-11 rounded-full neumorph-card flex flex-col items-center justify-center">
                  <span className="text-sm font-black text-slate-900 leading-none">
                    {currentStress}
                  </span>
                  <span className="text-[7.5px] font-bold text-slate-500">/100</span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-1 text-center text-[9px] pt-1 border-t border-slate-200/70">
            <div>
              <span className={`block ${is8Bit ? 'font-pixel text-[7px] text-slate-600' : 'text-slate-500'}`}>Occupancy</span>
              <span className={`font-bold ${is8Bit ? 'font-pixel text-[7px] text-black' : 'text-rose-600'}`}>High</span>
            </div>
            <div>
              <span className={`block ${is8Bit ? 'font-pixel text-[7px] text-slate-600' : 'text-slate-500'}`}>Staff Load</span>
              <span className={`font-bold ${is8Bit ? 'font-pixel text-[7px] text-black' : 'text-amber-600'}`}>Medium</span>
            </div>
            <div>
              <span className={`block ${is8Bit ? 'font-pixel text-[7px] text-slate-600' : 'text-slate-500'}`}>Maint</span>
              <span className={`font-bold ${is8Bit ? 'font-pixel text-[7px] text-black' : 'text-emerald-600'}`}>Low</span>
            </div>
          </div>
        </div>

        {/* PANEL 2: WHAT-IF SIMULATOR */}
        <div id="what-if-card" className={`p-2.5 flex flex-col justify-between ${is8Bit ? 'bg-white border-3 border-black shadow-[4px_4px_0px_#000]' : 'neumorph-card'}`}>
          <div>
            <div className="flex items-center justify-between pb-1 border-b border-slate-200/70 mb-1">
              <span className={`uppercase tracking-wide ${is8Bit ? 'font-pixel text-[8px] text-black' : 'text-[9px] font-bold text-slate-500'}`}>
                WHAT-IF SIMULATOR
              </span>
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            </div>

            {/* Select Difficulty Pills in 8bitcn Mode (Exact to Reference Image) */}
            {is8Bit && (
              <div className="grid grid-cols-3 gap-1 mb-1.5">
                {[
                  { label: 'EASY', scn: 'Low Season / 65% Occupancy' },
                  { label: 'NORMAL', scn: '98% Occupancy — evening peak' },
                  { label: 'HARD', scn: 'Sudden Monsoon Storm (3 PM)' },
                ].map((d) => (
                  <button
                    key={d.label}
                    onClick={() => {
                      setSelectedScenario(d.scn)
                      if (d.label === 'EASY') setSimulationResult('EASY MODE (65% Occ): Low load, 18 idle staff on standby.')
                      if (d.label === 'NORMAL') setSimulationResult('NORMAL MODE (91% Occ): Evening peak dining & pool capacity.')
                      if (d.label === 'HARD') setSimulationResult('HARD MODE (Monsoon Storm): High wind. Pool evacuated, dining surged.')
                    }}
                    className={`py-1 text-[7.5px] font-pixel uppercase rounded-full border border-black transition-all cursor-pointer ${
                      selectedScenario === d.scn
                        ? 'bg-black text-white shadow-[1px_1px_0px_#000]'
                        : 'bg-white text-black hover:bg-slate-100'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}

            <select
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value)}
              className={`w-full p-1 text-[11px] font-semibold rounded-xl bg-white border border-slate-200 text-slate-800 shadow-xs cursor-pointer mb-1 ${is8Bit ? 'font-pixel text-[8px] border-2 border-black rounded-none shadow-[2px_2px_0px_#000]' : ''}`}
            >
              <option value="98% Occupancy — evening peak">98% Occupancy — evening peak</option>
              <option value="Sudden Monsoon Storm (3 PM)">Sudden Monsoon Storm (3 PM)</option>
              <option value="Kitchen Chiller 2 Failure">Kitchen Chiller 2 Failure</option>
            </select>

            {simulationResult ? (
              <p className={`p-1 rounded-lg leading-tight line-clamp-2 ${is8Bit ? 'font-pixel text-[8px] bg-slate-100 text-black border border-black' : 'text-[9.5px] font-medium text-blue-900 bg-blue-50/80'}`}>
                {simulationResult}
              </p>
            ) : (
              <p className={`leading-tight ${is8Bit ? 'font-pixel text-[8px] text-slate-500' : 'text-[9.5px] text-slate-500'}`}>
                Simulate future demand spikes and staffing stress ahead of time.
              </p>
            )}
          </div>

          <button
            onClick={handleRunSimulation}
            disabled={simulating}
            className={`w-full py-1 font-bold mt-1 cursor-pointer transition-transform active:translate-x-[2px] active:translate-y-[2px] ${
              is8Bit
                ? 'pixel-pill-black text-[8px] rounded-full'
                : 'neumorph-btn-blue text-[11px]'
            }`}
          >
            {simulating ? 'Simulating...' : 'Run Simulation →'}
          </button>
        </div>

        {/* PANEL 3: HIGHEST-VALUE RECOMMENDATION */}
        <div className={`p-2.5 flex flex-col justify-between ${is8Bit ? 'bg-white border-3 border-black shadow-[4px_4px_0px_#000]' : 'neumorph-card'}`}>
          <div>
            <div className="flex items-center justify-between pb-1 border-b border-slate-200/70 mb-1">
              <span className={`uppercase tracking-wide ${is8Bit ? 'font-pixel text-[8px] text-black' : 'text-[9px] font-bold text-slate-500'}`}>
                RECOMMENDATION
              </span>
              <span className={`px-1.5 py-0.2 rounded-full font-bold ${is8Bit ? 'border border-black font-pixel text-[8px] bg-white text-black' : 'text-[8px] bg-amber-100 text-amber-800'}`}>
                PRIORITY
              </span>
            </div>

            <h4 className={`font-bold leading-snug line-clamp-1 mb-0.5 ${is8Bit ? 'font-pixel text-[9px] text-black' : 'text-[11px] text-slate-900'}`}>
              {topRecommendation.title}
            </h4>

            <p className={`leading-tight line-clamp-2 ${is8Bit ? 'font-pixel text-[8px] text-slate-600' : 'text-[9.5px] text-slate-600'}`}>
              {topRecommendation.impactLine}
            </p>
          </div>

          <div>
            {approvedIds.has(topRecommendation.id) ? (
              <div className={`w-full py-1 rounded-full text-center flex items-center justify-center gap-1 font-bold ${is8Bit ? 'border-2 border-black bg-black text-white font-pixel text-[8px]' : 'bg-emerald-100 text-emerald-800 text-[11px]'}`}>
                <Check className="w-3.5 h-3.5" /> Applied
              </div>
            ) : (
              <button
                onClick={handleApplyRecommendation}
                disabled={applying}
                className={`w-full py-1 font-bold mt-1 cursor-pointer transition-transform active:translate-x-[2px] active:translate-y-[2px] ${
                  is8Bit
                    ? 'pixel-pill-black text-[8px] rounded-full'
                    : 'neumorph-btn-blue text-[11px]'
                }`}
              >
                {applying ? 'Applying...' : 'Apply Recommendation →'}
              </button>
            )}
          </div>
        </div>

        {/* PANEL 4: 7-DAY STRESS TREND LINE (Paired Pixel Bar Chart in 8bitcn mode) */}
        <div className={`p-2.5 flex flex-col justify-between ${is8Bit ? 'bg-white border-3 border-black shadow-[4px_4px_0px_#000]' : 'neumorph-card'}`}>
          <div className="flex items-center justify-between pb-1 border-b border-slate-200/70">
            <span className={`uppercase tracking-wide ${is8Bit ? 'font-pixel text-[8px] text-black' : 'text-[9px] font-bold text-slate-500'}`}>
              7-DAY STRESS TREND
            </span>
            <span className={`font-bold ${is8Bit ? 'font-pixel text-[8px] text-black' : 'text-[11px] text-blue-600'}`}>
              Current: {currentStress}
            </span>
          </div>

          {is8Bit ? (
            /* Paired Pixel Bar Chart (Exact match to "Desktop vs Mobile visitors" in reference image) */
            <div className="h-14 flex items-end justify-between gap-1 px-1 pt-1 pb-0.5 border-b-2 border-l-2 border-black bg-white my-0.5">
              {[
                { label: '09', black: 38, gray: 22 },
                { label: '10', black: 82, gray: 58 },
                { label: '11', black: 65, gray: 32 },
                { label: '12', black: 25, gray: 48 },
                { label: '13', black: 60, gray: 38 },
                { label: '14', black: 64, gray: 44 },
                { label: '15', black: 78, gray: 52 },
              ].map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center h-full justify-end">
                  <div className="flex items-end gap-0.5 w-full justify-center h-full">
                    <div style={{ height: `${d.black}%` }} className="w-1.5 sm:w-2 bg-black border-t border-l border-r border-black" />
                    <div style={{ height: `${d.gray}%` }} className="w-1.5 sm:w-2 bg-[#4b5563] border-t border-l border-r border-black" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-12 flex items-center justify-center py-0.5">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 160 60">
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0,40 Q 25,20 50,38 T 100,25 T 160,18 L 160,60 L 0,60 Z"
                  fill="url(#trendGradient)"
                />
                <path
                  d="M 0,40 Q 25,20 50,38 T 100,25 T 160,18"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2.5"
                />
                <circle cx="0" cy="40" r="2.5" fill="#2563eb" />
                <circle cx="26" cy="28" r="2.5" fill="#2563eb" />
                <circle cx="52" cy="38" r="2.5" fill="#2563eb" />
                <circle cx="78" cy="22" r="2.5" fill="#2563eb" />
                <circle cx="104" cy="26" r="2.5" fill="#2563eb" />
                <circle cx="130" cy="24" r="2.5" fill="#2563eb" />
                <circle cx="160" cy="18" r="4" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
              </svg>
            </div>
          )}

          <div className={`flex justify-between pt-0.5 border-t border-slate-200/70 font-semibold ${is8Bit ? 'font-pixel text-[7px] text-black' : 'text-[8.5px] text-slate-500'}`}>
            <span>09 May</span>
            <span>11 May</span>
            <span>13 May</span>
            <span>15 May</span>
          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════════════
          CENTER MODAL: Automated Supply & Restock Order List
          ══════════════════════════════════════════════════════════════ */}
      {showInventoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="neumorph-card bg-[#f0f3f8] max-w-3xl w-full p-5 sm:p-6 space-y-4 border border-white/80 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-md">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                      AUTOMATED RESTOCK SYSTEM
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">
                      Live Demand Tracking
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-slate-900 mt-0.5">
                    Restaurant &amp; Housekeeping Supply Orders
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setShowInventoryModal(false)}
                className="w-8 h-8 rounded-full neumorph-btn flex items-center justify-center text-slate-500 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* If Order Placed: Success Confirmation View */}
            {orderSubmitted ? (
              <div className="py-5 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md animate-in zoom-in-90">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div className="space-y-0.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                    REAL-TIME SYSTEM NOTIFICATION BROADCAST
                  </span>
                  <h4 className="font-bold text-base text-slate-900">
                    Purchase Order Dispatched &amp; Par Levels Secured!
                  </h4>
                  <p className="text-xs text-slate-600 max-w-lg">
                    Order <strong>#{activePoNum}</strong> totaling <strong>{formatRupees(totalRestockCost)}</strong> was broadcast to all resort operations teams and logged in real time.
                  </p>
                </div>

                {/* Real-Time System Updates List */}
                <div className="w-full max-w-lg space-y-1.5 text-left font-sans">
                  <div className="p-2 rounded-xl bg-white border border-emerald-200/80 flex items-start gap-2 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0 animate-pulse" />
                    <div>
                      <span className="font-bold text-xs text-slate-900 block leading-tight">Automated Inventory Coordinator</span>
                      <span className="text-[10.5px] text-slate-600 leading-tight block">Shortfall cleared to 0. Par buffers increased to 7.5+ days across all facilities.</span>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-white border border-emerald-200/80 flex items-start gap-2 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                    <div>
                      <span className="font-bold text-xs text-slate-900 block leading-tight">Restaurant &amp; Kitchen Operations</span>
                      <span className="text-[10.5px] text-slate-600 leading-tight block">Fresh seafood, malai paneer, and mango covers secured for tonight &amp; tomorrow.</span>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-white border border-emerald-200/80 flex items-start gap-2 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                    <div>
                      <span className="font-bold text-xs text-slate-900 block leading-tight">Housekeeping Logistics</span>
                      <span className="text-[10.5px] text-slate-600 leading-tight block">Pool towels and Egyptian cotton suite linen par buffers refreshed. Zero turn-down delays.</span>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-white border border-emerald-200/80 flex items-start gap-2 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                    <div>
                      <span className="font-bold text-xs text-slate-900 block leading-tight">Vendor Procurement Dispatch</span>
                      <span className="text-[10.5px] text-slate-600 leading-tight block">Transmitted to 3 certified suppliers. Delivery scheduled tomorrow by 7:00 AM.</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={() => setOrderSubmitted(false)}
                    className="px-4 py-2 rounded-full neumorph-btn text-xs font-bold text-blue-700 hover:text-blue-900"
                  >
                    View Refreshed Stock Levels
                  </button>
                  <button
                    onClick={() => setShowInventoryModal(false)}
                    className="px-5 py-2 rounded-full neumorph-btn-blue text-xs font-bold shadow-md"
                  >
                    Done &amp; Return to Dashboard
                  </button>
                </div>
              </div>
            ) : (

              <>
                {/* Category & Status Switcher Header */}
                <div className="space-y-2 shrink-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-slate-200/80">
                    <div className="flex items-center gap-1.5 p-1 neumorph-inset rounded-xl">
                      <button
                        onClick={() => setShowOnlyPending(true)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                          showOnlyPending
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>Pending Reorders ({pendingRestockCount})</span>
                      </button>
                      <button
                        onClick={() => setShowOnlyPending(false)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                          !showOnlyPending
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        <span>All Par Stock ({restockItems.length})</span>
                      </button>
                    </div>

                    <button
                      onClick={handleResetRestock}
                      className="flex items-center gap-1 px-3 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors"
                      title="Reset demo supplies back to baseline"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Reset to Baseline</span>
                    </button>
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => setInventoryCategory('all')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        inventoryCategory === 'all'
                          ? 'bg-white text-blue-700 shadow-xs border border-blue-200'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All Categories
                    </button>
                    <button
                      onClick={() => setInventoryCategory('Restaurant & Kitchen')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        inventoryCategory === 'Restaurant & Kitchen'
                          ? 'bg-white text-blue-700 shadow-xs border border-blue-200'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Restaurant &amp; Kitchen
                    </button>
                    <button
                      onClick={() => setInventoryCategory('Housekeeping')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        inventoryCategory === 'Housekeeping'
                          ? 'bg-white text-blue-700 shadow-xs border border-blue-200'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Housekeeping
                    </button>
                    <button
                      onClick={() => setInventoryCategory('Bar & Spa')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        inventoryCategory === 'Bar & Spa'
                          ? 'bg-white text-blue-700 shadow-xs border border-blue-200'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Bar &amp; Spa
                    </button>
                  </div>
                </div>

                {/* Items List or Empty State */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  {filteredRestockItems.length === 0 ? (
                    <div className="p-8 text-center space-y-3 neumorph-inset rounded-2xl my-auto">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      </div>
                      <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                        All Par Buffers Fully Secured!
                      </h4>
                      <p className="text-xs text-slate-600 max-w-sm mx-auto">
                        Every department has 7.5+ days of safe verified stock. There are currently 0 items with pending restock quantities.
                      </p>
                      <div className="flex items-center justify-center gap-2 pt-2">
                        <button 
                          onClick={() => setShowOnlyPending(false)}
                          className="px-4 py-2 rounded-xl neumorph-btn text-xs font-bold text-blue-700 hover:text-blue-900"
                        >
                          View All Stock Par Levels ({restockItems.length})
                        </button>
                        <button 
                          onClick={handleResetRestock}
                          className="px-4 py-2 rounded-xl neumorph-btn text-xs font-bold text-slate-600 hover:text-slate-900"
                        >
                          Reset to Baseline
                        </button>
                      </div>
                    </div>
                  ) : (
                    filteredRestockItems.map((item) => {
                      const lineTotal = item.orderQty * item.unitPrice
                      const isLowCover = item.daysOfCover < 2.0

                      return (
                        <div
                          key={item.id}
                          className="p-3 neumorph-card-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs sm:text-sm text-slate-900">
                                {item.name}
                              </span>
                              <span className="px-2 py-0.2 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold">
                                {item.category}
                              </span>
                              {item.orderQty === 0 ? (
                                <span className="px-2 py-0.2 rounded-md bg-emerald-100 text-emerald-700 text-[9px] font-bold flex items-center gap-1">
                                  <Check className="w-2.5 h-2.5" /> Par Secured ({item.daysOfCover}d)
                                </span>
                              ) : isLowCover ? (
                                <span className="px-2 py-0.2 rounded-md bg-rose-100 text-rose-700 text-[9px] font-bold">
                                  Low: {item.daysOfCover}d cover
                                </span>
                              ) : null}
                            </div>

                            <div className="flex items-center gap-3 text-[11px] text-slate-500">
                              <span>Stock on hand: <strong>{item.onHand} {item.unit}</strong></span>
                              <span>•</span>
                              <span>Target Par: <strong>{item.parLevel} {item.unit}</strong></span>
                              <span>•</span>
                              <span className="hidden md:inline">Supplier: {item.supplier}</span>
                            </div>
                          </div>

                          {/* Interactive Quantity & Price Controls */}
                          <div className="flex items-center gap-2.5 shrink-0">
                            {/* Quantity Counter */}
                            <div className="flex flex-col items-center">
                              <span className="text-[9px] text-slate-500 font-semibold mb-0.5">Quantity ({item.unit})</span>
                              <div className="flex items-center rounded-xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
                                <button
                                  onClick={() => handleUpdateQty(item.id, -1)}
                                  className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
                                  title="Reduce Quantity"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-10 text-center font-black text-xs text-slate-900">
                                  {item.orderQty}
                                </span>
                                <button
                                  onClick={() => handleUpdateQty(item.id, 1)}
                                  className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
                                  title="Increase Quantity"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {/* Unit Price Input */}
                            <div className="flex flex-col items-center">
                              <span className="text-[9px] text-slate-500 font-semibold mb-0.5">Unit Price</span>
                              <div className="flex items-center rounded-xl bg-white border border-slate-200 px-2 py-1 shadow-2xs">
                                <span className="text-xs text-slate-500 font-bold mr-1">₹</span>
                                <input
                                  type="number"
                                  value={item.unitPrice}
                                  onChange={(e) => handleUpdatePrice(item.id, Number(e.target.value) || 0)}
                                  className="w-14 text-xs font-bold text-slate-900 bg-transparent outline-hidden text-right"
                                />
                              </div>
                            </div>

                            {/* Line Total */}
                            <div className="w-20 text-right">
                              <span className="text-[9px] text-slate-500 block font-semibold">Total</span>
                              <span className="text-xs sm:text-sm font-black text-slate-900">
                                {formatRupees(lineTotal, true)}
                              </span>
                            </div>

                            {/* Remove Item / Zero Out Button */}
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Remove item from restock order"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Footer Order Summary & Proceed Button */}
                <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block">Total Estimated Order Value:</span>
                    <span className="text-xl font-black text-slate-900">
                      {formatRupees(totalRestockCost)}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold block">
                      {pendingRestockCount > 0
                        ? `Includes delivery and tax for ${pendingRestockCount} replenishment line items`
                        : 'Zero pending reorders needed'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowInventoryModal(false)}
                      className="px-4 py-2.5 rounded-full neumorph-btn text-xs font-bold text-slate-700 hover:text-slate-900"
                    >
                      Close
                    </button>
                    <button
                      disabled={pendingRestockCount === 0 || submittingOrder}
                      onClick={handlePlaceRestockOrder}
                      className={`px-6 py-2.5 rounded-full text-xs font-bold shadow-md flex items-center gap-2 transition-all ${
                        pendingRestockCount === 0
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                          : 'neumorph-btn-blue text-white cursor-pointer'
                      }`}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>
                        {submittingOrder
                          ? 'Transmitting...'
                          : pendingRestockCount === 0
                          ? 'All Par Levels Secured'
                          : `Proceed & Place Restock Order (${pendingRestockCount}) →`}
                      </span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          CENTER MODAL: Alert Popup
          ══════════════════════════════════════════════════════════════ */}
      {activeModalAlert && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="neumorph-card bg-[#f0f3f8] max-w-lg w-full p-6 space-y-4 border border-white/80 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-md ${
                  activeModalAlert.severity === 'high' ? 'bg-rose-500 text-white' :
                  activeModalAlert.severity === 'medium' ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'
                }`}>
                  {activeModalAlert.severity === 'high' ? <ShieldAlert className="w-6 h-6" /> : <Flame className="w-6 h-6" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      activeModalAlert.severity === 'high' ? 'bg-rose-100 text-rose-700' :
                      activeModalAlert.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {activeModalAlert.severity} PRIORITY
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {activeModalAlert.time}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-slate-900 mt-1">
                    {activeModalAlert.title}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setActiveModalAlert(null)}
                className="w-8 h-8 rounded-full neumorph-btn flex items-center justify-center text-slate-500 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-3 font-sans">
              <div className="p-3.5 neumorph-inset rounded-2xl space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                  Reported Issue
                </span>
                <p className="text-sm font-medium text-slate-800 leading-relaxed">
                  {activeModalAlert.line}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 neumorph-card-sm">
                  <span className="text-slate-500 block text-[11px]">Affected Zone:</span>
                  <span className="font-bold text-slate-900">{activeModalAlert.zone}</span>
                </div>
                <div className="p-3 neumorph-card-sm">
                  <span className="text-slate-500 block text-[11px]">SLA Response Window:</span>
                  <span className="font-bold text-rose-600">Within 4 hours</span>
                </div>
              </div>

              <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl">
                <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wide block mb-0.5">
                  Recommended Action
                </span>
                <p className="text-xs text-blue-800 font-medium leading-relaxed">
                  {activeModalAlert.recommendedAction}
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setAcknowledgedAlerts(prev => new Set([...prev, activeModalAlert.id]))
                  setActiveModalAlert(null)
                }}
                className="px-4 py-2.5 rounded-full neumorph-btn text-xs font-bold text-slate-700 hover:text-slate-900"
              >
                Acknowledge & Dismiss
              </button>

              <button
                onClick={() => handleDispatchAlert(activeModalAlert)}
                className="px-6 py-2.5 neumorph-btn-blue text-xs font-bold shadow-md"
              >
                Dispatch Operations Team →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MAIN HOTEL AGGREGATED MODAL
          ══════════════════════════════════════════════════════════════ */}
      {showHotelAggregateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="neumorph-card bg-[#f0f3f8] max-w-xl w-full p-6 space-y-4 border border-white/80 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-800 text-white flex items-center justify-center shadow-md">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 uppercase tracking-wider">
                      CENTRAL OPERATIONS HUB
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">
                      84 Keys Total
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-slate-900 mt-0.5">
                    Main Resort Hotel • Real-Time Aggregate Status
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setShowHotelAggregateModal(false)}
                className="w-8 h-8 rounded-full neumorph-btn flex items-center justify-center text-slate-500 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2.5 text-center">
              <div className="p-3 neumorph-card-sm">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Load</span>
                <span className="text-xl font-black text-blue-600 block mt-0.5">{hotelAggregatedStats.calculatedLoad}%</span>
                <span className="text-[9px] font-semibold text-emerald-600">Balanced</span>
              </div>
              <div className="p-3 neumorph-card-sm">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Occupancy</span>
                <span className="text-xl font-black text-slate-900 block mt-0.5">{occPct}%</span>
                <span className="text-[9px] font-medium text-slate-600">{hotelAggregatedStats.occupiedRooms}/84 Keys</span>
              </div>
              <div className="p-3 neumorph-card-sm">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Staff Active</span>
                <span className="text-xl font-black text-slate-900 block mt-0.5">{hotelAggregatedStats.totalStaffCount}</span>
                <span className="text-[9px] font-medium text-emerald-600">Real-Time On Duty</span>
              </div>
              <div className="p-3 neumorph-card-sm">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Guest Count</span>
                <span className="text-xl font-black text-slate-900 block mt-0.5">{hotelAggregatedStats.totalActiveGuests}</span>
                <span className="text-[9px] font-medium text-slate-600">Across zones</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 px-1">
                <span>Facility Breakdown (Real-Time Staff &amp; Load)</span>
                <span className="text-slate-500">Live Status</span>
              </div>
              <div className="neumorph-inset p-2 rounded-2xl max-h-48 overflow-y-auto space-y-1.5 scrollbar-thin">
                {hotelAggregatedStats.zones.map((z, idx) => (
                  <div key={idx} className="p-2 rounded-xl bg-white/80 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">{z.name}</span>
                        <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-bold text-[9px] flex items-center gap-0.5">
                          <Users className="w-2.5 h-2.5" /> {z.staff} Staff
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {z.department} • {z.guests} active guests
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900">{z.load}%</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        z.load > 75 ? 'bg-rose-100 text-rose-700' :
                        z.load > 50 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {z.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowHotelAggregateModal(false)}
                className="w-full py-2.5 neumorph-btn-blue text-xs font-bold"
              >
                Close Hotel Summary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          ZONE DETAIL POPUP MODAL
          ══════════════════════════════════════════════════════════════ */}
      {selectedZone && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="neumorph-card bg-[#f0f3f8] max-w-md w-full p-6 space-y-4 border border-white/80 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                  REAL-TIME FACILITY STATUS
                </span>
                <h3 className="font-bold text-base text-slate-900">
                  {selectedZone.name}
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedZone(null)
                  setSelectedPinDetails(null)
                }}
                className="w-8 h-8 rounded-full neumorph-btn flex items-center justify-center text-slate-500 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 neumorph-card-sm border-l-4 border-blue-600">
                <div className="flex items-center gap-1.5 text-blue-600 mb-0.5">
                  <Users className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold uppercase tracking-wide">Staff on Duty:</span>
                </div>
                <span className="font-black text-lg text-slate-900">
                  {selectedZone.staff_on_duty} Active
                </span>
                <span className="text-[9px] text-emerald-600 font-semibold block mt-0.5">
                  Working in real time
                </span>
              </div>

              <div className="p-3 neumorph-card-sm">
                <span className="text-slate-500 block text-[11px]">Current Load:</span>
                <span className="font-black text-lg text-slate-900">{selectedZone.workload_index}%</span>
                <span className={`text-[9px] font-bold ${
                  selectedZone.workload_index > 75 ? 'text-rose-600' :
                  selectedZone.workload_index > 50 ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {selectedZone.workload_index > 75 ? 'Attention' : selectedZone.workload_index > 50 ? 'Busy' : 'Optimal'}
                </span>
              </div>

              <div className="p-3 neumorph-card-sm">
                <span className="text-slate-500 block text-[11px]">Staff Required:</span>
                <span className="font-bold text-base text-slate-900">{selectedZone.staff_required_now} needed</span>
              </div>

              <div className="p-3 neumorph-card-sm">
                <span className="text-slate-500 block text-[11px]">Active Requests:</span>
                <span className="font-bold text-base text-slate-900">{selectedZone.backlog_count} open</span>
              </div>
            </div>

            {selectedPinDetails && (
              <div className="p-3 bg-blue-50/80 rounded-2xl text-xs space-y-1 border border-blue-200/60">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900">Assigned Team:</span>
                  <span className="text-[10px] text-blue-700 font-medium">{selectedPinDetails.department}</span>
                </div>
                <p className="text-[10px] text-blue-800 leading-tight">
                  {selectedPinDetails.description}
                </p>
              </div>
            )}

            <div className="pt-1 flex items-center justify-between gap-2">
              {selectedPinDetails && (
                <button
                  onClick={() => {
                    handleDeployStaff(String(selectedPinDetails.id))
                    setSelectedZone(prev => prev ? ({ ...prev, staff_on_duty: prev.staff_on_duty + 1 }) : null)
                  }}
                  className="flex-1 py-2.5 px-3 rounded-full neumorph-btn text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center justify-center gap-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Deploy +1 Staff Here</span>
                </button>
              )}

              <button
                onClick={() => {
                  setSelectedZone(null)
                  setSelectedPinDetails(null)
                }}
                className="py-2.5 px-5 neumorph-btn-blue text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
