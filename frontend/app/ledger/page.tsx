'use client'

import { useState } from 'react'
import { useResortStore } from '@/lib/store'
import { formatRupees, formatSimTime } from '@/lib/format'
import { Card } from '@/components/ui/8bit/card'
import { Badge } from '@/components/ui/8bit/badge'
import { Button } from '@/components/ui/8bit/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/8bit/tabs'
import { ShieldCheck, Sliders, Search, Eye, ChevronUp, ChevronDown, Sparkles, AlertTriangle } from 'lucide-react'

export default function LedgerPage() {
  const { decisions } = useResortStore()
  const [selectedAgent, setSelectedAgent] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [autonomyLevel, setAutonomyLevel] = useState<number>(4)

  const activeDecisions = decisions.length > 0 ? decisions : [
    {
      id: 'DEC-101',
      ts: new Date().toISOString(),
      agent: 'staffing',
      kind: 'shift_reassignment',
      title: 'Reassigned 3 housekeeping staff to North Villas for wedding group check-in',
      reasoning_steps: [
        'Detected 8 concurrent arrivals in Zone 1 (North Villas) scheduled for 14:00',
        'Workload index spiked from 42 to 89, exceeding SLA threshold (80)',
        'GBR demand forecast predicts 18 turnover requests over next 120 mins',
        'Optimized reassignment from low-load Zone 4 (Spa) with zero SLA violation'
      ],
      inputs: { zone_id: 1, current_workload: 89, staff_transferred: 3 },
      confidence: 0.96,
      rupee_impact: 45000,
      counterfactual_text: 'Without reassignment, 5 check-ins would have breached 30-min SLA, degrading GERS by -18 points',
      counterfactual_rupees: -65000,
      autonomy: 'autonomous',
      cascade_id: 'CASC-WEDDING-091'
    },
    {
      id: 'DEC-102',
      ts: new Date(Date.now() - 60000).toISOString(),
      agent: 'pricing',
      kind: 'rate_calendar_update',
      title: 'Increased Sunset Villa weekend rate from ₹22,000 to ₹27,500 (+25%)',
      reasoning_steps: [
        'Current weekend occupancy pace is 18% ahead of 60-day historical baseline',
        'GBR Booking Probability indicates 82% booking likelihood even with +25% ADR premium',
        'Competitor coastal resorts in Alibaug reported sold-out inventory for Oct 18-20'
      ],
      inputs: { room_type: 'Sunset Villa', old_rate: 22000, new_rate: 27500, lead_days: 14 },
      confidence: 0.92,
      rupee_impact: 110000,
      counterfactual_text: 'Keeping base rate would forfeit ₹1.1L in RevPAR yield with identical 100% sellout',
      counterfactual_rupees: -110000,
      autonomy: 'autonomous',
      cascade_id: 'CASC-PRICING-44'
    },
    {
      id: 'DEC-103',
      ts: new Date(Date.now() - 120000).toISOString(),
      agent: 'maintenance',
      kind: 'sensor_trigger_workorder',
      title: 'Chiller Unit #2 compressor vibration anomaly detected (2.8 mm/s vs 1.1 normal)',
      reasoning_steps: [
        'Isolation Forest anomaly score flagged -0.74 on Telemetry stream CHILLER_02',
        'Gradient Boosting Regressor predicts Remaining Useful Life (RUL) = 4.2 days',
        'Dispatched preventative inspection task to Senior HVAC Tech before catastrophic failure'
      ],
      inputs: { asset_id: 14, vibration: 2.8, temp: 76.4, rul_days: 4.2 },
      confidence: 0.98,
      rupee_impact: 180000,
      counterfactual_text: 'Unplanned chiller breakdown would require emergency compressor swap and guest room relocation refunds',
      counterfactual_rupees: -280000,
      autonomy: 'autonomous',
      cascade_id: 'CASC-CHILLER-12'
    },
    {
      id: 'DEC-104',
      ts: new Date(Date.now() - 180000).toISOString(),
      agent: 'sentiment',
      kind: 'service_recovery_offer',
      title: 'Service recovery triggered for Suite 204: Complimentary dinner & GM note',
      reasoning_steps: [
        'Guest submitted review: "Bathroom shower pressure was weak and delayed breakfast"',
        'TF-IDF aspect extractor identified negative sentiment on "plumbing" and "f&b"',
        'Guest GERS dropped from 88 to 58 (Critical risk threshold < 70)',
        'Triggered recovery protocol to avert 1-star TripAdvisor review (lifetime value ₹2.4L)'
      ],
      inputs: { guest_id: 84, room_id: 204, previous_gers: 88, new_gers: 58 },
      confidence: 0.95,
      rupee_impact: 85000,
      counterfactual_text: 'Prevented public negative review and preserved repeat booking probability for high-LTV guest',
      counterfactual_rupees: -150000,
      autonomy: 'autonomous',
      cascade_id: 'CASC-RECOV-08'
    }
  ]

  const filteredDecisions = activeDecisions.filter((d) => {
    const matchesAgent = selectedAgent === 'all' || d.agent.toLowerCase() === selectedAgent.toLowerCase()
    const matchesQuery = !searchQuery || d.title.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesAgent && matchesQuery
  })

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="p-4 bg-[#0a1014] border-2 border-black shadow-[4px_4px_0px_#000] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-3 h-3 bg-[#00ff66] inline-block shadow-[1px_1px_0px_#000]" />
            <h1 className="font-pixel text-sm sm:text-base text-white tracking-wider uppercase">
              AUTONOMOUS DECISION LEDGER
            </h1>
          </div>
          <p className="font-mono-data text-xs text-slate-400">
            Immutable audit trail of all AI actions, counterfactual evaluations, and financial impact.
          </p>
        </div>

        {/* Autonomy Dial Controls */}
        <div className="p-2.5 bg-[#07131a] border-2 border-black flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#00ff66]" />
          <div className="text-xs font-mono-data mr-2">
            <span className="font-pixel text-[8px] text-slate-400 block">GOVERNANCE:</span>
            <span className="text-[#00ff66] font-bold">L{autonomyLevel} FULL AUTO</span>
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setAutonomyLevel(lvl)}
                className={`w-7 h-7 border-2 border-black font-pixel text-[10px] font-bold transition-all ${
                  autonomyLevel === lvl
                    ? 'bg-[#00ff66] text-black shadow-[2px_2px_0px_#000]'
                    : 'bg-[#141f27] text-slate-400 hover:text-white'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="p-3 bg-[#0a1014] border-2 border-black shadow-[3px_3px_0px_#000] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <Tabs value={selectedAgent} onValueChange={setSelectedAgent}>
          <TabsList className="mb-0 p-1 flex-wrap">
            {['all', 'staffing', 'pricing', 'maintenance', 'sentiment', 'inventory', 'concierge'].map((cat) => (
              <TabsTrigger key={cat} value={cat}>
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search decisions, IDs, rooms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black border-2 border-slate-800 pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono-data focus:outline-none focus:border-[#00ff66]"
          />
        </div>
      </div>

      {/* Decisions List */}
      <div className="space-y-3">
        {filteredDecisions.map((dec) => {
          const isExpanded = expandedId === dec.id
          const confPct = Math.round(dec.confidence * 100)

          return (
            <div
              key={dec.id}
              className="p-4 bg-[#0a1014] border-2 border-black shadow-[3px_3px_0px_#000] hover:border-slate-700 transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    <Badge variant="cyan">{dec.agent}</Badge>
                    <Badge variant="green">{dec.id}</Badge>
                    {dec.cascade_id && <Badge variant="purple">{dec.cascade_id}</Badge>}
                    <span suppressHydrationWarning className="font-mono-data text-[11px] text-slate-400">
                      {formatSimTime(dec.ts)}
                    </span>
                  </div>

                  <h3 className="font-mono-data text-sm font-bold text-white leading-snug">
                    {dec.title}
                  </h3>
                </div>

                <div className="flex md:flex-col items-baseline md:items-end justify-between md:justify-start gap-1 shrink-0">
                  <span className="font-mono-data text-sm font-bold text-[#00ff66]">
                    +{formatRupees(dec.rupee_impact, true)}
                  </span>
                  <span className="font-mono-data text-[11px] text-slate-400">
                    {confPct}% CONF
                  </span>
                </div>
              </div>

              {/* Action Bar */}
              <div className="mt-3 pt-2 border-t border-slate-850 flex items-center justify-between text-xs font-mono-data">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : dec.id)}
                  className="flex items-center gap-1 text-[#00f0ff] hover:underline cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="font-pixel text-[8px] uppercase">
                    {isExpanded ? 'HIDE CHAIN-OF-THOUGHT' : 'INSPECT CHAIN-OF-THOUGHT'}
                  </span>
                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                <Badge variant="green">L{autonomyLevel} AUTONOMOUS</Badge>
              </div>

              {/* Expanded Reasoning */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t-2 border-black bg-black p-3 space-y-3">
                  <div>
                    <span className="font-pixel text-[8px] text-[#00f0ff] uppercase block mb-1.5">
                      MULTI-STEP ALGORITHMIC REASONING:
                    </span>
                    <ol className="list-decimal list-inside space-y-1 font-mono-data text-xs text-slate-200">
                      {dec.reasoning_steps?.map((step, idx) => (
                        <li key={idx} className="leading-relaxed">{step}</li>
                      ))}
                    </ol>
                  </div>

                  {dec.counterfactual_text && (
                    <div className="p-3 bg-[#1f090e] border border-[#ff3366] text-xs">
                      <span className="font-pixel text-[8px] text-[#ff3366] uppercase block mb-1">
                        COUNTERFACTUAL RISK EVALUATION (WITHOUT AI INTERVENTION):
                      </span>
                      <p className="font-mono-data text-slate-200">{dec.counterfactual_text}</p>
                      {dec.counterfactual_rupees && (
                        <span className="font-mono-data text-[#ff3366] font-bold block mt-1">
                          Forfeited RevPAR / Recovery Cost: {formatRupees(Math.abs(dec.counterfactual_rupees))}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
