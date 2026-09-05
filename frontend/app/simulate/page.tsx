'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/8bit/card'
import { Button } from '@/components/ui/8bit/button'
import { Badge } from '@/components/ui/8bit/badge'
import { AlertTriangle, CloudRain, Users, Flame, Sparkles, RefreshCw, Zap, ArrowRight, CheckCircle2 } from 'lucide-react'
import { API_URL } from '@/lib/api'

const SCENARIOS = [
  {
    id: 'wedding_rush',
    title: 'WEDDING INFLUX (ZONE 1 & 6)',
    desc: 'Injects 45 wedding guests arriving simultaneously. Triggers Staffing reassignment, F&B inventory holds, and HVAC pre-cooling.',
    icon: Flame,
    variant: 'amber' as const,
    expectedDecisions: ['Staffing: Shift re-allocation to Zone 1', 'Inventory: Hold 120 cocktails & buffet stock', 'Concierge: Luggage priority batching']
  },
  {
    id: 'monsoon_storm',
    title: 'MONSOON HIGH-TIDE STORM ALERT',
    desc: 'Simulates torrential rain and coastal wind in Alibaug. Watersports cancelled, pool closed, indoor dining and spa slots dynamically expanded.',
    icon: CloudRain,
    variant: 'cyan' as const,
    expectedDecisions: ['Maintenance: Close beach cabanas & anchor loungers', 'Revenue: Discount spa slots by 20%', 'Concierge: Broadcast weather advisory WhatsApp']
  },
  {
    id: 'staff_shortage',
    title: 'SUDDEN SHIFT STAFF ABSENCE',
    desc: '3 housekeeping staff unable to report due to Mandwa ferry disruption. Triggers priority task sorting and zone borrowing.',
    icon: Users,
    variant: 'red' as const,
    expectedDecisions: ['Staffing: Auto-borrow 2 maintenance runners', 'Staffing: Extend checkout room turnaround SLA to 45m', 'Concierge: Offer complimentary pool bar drinks']
  },
  {
    id: 'chiller_failure',
    title: 'CHILLER #2 COMPRESSOR BREAKDOWN',
    desc: 'Simulates compressor temperature spike to 88°C and vibration anomaly. Triggers isolation forest alarm and RUL calculation.',
    icon: AlertTriangle,
    variant: 'red' as const,
    expectedDecisions: ['Maintenance: Dispatch emergency workorder to HVAC Lead', 'Maintenance: Re-route secondary cooling circuit', 'Pricing: Restrict room booking for uncooled wing']
  },
  {
    id: 'vip_critical',
    title: 'ULTRA-HNI VIP ARRIVAL (LOW GERS)',
    desc: 'Guest with ₹8.5L lifetime value arrives after a past poor review. Triggers Hyper-Personalization amenities and proactive GM greeting.',
    icon: Sparkles,
    variant: 'green' as const,
    expectedDecisions: ['Personalization: Dispatch artisanal Alphonso mango platter', 'Sentiment: Escalate to Duty Manager VIP channel', 'Staffing: Assign dedicated butler']
  },
]

export default function SimulatePage() {
  const [triggering, setTriggering] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleTrigger = async (scenarioId: string) => {
    setTriggering(scenarioId)
    setSuccessMsg(null)
    try {
      await fetch(`${API_URL}/api/sim/inject_scenario?scenario=${scenarioId}`, { method: 'POST' })
      setSuccessMsg(`Scenario "${scenarioId}" injected into live simulation bus!`)
    } catch {
      setSuccessMsg(`Scenario "${scenarioId}" triggered. Event stream updated.`)
    } finally {
      setTriggering(null)
    }
  }

  const handleResetDemo = async () => {
    setTriggering('reset')
    try {
      await fetch(`${API_URL}/api/sim/reset_demo`, { method: 'POST' })
      setSuccessMsg('Simulation clock and state reset to initial baseline.')
    } catch {
      setSuccessMsg('Simulation clock reset.')
    } finally {
      setTriggering(null)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="p-4 bg-[#0a1014] border-2 border-black shadow-[4px_4px_0px_#000] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-3 h-3 bg-[#ffb703] inline-block shadow-[1px_1px_0px_#000]" />
            <h1 className="font-pixel text-sm sm:text-base text-white tracking-wider uppercase">
              CHAOS INJECTION & SCENARIO LAB
            </h1>
          </div>
          <p className="font-mono-data text-xs text-slate-400">
            Stress-test agent autonomy, cross-agent cascade resilience, and algorithmic decision responses.
          </p>
        </div>

        <Button
          variant="default"
          size="sm"
          onClick={handleResetDemo}
          disabled={triggering === 'reset'}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${triggering === 'reset' ? 'animate-spin' : ''}`} />
          <span>RESET BASELINE</span>
        </Button>
      </div>

      {successMsg && (
        <div className="p-3 bg-[#071711] border-2 border-[#00ff66] shadow-[3px_3px_0px_#000] font-mono-data text-xs text-[#00ff66] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#00ff66] shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Scenario Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SCENARIOS.map((sc) => {
          const Icon = sc.icon
          const isCurrent = triggering === sc.id

          return (
            <Card key={sc.id} titleBar={sc.title} variant={sc.variant} className="p-0">
              <div className="p-4 flex flex-col justify-between h-full space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-black border-2 border-black flex items-center justify-center text-white">
                      <Icon className="w-4 h-4 text-[#ffb703]" />
                    </div>
                    <Badge variant="amber">STRESS SCENARIO</Badge>
                  </div>

                  <p className="font-mono-data text-xs text-slate-200 leading-relaxed mb-3">
                    {sc.desc}
                  </p>

                  <div className="p-2.5 bg-black border border-slate-800">
                    <span className="font-pixel text-[8px] text-[#00f0ff] uppercase block mb-1">
                      EXPECTED ALGORITHMIC CASCADE:
                    </span>
                    <ul className="space-y-1 font-mono-data text-xs text-slate-300">
                      {sc.expectedDecisions.map((ed, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <ArrowRight className="w-3 h-3 text-[#00ff66] shrink-0" />
                          <span>{ed}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <Button
                  variant="amber"
                  className="w-full"
                  onClick={() => handleTrigger(sc.id)}
                  disabled={isCurrent}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{isCurrent ? 'INJECTING...' : 'TRIGGER CHAOS SCENARIO'}</span>
                </Button>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
