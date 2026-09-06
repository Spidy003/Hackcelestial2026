'use client'

import { useState } from 'react'
import { useResortStore, Decision } from '@/lib/store'
import { formatRupees, formatSimTime } from '@/lib/format'
import { Card } from './ui/8bit/card'
import { Badge } from './ui/8bit/badge'
import { Button } from './ui/8bit/button'
import { Tabs, TabsList, TabsTrigger } from './ui/8bit/tabs'
import { GitBranch, Eye, ChevronUp, ChevronDown, Sparkles, AlertTriangle, ShieldCheck } from 'lucide-react'

const MOCK_FALLBACK_DECISIONS: Decision[] = [
  {
    id: 'DEC-101',
    ts: new Date().toISOString(),
    agent: 'staffing',
    kind: 'shift_reassignment',
    title: 'Reassigned 3 staff to North Villas for wedding group check-in rush',
    reasoning_steps: [
      'Detected 8 concurrent arrivals in Zone 1 (North Villas) scheduled for 14:00',
      'Workload index spiked from 42 to 89, exceeding SLA threshold (80)',
      'GBR demand forecast predicts 18 turnover requests over next 120 mins',
      'Optimized reassignment from low-load Zone 4 with zero SLA violation'
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
    title: 'Chiller Unit #2 compressor vibration anomaly detected (2.8 mm/s)',
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

export default function CascadeFeed() {
  const { decisions } = useResortStore()
  const [filter, setFilter] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const activeDecisions = decisions.length > 0 ? decisions : MOCK_FALLBACK_DECISIONS

  const filteredDecisions = activeDecisions.filter((d) => {
    if (filter === 'all') return true
    return d.agent.toLowerCase() === filter.toLowerCase()
  })

  return (
    <div className="mb-6">
      <Card titleBar="AUTONOMOUS DECISION STREAM & CAUSAL CASCADE" variant="cyan" className="p-0">
        <div className="p-3 sm:p-4">
          {/* Header & Filter Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b-2 border-black">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-[#00f0ff]" />
              <span className="font-pixel text-[10px] text-white uppercase tracking-wider">
                ACTIVE EVENT BUS DISPATCHES
              </span>
            </div>

            {/* 8-bit Filter Tabs */}
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList className="mb-0 p-1 flex-wrap">
                {['all', 'staffing', 'pricing', 'maintenance', 'sentiment'].map((f) => (
                  <TabsTrigger key={f} value={f}>
                    {f}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Stream of Decision Cards - perfectly responsive down to 390px */}
          <div className="space-y-3">
            {filteredDecisions.map((dec) => {
              const isExpanded = expandedId === dec.id
              const confPct = Math.round(dec.confidence * 100)

              return (
                <div
                  key={dec.id}
                  className="p-3 sm:p-4 bg-[#0a1014] border-2 border-black shadow-[3px_3px_0px_#000] hover:border-slate-700 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        <Badge variant="cyan">{dec.agent}</Badge>
                        {dec.cascade_id && (
                          <Badge variant="purple">{dec.cascade_id}</Badge>
                        )}
                        <span suppressHydrationWarning className="font-mono-data text-[11px] text-slate-400">
                          {formatSimTime(dec.ts)}
                        </span>
                      </div>

                      <h3 className="font-mono-data text-xs sm:text-sm font-bold text-white leading-snug break-words">
                        {dec.title}
                      </h3>
                    </div>

                    <div className="flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-start gap-1 shrink-0 pt-1 sm:pt-0">
                      <span className="font-mono-data text-xs sm:text-sm font-bold text-[#00ff66]">
                        +{formatRupees(dec.rupee_impact, true)}
                      </span>
                      <span className="font-mono-data text-[10px] text-slate-400">
                        {confPct}% CONF
                      </span>
                    </div>
                  </div>

                  {/* Expand / Inspect Reasoning */}
                  <div className="pt-2 border-t border-slate-850 flex items-center justify-between text-xs font-mono-data">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : dec.id)}
                      className="flex items-center gap-1 text-[#00f0ff] hover:underline cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="font-pixel text-[8px] uppercase">
                        {isExpanded ? 'HIDE REASONING' : 'INSPECT CHAIN-OF-THOUGHT'}
                      </span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    <Badge variant="green">L4 FULL AUTO</Badge>
                  </div>

                  {/* Expanded Algorithmic Reasoning */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t-2 border-black bg-black p-3 space-y-3">
                      <div>
                        <span className="font-pixel text-[8px] text-[#00f0ff] uppercase block mb-1.5">
                          ALGORITHMIC REASONING TRACE:
                        </span>
                        <ol className="list-decimal list-inside space-y-1 font-mono-data text-xs text-slate-200">
                          {dec.reasoning_steps?.map((step, sIdx) => (
                            <li key={sIdx} className="leading-relaxed">
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>

                      {dec.counterfactual_text && (
                        <div className="p-2.5 bg-[#1f090e] border border-[#ff3366] text-xs">
                          <span className="font-pixel text-[8px] text-[#ff3366] uppercase block mb-1">
                            COUNTERFACTUAL RISK (WHAT IF NO ACTION):
                          </span>
                          <p className="font-mono-data text-slate-200 leading-relaxed">
                            {dec.counterfactual_text}
                          </p>
                          {dec.counterfactual_rupees && (
                            <span className="font-mono-data text-[#ff3366] font-bold block mt-1">
                              Potential Forfeited: {formatRupees(Math.abs(dec.counterfactual_rupees))}
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
      </Card>
    </div>
  )
}
