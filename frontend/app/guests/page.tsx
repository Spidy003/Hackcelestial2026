'use client'

import React, { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  Search,
  Award,
  AlertTriangle,
  ShieldAlert,
  Heart,
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  Send,
  Coffee,
  Waves,
  Utensils,
  Car,
  Wrench,
  Star,
  PartyPopper,
  Flame,
  Check,
  ChevronRight,
  ArrowRight,
  Building,
  RefreshCw,
  ExternalLink,
  Info
} from 'lucide-react'
import { formatRupees } from '@/lib/format'
import { API_URL } from '@/lib/api'

// ── Types ──
interface OccasionOption {
  id: string
  label: string
  icon: string
  badge: string
  defaultVenue: string
  recommendedBundle: {
    id: string
    name: string
    price: number
    venue: string
    perks: string[]
  }
}

interface ActiveTicket {
  id: number | string
  guestName: string
  roomNumber: string
  ticketType: string
  title: string
  details: string
  department: string
  etaMinutes: number
  status: 'dispatched' | 'assigned' | 'in_progress' | 'resolved'
  timestamp: string
}

const OCCASIONS: OccasionOption[] = [
  {
    id: 'wedding',
    label: 'Wedding & Grand Function',
    icon: '💍',
    badge: 'Large Gathering / Celebration',
    defaultVenue: 'Mahal Banquet Hall & Mandwa Coastal Lawns',
    recommendedBundle: {
      id: 'wedding_decor',
      name: 'Royal Mandwa Wedding Banquet & Mandap Package',
      price: 120000,
      venue: 'Mahal Banquet Hall & Coastal Lawns',
      perks: [
        'Beachfront Mandap & Floral Pavilion Setup',
        'Traditional Shehnai & Dhol Arrival Welcome',
        'Dedicated Presidential Bridal Suite & Butler',
        'State-of-the-art Acoustic & Atmospheric Lighting',
        '8 Dedicated Banquet Stewards & Event Techs'
      ]
    }
  },
  {
    id: 'group',
    label: 'Group Trip & Corporate Offsite',
    icon: '👥',
    badge: 'Team / Group Fun',
    defaultVenue: 'Poolside Cabana Deck & Beach Water Sports',
    recommendedBundle: {
      id: 'group_retreat',
      name: 'Corporate & Group Adventure Retreat',
      price: 45000,
      venue: 'Poolside Deck & Water Sports Jetty',
      perks: [
        'Private Poolside Cabana Deck Reservation',
        'Sunset Catamaran Cruise & Jet-Ski Passes',
        'Beach Volleyball & Team Building Arena',
        'Evening Bonfire Barbecue Setup with DJ Sound',
        'Conference Pavilion with 4K Laser Projection'
      ]
    }
  },
  {
    id: 'family_kids',
    label: 'Family with Children',
    icon: '👨‍👩‍👧‍👦',
    badge: 'Kids & Family Fun',
    defaultVenue: 'Water Park, Splash Pool & Family Villas',
    recommendedBundle: {
      id: 'kids_waterpark_pass',
      name: 'Kids Adventure Splash & Family Fun Pass',
      price: 18000,
      venue: 'Water Park & Kids Activity Club',
      perks: [
        'All-Day Unlimited Splash Pool & Slide Access',
        'Supervised Sandcastle & Marine Treasure Hunt Club',
        'Evening Lawn Cartoon Movie Night with Popcorn Bar',
        'Complimentary Child Dining for Kids Under 8',
        'Certified Lifeguard Pool Priority Station'
      ]
    }
  },
  {
    id: 'honeymoon',
    label: 'Honeymoon & Romantic Sanctuary',
    icon: '🥂',
    badge: 'Couples & Romance',
    defaultVenue: 'Private Oceanfront Villa & Sunset Catamaran',
    recommendedBundle: {
      id: 'honeymoon_romance',
      name: 'Intimate Sunset Romance & Spa Sanctuary',
      price: 28000,
      venue: 'North Ocean Villa Lawn & Ananda Spa',
      perks: [
        'Private Sunset Champagne Catamaran Sail for Two',
        '90-Minute Couple Ayurvedic Abhyanga Massage',
        'Private Candlelit 5-Course Dinner on the Beach Sand',
        'Turn-Down Floral Plunge Pool Decoration',
        'Artisanal Chocolate & Strawberry Wine Welcome'
      ]
    }
  },
  {
    id: 'wellness',
    label: 'Wellness & Solo Detox Retreat',
    icon: '🌿',
    badge: 'Health & Rejuvenation',
    defaultVenue: 'Ananda Ayurvedic Villa & Herbal Garden',
    recommendedBundle: {
      id: 'spa_wellness_day',
      name: 'Holistic Ayurveda & Vitality Reset Package',
      price: 22000,
      venue: 'Ananda Spa & Wellness Centre',
      perks: [
        'Personal Dosha Consultation with Ayurvedic Doctor',
        'Daily Morning Beach Yoga & Guided Pranayama',
        'Herbal Steam Therapy & Shirodhara Session',
        'Cold-Pressed Organic Juices & Sattvic Meal Plan',
        'Hydrotherapy Thermal Pool Relaxation Pass'
      ]
    }
  }
]

const FOOD_PLANS = [
  {
    id: 'maharashtrian_royal',
    name: 'Royal Maharashtrian Coastal Feast',
    tag: 'Regional Specialty',
    description: 'Authentic Malvani curry, Puran Poli, Solkadhi, Tisrya masala, and warm Ukadiche Modak.',
    pricePerPerson: 1850
  },
  {
    id: 'coastal_seafood',
    name: 'Mandwa Fresh Catch & Seafood Extravaganza',
    tag: 'Chef Signature',
    description: 'Fresh Surmai Rawa Fry, Jumbo Tiger Prawns Koliwada, Butter Garlic Crab, and steamed rice.',
    pricePerPerson: 2450
  },
  {
    id: 'jain_pure_veg',
    name: 'Jain Pure-Vegetarian Heritage Thali',
    tag: 'Dedicated Kitchen',
    description: 'Strictly zero root vegetables (no onion/garlic/potato), Panchmel Dal, Shahi Paneer, Gatte ki Sabzi, and Kheer.',
    pricePerPerson: 1650
  },
  {
    id: 'kids_special',
    name: 'Kids Splash & Fun Gourmet Menu',
    tag: 'Kids Favorite',
    description: 'Mini cheese sliders, crispy wedges, creamy mac & cheese, fresh fruit popsicles, and Alphonso mango shakes.',
    pricePerPerson: 1200
  },
  {
    id: 'chef_tasting',
    name: 'Executive Chef 5-Course Coastal Fusion',
    tag: 'Luxury Dining',
    description: 'Five paired courses showcasing farm-to-table Konkan ingredients, artisanal breads, and sommelier pairing.',
    pricePerPerson: 3200
  }
]

export default function GuestsExperiencePage() {
  const [activeTab, setActiveTab] = useState<'booking' | 'tickets' | 'feedback' | 'directory'>('booking')

  // ── Booking Form State ──
  const [guestName, setGuestName] = useState('Ananya & Rohan Deshmukh')
  const [phone, setPhone] = useState('+91 98200 88776')
  const [language, setLanguage] = useState<'en' | 'hi' | 'mr'>('en')
  const [checkinDate, setCheckinDate] = useState('2026-11-20')
  const [checkoutDate, setCheckoutDate] = useState('2026-11-23')
  const [occasionId, setOccasionId] = useState<string>('wedding')
  const [partySize, setPartySize] = useState<number>(80)
  const [adultsCount, setAdultsCount] = useState<number>(65)
  const [childrenCount, setChildrenCount] = useState<number>(15)
  const [roomTypeId, setRoomTypeId] = useState<number>(1)
  const [foodPlanId, setFoodPlanId] = useState<string>('maharashtrian_royal')
  const [vegCount, setVegCount] = useState<number>(50)
  const [nonvegCount, setNonvegCount] = useState<number>(20)
  const [jainCount, setJainCount] = useState<number>(10)
  const [specialNotes, setSpecialNotes] = useState('Mandap setup facing sunset ocean horizon with Shehnai music on arrival.')
  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingConfirmation, setBookingConfirmation] = useState<any>(null)

  // ── Checkout & In-House Roster State ──
  const [checkedOutIds, setCheckedOutIds] = useState<Set<string>>(new Set())
  const [checkingOutId, setCheckingOutId] = useState<string | null>(null)
  const [checkoutMsg, setCheckoutMsg] = useState<string | null>(null)
  const [userBookings, setUserBookings] = useState<any[]>([])

  useEffect(() => {
    const syncCheckoutsAndBookings = () => {
      try {
        const co: string[] = JSON.parse(localStorage.getItem('resort_checked_out_guests') || '[]')
        setCheckedOutIds(new Set(co))
      } catch {}
      try {
        const ub: any[] = JSON.parse(localStorage.getItem('resort_active_bookings') || '[]')
        setUserBookings(ub)
      } catch {}
    }
    syncCheckoutsAndBookings()
    window.addEventListener('storage', syncCheckoutsAndBookings)
    window.addEventListener('resort-guest-checkout', syncCheckoutsAndBookings)
    window.addEventListener('resort-active-bookings-change', syncCheckoutsAndBookings)
    return () => {
      window.removeEventListener('storage', syncCheckoutsAndBookings)
      window.removeEventListener('resort-guest-checkout', syncCheckoutsAndBookings)
      window.removeEventListener('resort-active-bookings-change', syncCheckoutsAndBookings)
    }
  }, [])

  const handleCheckoutGuest = async (guest: { id: string | number; name: string; room: string }) => {
    const guestIdStr = String(guest.id)
    setCheckingOutId(guestIdStr)
    setCheckoutMsg(null)
    try {
      await fetch(`${API_URL}/api/guests/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_name: guest.name,
          room_number: guest.room
        })
      }).catch(() => {})

      const stored: string[] = JSON.parse(localStorage.getItem('resort_checked_out_guests') || '[]')
      if (!stored.includes(guestIdStr)) {
        stored.push(guestIdStr)
        localStorage.setItem('resort_checked_out_guests', JSON.stringify(stored))
      }
      setCheckedOutIds(new Set(stored))

      window.dispatchEvent(new Event('resort-guest-checkout'))
      window.dispatchEvent(new Event('storage'))

      setCheckoutMsg(`✓ Checkout processed for ${guest.name} (${guest.room})! Housekeeping turnaround dispatched.`)
    } catch (e) {
      console.error(e)
    } finally {
      setCheckingOutId(null)
    }
  }

  const handleUndoCheckout = (guestId: string | number) => {
    const guestIdStr = String(guestId)
    try {
      const stored: string[] = JSON.parse(localStorage.getItem('resort_checked_out_guests') || '[]')
      const filtered = stored.filter(id => id !== guestIdStr)
      localStorage.setItem('resort_checked_out_guests', JSON.stringify(filtered))
      setCheckedOutIds(new Set(filtered))

      window.dispatchEvent(new Event('resort-guest-checkout'))
      window.dispatchEvent(new Event('storage'))
      setCheckoutMsg(`Re-admitted guest to In-House roster.`)
    } catch (e) {}
  }

  // ── Ticketing Form State ──
  const [ticketGuestName, setTicketGuestName] = useState('Vikramaditya Singhania')
  const [ticketRoom, setTicketRoom] = useState('Villa 102')
  const [ticketType, setTicketType] = useState<'spa' | 'cab' | 'dining' | 'housekeeping' | 'maintenance'>('spa')
  const [ticketTitle, setTicketTitle] = useState('Couple Ayurvedic Abhyanga Massage Session')
  const [ticketDetails, setTicketDetails] = useState('Require 2 therapists at 5:00 PM today before dinner.')
  const [ticketPriority, setTicketPriority] = useState<number>(2)
  const [ticketLoading, setTicketLoading] = useState(false)
  const [ticketsList, setTicketsList] = useState<ActiveTicket[]>([
    {
      id: 'TCK-901',
      guestName: 'Vikramaditya Singhania',
      roomNumber: 'Villa 101',
      ticketType: 'spa',
      title: 'Couple Ayurvedic Abhyanga Massage Session',
      details: 'Reserved 2 therapists for 5:00 PM session.',
      department: 'Ananda Spa & Wellness',
      etaMinutes: 12,
      status: 'assigned',
      timestamp: '6 min ago'
    },
    {
      id: 'TCK-899',
      guestName: 'Kavita Iyer',
      roomNumber: 'Villa 104',
      ticketType: 'cab',
      title: 'Mandwa Jetty Speedboat Chauffeur Transfer',
      details: 'VIP Speedboat transfer coordination for 4 guests departing to Gateway of India.',
      department: 'Concierge & Transport',
      etaMinutes: 20,
      status: 'dispatched',
      timestamp: '14 min ago'
    },
    {
      id: 'TCK-895',
      guestName: 'Dr. Sameer Godbole',
      roomNumber: 'Villa 108',
      ticketType: 'dining',
      title: 'Fresh Catch Lobster & Solkadhi In-Villa Order',
      details: 'Private terrace candlelit dinner setup with coastal spices.',
      department: 'Mandwa Dining & F&B',
      etaMinutes: 25,
      status: 'in_progress',
      timestamp: '22 min ago'
    }
  ])

  // ── Feedback & Escalation State ──
  const [fbGuestName, setFbGuestName] = useState('Kavita Iyer')
  const [fbRoom, setFbRoom] = useState('Villa 104')
  const [fbRating, setFbRating] = useState<number>(1.5)
  const [fbCategory, setFbCategory] = useState<'dining' | 'stay' | 'spa' | 'service'>('dining')
  const [fbReview, setFbReview] = useState('Room service took 55 minutes and the food was cold. We had to call reception 3 times.')
  const [fbLoading, setFbLoading] = useState(false)
  const [fbSuccessModal, setFbSuccessModal] = useState<any>(null)

  // ── Computed Occasion & Pricing ──
  const selectedOccasion = useMemo(() => {
    return OCCASIONS.find(o => o.id === occasionId) || OCCASIONS[0]
  }, [occasionId])

  const selectedFoodPlan = useMemo(() => {
    return FOOD_PLANS.find(f => f.id === foodPlanId) || FOOD_PLANS[0]
  }, [foodPlanId])

  const calculatedQuote = useMemo(() => {
    const nights = Math.max(1, Math.round((new Date(checkoutDate).getTime() - new Date(checkinDate).getTime()) / (1000 * 3600 * 24)) || 3)
    const baseRoomRate = roomTypeId === 2 ? 22000 : roomTypeId === 3 ? 14000 : 18000
    const totalRoomCost = baseRoomRate * nights
    const bundleCost = selectedOccasion.recommendedBundle.price
    const foodCost = selectedFoodPlan.pricePerPerson * partySize * nights
    const grandTotal = totalRoomCost + bundleCost + foodCost
    return {
      nights,
      baseRoomRate,
      totalRoomCost,
      bundleCost,
      foodCost,
      grandTotal
    }
  }, [checkinDate, checkoutDate, roomTypeId, selectedOccasion, selectedFoodPlan, partySize])

  // Keep adult + children sum in sync with party size
  useEffect(() => {
    setPartySize(adultsCount + childrenCount)
    setVegCount(Math.round((adultsCount + childrenCount) * 0.6))
    setNonvegCount(Math.round((adultsCount + childrenCount) * 0.3))
    setJainCount(Math.max(0, (adultsCount + childrenCount) - Math.round((adultsCount + childrenCount) * 0.6) - Math.round((adultsCount + childrenCount) * 0.3)))
  }, [adultsCount, childrenCount])

  // ── 1. Handle Submit AI Booking ──
  const handleCreateBooking = async () => {
    setBookingLoading(true)
    try {
      const payload = {
        name: guestName,
        phone,
        language,
        checkin_date: `${checkinDate}T14:00:00`,
        checkout_date: `${checkoutDate}T11:00:00`,
        party_size: partySize,
        adults: adultsCount,
        children: childrenCount,
        occasion: occasionId,
        room_type_id: roomTypeId,
        selected_bundle_id: selectedOccasion.recommendedBundle.id,
        bundle_name: selectedOccasion.recommendedBundle.name,
        bundle_price: selectedOccasion.recommendedBundle.price,
        food_plan: foodPlanId,
        veg_count: vegCount,
        nonveg_count: nonvegCount,
        jain_count: jainCount,
        special_notes: specialNotes
      }

      let resData: any = null
      try {
        const res = await fetch(`${API_URL}/api/guests/create-personalized-booking`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (res.ok) {
          resData = await res.json()
        }
      } catch (e) {
        console.warn('Backend offline, using fallback response', e)
      }

      if (!resData) {
        resData = {
          status: 'confirmed',
          booking_id: Math.floor(100 + Math.random() * 900),
          guest_id: 301,
          guest_name: guestName,
          occasion: occasionId,
          venue_assigned: selectedOccasion.defaultVenue,
          food_plan: selectedFoodPlan.name,
          party_size: partySize,
          nights: calculatedQuote.nights,
          total_amount: calculatedQuote.grandTotal,
          message: `Booking confirmed for ${guestName}! Venue ${selectedOccasion.defaultVenue} allocated with ${selectedFoodPlan.name}.`
        }
      }

      // Save to local active bookings
      try {
        const saved = JSON.parse(localStorage.getItem('resort_active_bookings') || '[]')
        saved.unshift({
          ...resData,
          createdAt: new Date().toISOString(),
          bundle: selectedOccasion.recommendedBundle
        })
        localStorage.setItem('resort_active_bookings', JSON.stringify(saved))
        window.dispatchEvent(new Event('resort-active-bookings-change'))
        window.dispatchEvent(new Event('storage'))
      } catch (e) {}

      setBookingConfirmation(resData)
    } finally {
      setBookingLoading(false)
    }
  }

  // ── 2. Handle Raise Ticket ──
  const handleRaiseTicket = async () => {
    setTicketLoading(true)
    try {
      const payload = {
        guest_id: 101,
        guest_name: ticketGuestName,
        room_number: ticketRoom,
        ticket_type: ticketType,
        title: `[${ticketRoom}] ${ticketTitle}`,
        details: ticketDetails,
        priority: ticketPriority
      }

      let resData: any = null
      try {
        const res = await fetch(`${API_URL}/api/guests/raise-ticket`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (res.ok) {
          resData = await res.json()
        }
      } catch (e) {
        console.warn('Backend ticket call fallback', e)
      }

      const newTicket: ActiveTicket = {
        id: resData?.ticket_id ? `TCK-${resData.ticket_id}` : `TCK-${Math.floor(100 + Math.random() * 900)}`,
        guestName: ticketGuestName,
        roomNumber: ticketRoom,
        ticketType,
        title: ticketTitle,
        details: ticketDetails,
        department: resData?.department || (
          ticketType === 'spa' ? 'Ananda Spa & Wellness' :
          ticketType === 'cab' ? 'Concierge & Speedboat Transport' :
          ticketType === 'dining' ? 'Mandwa Dining & F&B' :
          ticketType === 'housekeeping' ? 'Housekeeping & Laundry' : 'Engineering & Facility Tech'
        ),
        etaMinutes: resData?.eta_minutes || (ticketPriority === 1 ? 8 : ticketPriority === 2 ? 15 : 30),
        status: 'dispatched',
        timestamp: 'Just now'
      }

      setTicketsList(prev => [newTicket, ...prev])
      alert(`Ticket dispatched in real time! Assigned to ${newTicket.department}. ETA: ${newTicket.etaMinutes} minutes.`)
    } finally {
      setTicketLoading(false)
    }
  }

  // ── 3. Handle Submit Feedback & Real-Time Escalation ──
  const handleSubmitFeedback = async () => {
    setFbLoading(true)
    try {
      const payload = {
        guest_id: 103,
        guest_name: fbGuestName,
        room_number: fbRoom,
        rating: fbRating,
        category: fbCategory,
        review_text: fbReview,
        aspects: [{ aspect: fbCategory, polarity: fbRating <= 2.5 ? 'negative' : 'positive' }]
      }

      let resData: any = null
      try {
        const res = await fetch(`${API_URL}/api/guests/submit-feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (res.ok) {
          resData = await res.json()
        }
      } catch (e) {
        console.warn('Backend feedback call fallback', e)
      }

      const isNegative = fbRating <= 2.5
      const alertId = `alt-esc-${Date.now()}`

      if (isNegative) {
        // Immediate broadcast to Owner Dashboard via localStorage and events
        const escalatedAlert = {
          id: alertId,
          title: `🚨 Negative Feedback Escalation [${fbRoom} - ${fbGuestName}]`,
          line: `${fbRating}★ Review: "${fbReview}"`,
          severity: 'high',
          time: 'Just now',
          zone: 'Guest Villas & Suites',
          recommendedAction: 'Dispatch Service Recovery: Duty Manager visit + complimentary dining credit & fruit platter.',
          department: 'Guest Experience & Executive Care'
        }

        try {
          const savedEsc = JSON.parse(localStorage.getItem('resort_escalated_alerts') || '[]')
          savedEsc.unshift(escalatedAlert)
          localStorage.setItem('resort_escalated_alerts', JSON.stringify(savedEsc))
          window.dispatchEvent(new Event('storage'))
        } catch (e) {}
      }

      setFbSuccessModal({
        rating: fbRating,
        isNegative,
        message: isNegative
          ? 'Critical alert dispatched to General Manager & Owner Dashboard (/owner). An executive service recovery is on its way.'
          : 'Thank you for your generous feedback! Your positive review has improved our resort GERS score.',
        alertId: isNegative ? alertId : null
      })
    } finally {
      setFbLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16 font-sans">
      {/* ══════════════════════════════════════════════════════════════
          HERO BANNER & LIVE METRICS
          ══════════════════════════════════════════════════════════════ */}
      <div className="p-6 rounded-3xl bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
              Real-Time AI Concierge & Guest Experience Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Guest Experience, Occasion Customization & Fast Ticketing
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Tailor high-value bespoke stays (weddings, corporate retreats, family splash trips), order on-demand services (spa, cab, dining), and monitor real-time sentiment escalation to the owner dashboard.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 shrink-0">
          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center min-w-[110px]">
            <span className="text-[10px] font-semibold text-slate-300 block uppercase">Overall GERS</span>
            <span className="text-2xl font-black text-emerald-400">92 / 100</span>
            <span className="text-[9px] text-emerald-300 block">Top Tier Luxury</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center min-w-[110px]">
            <span className="text-[10px] font-semibold text-slate-300 block uppercase">Active Tickets</span>
            <span className="text-2xl font-black text-amber-400">{ticketsList.length} Live</span>
            <span className="text-[9px] text-slate-300 block">&lt; 15 min SLA</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          NAVIGATION TABS
          ══════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('booking')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'booking'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <PartyPopper className="w-4 h-4" />
          <span>1. AI Occasion Booking & Custom Package</span>
        </button>

        <button
          onClick={() => setActiveTab('tickets')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'tickets'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>2. Guest Services & Fast Ticketing</span>
          <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 text-[10px]">
            {ticketsList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('feedback')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'feedback'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span>3. Feedback & Owner Escalation</span>
          <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
            Real-Time
          </span>
        </button>

        <button
          onClick={() => setActiveTab('directory')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'directory'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>4. In-House Guest Directory</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TAB 1: AI OCCASION BOOKING & CUSTOM PACKAGES
          ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'booking' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Interactive Booking Form */}
          <div className="lg:col-span-8 space-y-6">
            {/* Step 1: Occasion Type */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                    STEP 1 • OCCASION INTELLIGENCE
                  </span>
                  <h2 className="text-lg font-black text-slate-900">
                    What occasion is this booking for?
                  </h2>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  AI will auto-match venue & curated amenities
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {OCCASIONS.map((occ) => {
                  const isSelected = occ.id === occasionId
                  return (
                    <button
                      key={occ.id}
                      type="button"
                      onClick={() => setOccasionId(occ.id)}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-2xl">{occ.icon}</span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {occ.badge}
                          </span>
                        </div>
                        <h3 className="font-black text-sm text-slate-900 mt-2">
                          {occ.label}
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium line-clamp-2">
                          {occ.defaultVenue}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-semibold">AI Recommended Venue</span>
                        <CheckCircle2 className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-300'}`} />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Step 2: Guest Details & Party Size */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                STEP 2 • GUEST PROFILE & PARTY SIZING
              </span>
              <h2 className="text-lg font-black text-slate-900">
                Primary Contact & Gathering Sizing
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Guest / Group Name
                  </label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 focus:outline-blue-500"
                    placeholder="e.g. Aarav & Simran Wedding"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Phone Contact (WhatsApp Updates)
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 focus:outline-blue-500"
                    placeholder="+91 98200 12345"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Preferred Language
                  </label>
                  <select
                    value={language}
                    onChange={(e: any) => setLanguage(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 focus:outline-blue-500 bg-white"
                  >
                    <option value="en">English</option>
                    <option value="hi">हिंदी (Hindi)</option>
                    <option value="mr">मराठी (Marathi)</option>
                  </select>
                </div>
              </div>

              {/* Sizing Sliders */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-700">Total Party Size</span>
                    <span className="text-sm font-black text-blue-600">{partySize} Guests</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    {adultsCount} Adults + {childrenCount} Children
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-700">Adult Guests</span>
                    <span className="text-sm font-black text-slate-900">{adultsCount}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={250}
                    value={adultsCount}
                    onChange={(e) => setAdultsCount(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-700">Children Guests</span>
                    <span className="text-sm font-black text-slate-900">{childrenCount}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={60}
                    value={childrenCount}
                    onChange={(e) => setChildrenCount(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>
              </div>

              {/* Dates & Room Type */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Check-In Date
                  </label>
                  <input
                    type="date"
                    value={checkinDate}
                    onChange={(e) => setCheckinDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Check-Out Date ({calculatedQuote.nights} Nights)
                  </label>
                  <input
                    type="date"
                    value={checkoutDate}
                    onChange={(e) => setCheckoutDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Primary Villa Category
                  </label>
                  <select
                    value={roomTypeId}
                    onChange={(e) => setRoomTypeId(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white"
                  >
                    <option value={1}>Deluxe Beachfront Villa (₹18,000/nt)</option>
                    <option value={2}>Presidential Ocean Suite (₹22,000/nt)</option>
                    <option value={3}>Royal Garden Family Cottage (₹14,000/nt)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Step 3: Personalized Food & Dining Plan */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                    STEP 3 • RESTAURANT & KITCHEN REAL-TIME SYNC
                  </span>
                  <h2 className="text-lg font-black text-slate-900">
                    Curated Cuisine & Dietary Allocation
                  </h2>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <Utensils className="w-3 h-3" /> Live Kitchen Cover Sync
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FOOD_PLANS.map((plan) => {
                  const isSelected = plan.id === foodPlanId
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setFoodPlanId(plan.id)}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/40 shadow-sm ring-1 ring-blue-500/30'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {plan.tag}
                        </span>
                        <span className="text-xs font-black text-slate-900">
                          {formatRupees(plan.pricePerPerson)}/cover
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-slate-900">{plan.name}</h3>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                        {plan.description}
                      </p>
                    </button>
                  )
                })}
              </div>

              {/* Dietary Split Controls */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-bold text-emerald-700 block">Vegetarian Covers</span>
                  <div className="flex items-center justify-between mt-1">
                    <input
                      type="number"
                      value={vegCount}
                      onChange={(e) => setVegCount(Number(e.target.value))}
                      className="w-16 px-2 py-1 text-xs font-black rounded-lg border border-slate-300"
                    />
                    <span className="text-[10px] text-slate-500">Covers reserved</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-bold text-rose-700 block">Non-Vegetarian Covers</span>
                  <div className="flex items-center justify-between mt-1">
                    <input
                      type="number"
                      value={nonvegCount}
                      onChange={(e) => setNonvegCount(Number(e.target.value))}
                      className="w-16 px-2 py-1 text-xs font-black rounded-lg border border-slate-300"
                    />
                    <span className="text-[10px] text-slate-500">Fresh catch ordered</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-bold text-amber-700 block">Jain / No-Root Covers</span>
                  <div className="flex items-center justify-between mt-1">
                    <input
                      type="number"
                      value={jainCount}
                      onChange={(e) => setJainCount(Number(e.target.value))}
                      className="w-16 px-2 py-1 text-xs font-black rounded-lg border border-slate-300"
                    />
                    <span className="text-[10px] text-slate-500">Dedicated kitchen</span>
                  </div>
                </div>
              </div>

              {/* Special Notes */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Special Notes & Custom Arrangements for Butler & Concierge
                </label>
                <textarea
                  rows={2}
                  value={specialNotes}
                  onChange={(e) => setSpecialNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-blue-500"
                  placeholder="e.g. Mandap facing sea, shehnai welcome, welcome coconut water for guests..."
                />
              </div>
            </div>
          </div>

          {/* Right: AI Recommendation, Price Quote & Instant Dispatch */}
          <div className="lg:col-span-4 space-y-6">
            {/* AI Package Recommendation Card */}
            <div className="p-6 rounded-3xl bg-linear-to-b from-blue-900 to-slate-900 text-white shadow-xl space-y-5 border border-blue-700/50 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-400" /> AI Matched Package
                </span>
                <span className="text-xs font-black text-amber-400">
                  {formatRupees(selectedOccasion.recommendedBundle.price)}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-blue-300 font-semibold block uppercase">
                  Allocated Facility & Venue
                </span>
                <h3 className="text-base font-black text-white mt-0.5">
                  {selectedOccasion.defaultVenue}
                </h3>
              </div>

              {/* Inclusions List */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <span className="text-[10px] font-bold text-blue-200 uppercase tracking-wider block">
                  Included Bespoke Amenities & Services:
                </span>
                <ul className="space-y-1.5 text-xs text-slate-200">
                  {selectedOccasion.recommendedBundle.perks.map((perk, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Real-time agent integration note */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-[11px] text-slate-300 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>
                  Confirming this order instantly alerts the <strong>Concierge Agent</strong>, updates <strong>Staffing rosters</strong>, and broadcasts dinner covers to <strong>Kitchen inventory</strong>.
                </span>
              </div>

              {/* Quote Breakdown */}
              <div className="pt-3 border-t border-white/10 space-y-2 font-sans">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Villa Stay ({calculatedQuote.nights} nights)</span>
                  <span>{formatRupees(calculatedQuote.totalRoomCost)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-300">
                  <span>AI Occasion Bundle</span>
                  <span>{formatRupees(calculatedQuote.bundleCost)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Dining ({partySize} guests × {calculatedQuote.nights}n)</span>
                  <span>{formatRupees(calculatedQuote.foodCost)}</span>
                </div>
                <div className="pt-2 border-t border-white/15 flex justify-between items-baseline">
                  <span className="text-xs font-bold text-white uppercase">Grand Total</span>
                  <span className="text-xl font-black text-amber-300">
                    {formatRupees(calculatedQuote.grandTotal)}
                  </span>
                </div>
              </div>

              {/* Dispatch Button */}
              <button
                disabled={bookingLoading}
                onClick={handleCreateBooking}
                className="w-full py-3.5 px-4 rounded-2xl bg-linear-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {bookingLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Allocating Venue & Staffing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Confirm & Dispatch AI Personalized Booking →</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Booking */}
      {bookingConfirmation && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="text-center space-y-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                REAL-TIME EVENT BROADCAST CONFIRMED
              </span>
              <h3 className="text-lg font-black text-slate-900">
                Personalized Booking Secured!
              </h3>
              <p className="text-xs text-slate-600">
                Booking <strong>#{bookingConfirmation.booking_id}</strong> for <strong>{bookingConfirmation.guest_name}</strong> was confirmed with venue allocation and live kitchen provisioning.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Allocated Venue:</span>
                <span className="font-bold text-slate-900 text-right">{bookingConfirmation.venue_assigned}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Party Size:</span>
                <span className="font-bold text-slate-900">{bookingConfirmation.party_size} Guests</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dining Plan:</span>
                <span className="font-bold text-slate-900">{bookingConfirmation.food_plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Grand Total:</span>
                <span className="font-black text-blue-600">{formatRupees(bookingConfirmation.total_amount)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/owner"
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs text-center hover:bg-slate-100"
              >
                View in Owner Dashboard
              </Link>
              <button
                onClick={() => setBookingConfirmation(null)}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md hover:bg-blue-700 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 2: GUEST FAST TICKETING & SERVICES
          ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'tickets' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Raise a Ticket Form */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                  FAST GUEST REQUEST DISPATCH
                </span>
                <h2 className="text-lg font-black text-slate-900">
                  Raise Real-Time Guest Service Ticket
                </h2>
                <p className="text-xs text-slate-500">
                  Instant routing to on-duty staff with live SLA tracking.
                </p>
              </div>

              {/* Service Categories Quick Selector */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { type: 'spa', icon: <Waves className="w-4 h-4 text-teal-600" />, label: 'Ananda Spa' },
                  { type: 'cab', icon: <Car className="w-4 h-4 text-blue-600" />, label: 'Cab / Jetty' },
                  { type: 'dining', icon: <Utensils className="w-4 h-4 text-amber-600" />, label: 'In-Villa Dining' },
                  { type: 'housekeeping', icon: <Coffee className="w-4 h-4 text-indigo-600" />, label: 'Housekeeping' },
                  { type: 'maintenance', icon: <Wrench className="w-4 h-4 text-rose-600" />, label: 'Maintenance' },
                ].map((cat) => {
                  const isSelected = ticketType === cat.type
                  return (
                    <button
                      key={cat.type}
                      type="button"
                      onClick={() => {
                        setTicketType(cat.type as any)
                        if (cat.type === 'spa') setTicketTitle('Couple Ayurvedic Abhyanga Massage Session')
                        if (cat.type === 'cab') setTicketTitle('Mandwa Jetty Speedboat Chauffeur Transfer')
                        if (cat.type === 'dining') setTicketTitle('Fresh Catch Seafood & Solkadhi Room Service')
                        if (cat.type === 'housekeeping') setTicketTitle('Organic Cotton Suite Towels & Toiletries')
                        if (cat.type === 'maintenance') setTicketTitle('Air Conditioning Temperature Calibration')
                      }}
                      className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-bold shadow-2xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {cat.icon}
                      <span className="text-[11px]">{cat.label}</span>
                    </button>
                  )
                })}
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Guest Name
                    </label>
                    <input
                      type="text"
                      value={ticketGuestName}
                      onChange={(e) => setTicketGuestName(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Room / Villa Number
                    </label>
                    <input
                      type="text"
                      value={ticketRoom}
                      onChange={(e) => setTicketRoom(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Request Title
                  </label>
                  <input
                    type="text"
                    value={ticketTitle}
                    onChange={(e) => setTicketTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Specific Timing / Instructions
                  </label>
                  <textarea
                    rows={2}
                    value={ticketDetails}
                    onChange={(e) => setTicketDetails(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200"
                    placeholder="Provide details for staff execution..."
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Urgency & Priority
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { level: 1, label: 'VIP / Urgent (8m)', color: 'border-rose-300 text-rose-700' },
                      { level: 2, label: 'Standard (15m)', color: 'border-blue-300 text-blue-700' },
                      { level: 3, label: 'Flexible (30m)', color: 'border-slate-300 text-slate-700' }
                    ].map(p => (
                      <button
                        key={p.level}
                        type="button"
                        onClick={() => setTicketPriority(p.level)}
                        className={`py-1.5 px-2 rounded-xl text-[10.5px] font-bold border cursor-pointer ${
                          ticketPriority === p.level
                            ? 'bg-slate-900 text-white border-slate-900'
                            : `${p.color} bg-white hover:bg-slate-50`
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  disabled={ticketLoading}
                  onClick={handleRaiseTicket}
                  className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Dispatch Request in Real Time</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right: Live Tickets Feed & SLA Monitor */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <h3 className="font-black text-sm text-slate-900">
                  Live Guest Service Queue & Staff Dispatch Board
                </h3>
                <span className="text-xs text-slate-500">
                  Real-time SLA monitoring across Spa, Cab, F&B and Engineering
                </span>
              </div>
              <span className="px-3 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 animate-pulse">
                LIVE DISPATCH
              </span>
            </div>

            <div className="space-y-3">
              {ticketsList.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[10px] font-bold text-slate-800">
                        {t.id}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
                        {t.roomNumber}
                      </span>
                      <span className="font-bold text-xs text-slate-900">
                        {t.guestName}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-slate-900">
                      {t.title}
                    </h4>

                    <p className="text-xs text-slate-600 line-clamp-1">
                      {t.details}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                      <span>Assigned to: <strong>{t.department}</strong></span>
                      <span>•</span>
                      <span>Target SLA: <strong className="text-blue-600">{t.etaMinutes} mins</strong></span>
                      <span>•</span>
                      <span>{t.timestamp}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                      {t.status}
                    </span>
                    <button
                      onClick={() => {
                        setTicketsList(prev => prev.filter(x => x.id !== t.id))
                      }}
                      className="px-3 py-1 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-600 cursor-pointer"
                    >
                      Resolve ✓
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 3: GUEST FEEDBACK & REAL-TIME OWNER ESCALATION
          ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'feedback' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 space-y-6">
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                  GUEST EXPERIENCE & GERS RECOVERY
                </span>
                <h2 className="text-lg font-black text-slate-900">
                  Guest Feedback & Rating Submission
                </h2>
                <p className="text-xs text-slate-500">
                  Low ratings (&le; 2.5★) immediately escalate to the Owner Dashboard for instant GM service recovery!
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Guest Name</label>
                  <input
                    type="text"
                    value={fbGuestName}
                    onChange={(e) => setFbGuestName(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Room Number</label>
                  <input
                    type="text"
                    value={fbRoom}
                    onChange={(e) => setFbRoom(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              {/* Star Rating Interactive Selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Overall Rating ({fbRating} Stars)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((starVal) => {
                    const isFilled = fbRating >= starVal
                    return (
                      <button
                        key={starVal}
                        type="button"
                        onClick={() => setFbRating(starVal)}
                        className="p-2 rounded-xl hover:bg-slate-100 transition-transform hover:scale-110 cursor-pointer"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            isFilled
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Experience Category
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'dining', label: 'Dining & Bar' },
                    { id: 'stay', label: 'Villa & Stay' },
                    { id: 'spa', label: 'Spa & Wellness' },
                    { id: 'service', label: 'Staff Service' }
                  ].map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setFbCategory(c.id as any)}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border cursor-pointer ${
                        fbCategory === c.id
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Review Text */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Guest Comments & Observations
                </label>
                <textarea
                  rows={3}
                  value={fbReview}
                  onChange={(e) => setFbReview(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-blue-500"
                  placeholder="Share details of your experience..."
                />
              </div>

              {/* Visual Real-Time Escalation Warning */}
              {fbRating <= 2.5 ? (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-black uppercase tracking-wider block text-[10px]">
                      🚨 AUTOMATIC REAL-TIME OWNER ESCALATION
                    </span>
                    Submitting this negative review (&le; 2.5★) will immediately create an emergency alert on the <strong>Owner Dashboard (/owner)</strong> and dispatch the Duty Manager for service recovery.
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-800">
                  <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-black uppercase tracking-wider block text-[10px]">
                      ✨ POSITIVE DELIGHT BROADCAST
                    </span>
                    This positive review will boost the resort's GERS score and be highlighted in the weekly executive summary.
                  </div>
                </div>
              )}

              <button
                disabled={fbLoading}
                onClick={handleSubmitFeedback}
                className={`w-full py-3 rounded-2xl font-bold text-xs text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  fbRating <= 2.5 ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>
                  {fbRating <= 2.5
                    ? 'Submit & Trigger Real-Time Owner Escalation'
                    : 'Submit Guest Review'}
                </span>
              </button>
            </div>
          </div>

          {/* Right: Owner Escalation Preview & Direct Link */}
          <div className="lg:col-span-6 space-y-6">
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">
                    HOW THE REAL-TIME SYSTEM WORKS
                  </span>
                  <h3 className="text-base font-black text-slate-900">
                    Direct Feedback-to-Owner Pipeline
                  </h3>
                </div>
                <Link
                  href="/owner"
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs"
                >
                  <span>Open /owner</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0 text-xs">
                    1
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">Guest Submits Review</span>
                    <span className="text-slate-600">
                      The Guest Experience Sentiment Agent scans the feedback text and star rating in milliseconds.
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold shrink-0 text-xs">
                    2
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">Immediate Alert Raised on Owner Feed</span>
                    <span className="text-slate-600">
                      If rating is &le; 2.5★, a high-severity alert card appears at the very top of the Owner Dashboard alert queue.
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0 text-xs">
                    3
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">1-Click Service Recovery Dispatch</span>
                    <span className="text-slate-600">
                      Owner clicks &ldquo;Dispatch Operations Team&rdquo; / &ldquo;Dispatch Service Recovery&rdquo;. The affected villa zone pin calms, a credit is granted, and the win logs to <code>/owner/week</code>.
                    </span>
                  </div>
                </div>
              </div>

              {/* Sample Escalation Card Preview */}
              <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-700 uppercase">
                    HIGH PRIORITY ESCALATION
                  </span>
                  <span className="text-[10px] text-slate-500">Just now</span>
                </div>
                <h4 className="font-bold text-xs text-slate-900">
                  🚨 Guest Escalation [Villa 104 - Kavita Iyer]
                </h4>
                <p className="text-[11px] text-slate-600">
                  1.5★ Review: &ldquo;Room service took 55 minutes and the food was cold.&rdquo;
                </p>
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[10px] text-blue-700 font-bold">
                    Recommended: Dispatch GM Visit & Dining Credit
                  </span>
                  <Link
                    href="/owner"
                    className="px-3 py-1 rounded-full bg-rose-600 text-white font-bold text-[10px]"
                  >
                    View Alert on /owner →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Submission Result Modal */}
      {fbSuccessModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-in zoom-in-95 text-center">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto shadow-md ${
              fbSuccessModal.isNegative ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
            }`}>
              {fbSuccessModal.isNegative ? <ShieldAlert className="w-7 h-7" /> : <CheckCircle2 className="w-7 h-7" />}
            </div>

            <div className="space-y-1">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                fbSuccessModal.isNegative ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {fbSuccessModal.isNegative ? 'ESCALATED TO OWNER DASHBOARD' : 'FEEDBACK RECORDED'}
              </span>
              <h3 className="text-lg font-black text-slate-900">
                {fbSuccessModal.isNegative ? 'Executive Service Recovery Dispatched!' : 'Thank You For Your Feedback!'}
              </h3>
              <p className="text-xs text-slate-600">
                {fbSuccessModal.message}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Link
                href="/owner"
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md text-center"
              >
                Go to Owner Dashboard to See Alert →
              </Link>
              <button
                onClick={() => setFbSuccessModal(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 4: IN-HOUSE GUEST DIRECTORY & GERS SCORES
          ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'directory' && (() => {
        const defaultGuests = [
          {
            id: '101',
            name: 'Vikramaditya Singhania',
            room: 'Presidential Suite 501',
            tier: 'platinum',
            gers: 94,
            occasion: 'Family Luxury Holiday',
            ltv: 620000,
            drivers: ['Expedited check-in', 'Private pool cabana', 'Sommelier wine pairing']
          },
          {
            id: '102',
            name: 'Ananya & Rohan Deshmukh',
            room: 'Beachfront Villa 102',
            tier: 'gold',
            gers: 88,
            occasion: 'Honeymoon & Romantic Retreat',
            ltv: 280000,
            drivers: ['Honeymoon floral setup', 'Mandwa catamaran cruise']
          },
          {
            id: '103',
            name: 'Kavita Iyer',
            room: 'North Villa 104',
            tier: 'silver',
            gers: 56,
            occasion: 'Weekend Getaway',
            ltv: 145000,
            drivers: ['Delayed room service', 'Noise from lawn']
          },
          {
            id: '104',
            name: 'Dr. Sameer Godbole',
            room: 'Garden Cottage 205',
            tier: 'gold',
            gers: 64,
            occasion: 'Ayurveda Health Retreat',
            ltv: 310000,
            drivers: ['Delayed spa therapist', 'Wi-Fi disconnect during zoom']
          },
          {
            id: '105',
            name: 'Meera & Siddharth Joshi',
            room: 'Family Suite 302',
            tier: 'platinum',
            gers: 91,
            occasion: 'Kids Splash & Birthday',
            ltv: 490000,
            drivers: ['Kids activity club', 'Sunset terrace dining']
          }
        ]

        const dynamicGuests = userBookings.map((b, idx) => ({
          id: `usr-${b.booking_id || idx}`,
          name: b.guest_name || 'VIP Guest',
          room: b.venue_assigned ? `${b.venue_assigned} (Suite ${110 + idx})` : `Villa ${110 + idx}`,
          tier: (b.party_size >= 30 ? 'platinum' : b.party_size >= 4 ? 'gold' : 'silver'),
          gers: 96,
          occasion: b.occasion ? `${b.occasion.toUpperCase()} • ${b.food_plan || 'Custom Plan'}` : 'Direct Booking',
          ltv: b.total_amount || 95000,
          drivers: ['Personalized AI Package', 'Arrival Concierge Welcome', 'Dynamic Venue Allocation']
        }))

        const fullRoster = [...dynamicGuests, ...defaultGuests]
        const activeInHouse = fullRoster.filter(g => !checkedOutIds.has(String(g.id)))
        const checkedOutList = fullRoster.filter(g => checkedOutIds.has(String(g.id)))

        return (
          <div className="space-y-4">
            {/* Header with Stats & Batch Actions */}
            <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-sm text-slate-900">
                  In-House Guest Roster & Lifetime Value (LTV)
                </h3>
                <span className="text-xs text-slate-500">
                  Real-time Guest Experience Rating Score (GERS), LTV analytics, and one-click guest checkout.
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {activeInHouse.length} Active In-House
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {checkedOutList.length} Checked Out
                </span>

                {activeInHouse.length > 0 && (
                  <button
                    onClick={() => {
                      const allIds = fullRoster.map(g => String(g.id))
                      localStorage.setItem('resort_checked_out_guests', JSON.stringify(allIds))
                      setCheckedOutIds(new Set(allIds))
                      window.dispatchEvent(new Event('resort-guest-checkout'))
                      window.dispatchEvent(new Event('storage'))
                      setCheckoutMsg(`✓ All ${fullRoster.length} guests checked out! All rooms marked Vacant Dirty • Housekeeping turnaround dispatched.`)
                    }}
                    className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer"
                  >
                    Check Out All Guests
                  </button>
                )}

                {checkedOutList.length > 0 && (
                  <button
                    onClick={() => {
                      localStorage.removeItem('resort_checked_out_guests')
                      setCheckedOutIds(new Set())
                      window.dispatchEvent(new Event('resort-guest-checkout'))
                      window.dispatchEvent(new Event('storage'))
                      setCheckoutMsg(`✓ All guests re-admitted to active in-house roster!`)
                    }}
                    className="px-3 py-1 rounded-full text-xs font-bold bg-slate-900 hover:bg-black text-white transition-all cursor-pointer"
                  >
                    Check In All / Reset Roster
                  </button>
                )}
              </div>
            </div>

            {/* Notification Toast */}
            {checkoutMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl flex items-center justify-between text-xs font-medium shadow-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{checkoutMsg}</span>
                </div>
                <button
                  onClick={() => setCheckoutMsg(null)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900 ml-4"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Guest Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fullRoster.map((g) => {
                const isCheckedOut = checkedOutIds.has(String(g.id))
                const isAtRisk = g.gers < 70 && !isCheckedOut
                const isCheckingThis = checkingOutId === String(g.id)

                return (
                  <div
                    key={g.id}
                    className={`p-5 rounded-3xl bg-white border transition-all ${
                      isCheckedOut
                        ? 'opacity-75 bg-slate-50 border-slate-200'
                        : isAtRisk
                        ? 'border-rose-300 ring-2 ring-rose-100 shadow-sm'
                        : 'border-slate-200/80 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            isCheckedOut ? 'bg-slate-200 text-slate-600' :
                            g.tier === 'platinum' ? 'bg-amber-100 text-amber-800' :
                            g.tier === 'gold' ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {g.tier}
                          </span>
                          <span className={`text-xs font-bold ${isCheckedOut ? 'line-through text-slate-400' : 'text-slate-500'}`}>
                            {g.room}
                          </span>
                        </div>
                        <h4 className="font-black text-sm text-slate-900 mt-1">
                          {g.name}
                        </h4>
                        <span className="text-[11px] text-blue-600 font-semibold block">
                          {g.occasion}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className={`text-xl font-black ${
                          isCheckedOut ? 'text-slate-400' :
                          g.gers >= 85 ? 'text-emerald-600' : g.gers >= 70 ? 'text-amber-600' : 'text-rose-600'
                        }`}>
                          {isCheckedOut ? '—' : g.gers}
                        </span>
                        <span className="text-[9px] text-slate-500 block font-semibold uppercase">
                          {isCheckedOut ? 'OUT' : 'GERS'}
                        </span>
                      </div>
                    </div>

                    {isAtRisk && (
                      <div className="mt-3 p-2 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-[11px] text-rose-700 font-semibold">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                        <span>Executive Service Recovery Dispatched</span>
                      </div>
                    )}

                    {isCheckedOut && (
                      <div className="mt-3 p-2 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-[11px] text-emerald-800 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Room vacant dirty • Housekeeping assigned</span>
                      </div>
                    )}

                    <div className="mt-3 space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Experience Drivers:</span>
                      <div className="flex flex-wrap gap-1">
                        {g.drivers.map((d, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10.5px]">
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Footer: Lifetime Value & Check Out Action */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium uppercase">Lifetime Value</span>
                        <span className="font-black text-slate-900 text-xs">{formatRupees(g.ltv, true)}</span>
                      </div>

                      {isCheckedOut ? (
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            ✓ Checked Out
                          </span>
                          <button
                            onClick={() => handleUndoCheckout(g.id)}
                            className="text-[10px] text-slate-500 hover:text-slate-900 underline font-semibold cursor-pointer"
                          >
                            Undo
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleCheckoutGuest(g)}
                          disabled={isCheckingThis}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-black text-white active:scale-95 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {isCheckingThis ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>Checking Out...</span>
                            </>
                          ) : (
                            <>
                              <span>Check Out Guest</span>
                              <ArrowRight className="w-3 h-3" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
