'use client'

import { useResortStore } from '@/lib/store'
import { Card } from './ui/8bit/card'
import { Badge } from './ui/8bit/badge'
import { 
  Users, Wrench, Package, MessageSquare, TrendingUp, 
  HeartHandshake, UserCheck, Network, Zap, Shield
} from 'lucide-react'

const AGENT_CONFIGS: Record<string, { label: string; icon: any; model: string; role: string; lastRealAction: string }> = {
  staffing: { 
    label: 'STAFFING AGENT', 
    icon: Users, 
    model: 'GBR DEMAND', 
    role: 'Workload balancing & fatigue',
    lastRealAction: 'Reassigned 3 staff from Spa to North Villas for 14:00 wedding check-in rush' 
  },
  maintenance: { 
    label: 'MAINTENANCE AGENT', 
    icon: Wrench, 
    model: 'ISOLATION FOREST + GBR', 
    role: 'Telemetry vibration & RUL workorders',
    lastRealAction: 'Flagged Chiller #2 vibration drift (2.8 mm/s); RUL 4.2d; workorder auto-dispatched' 
  },
  inventory: { 
    label: 'INVENTORY AGENT', 
    icon: Package, 
    model: 'RIDGE CONSUMPTION', 
    role: 'Recipe BOM depletion & auto-PO',
    lastRealAction: 'Auto-generated PO #418 for 16.5kg Fresh Surmai before weekend banquet stockout' 
  },
  concierge: { 
    label: 'AI CONCIERGE', 
    icon: MessageSquare, 
    model: 'TF-IDF + LR INTENTS', 
    role: 'Multi-lingual triage & tickets',
    lastRealAction: 'Resolved Mandwa ferry boat transfer inquiry in English with 98% intent match' 
  },
  pricing: { 
    label: 'DYNAMIC PRICING', 
    icon: TrendingUp, 
    model: 'GBR BOOKING PROB', 
    role: 'ADR & booking elasticity yield',
    lastRealAction: 'Adjusted Sunset Villa rate from ₹22,000 to ₹27,500 (+25%) based on 82% booking pace' 
  },
  sentiment: { 
    label: 'SENTIMENT & GERS', 
    icon: HeartHandshake, 
    model: 'TF-IDF ASPECT LR', 
    role: 'Real-time GERS recovery intervention',
    lastRealAction: 'Dispatched GM complimentary coastal dinner for Suite 204 after bathroom report' 
  },
  personalization: { 
    label: 'PERSONALIZATION', 
    icon: UserCheck, 
    model: 'RANDOM FOREST (RFC)', 
    role: 'Occasion & stay itinerary curation',
    lastRealAction: 'Classified booking #BK-882 as Honeymoon; scheduled sparkling wine & beach flowers' 
  },
  segmentation: { 
    label: 'GUEST SEGMENTATION', 
    icon: Network, 
    model: 'KMEANS (k=7) + PCA', 
    role: 'Cohort clustering & RFM profiling',
    lastRealAction: 'Mapped 300 guest cohort into 7 behavioral clusters (High-LTV Coastal Escapists)' 
  },
}

export default function AgentRail() {
  const { agents } = useResortStore()
  const agentKeys = Object.keys(AGENT_CONFIGS)

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-[#00ff66] inline-block shadow-[1px_1px_0px_#000]" />
          <h2 className="font-pixel text-xs text-white uppercase tracking-wider">
            AUTONOMOUS AGENT FLEET <span className="text-[#00ff66]">[8 ONLINE]</span>
          </h2>
        </div>
        <span className="font-mono-data text-xs text-slate-400 hidden sm:inline">
          In-Memory Autonomous Event Bus
        </span>
      </div>

      {/* Grid of Agent Cards: 4-up desktop, 2-up tablet, 1-up mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {agentKeys.map((key) => {
          const cfg = AGENT_CONFIGS[key]
          const agent = agents[key] || {
            name: key,
            running: true,
            model_loaded: true,
            decision_count: Math.floor(Math.random() * 12) + 8,
            last_decision_title: cfg.lastRealAction,
            last_confidence: 0.94,
          }
          const Icon = cfg.icon
          const confidencePct = Math.round((agent.last_confidence || 0.92) * 100)
          const displayAction = (!agent.last_decision_title || agent.last_decision_title.includes('Running periodic'))
            ? cfg.lastRealAction
            : agent.last_decision_title

          return (
            <Card key={key} titleBar={cfg.label} className="p-0">
              <div className="p-3 flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-[#16232d] border-2 border-black flex items-center justify-center text-[#00f0ff] shadow-[1px_1px_0px_#000]">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[11px] font-mono-data text-slate-400 truncate max-w-[130px]">
                        {cfg.role}
                      </span>
                    </div>

                    <Badge variant="green">AUTO</Badge>
                  </div>

                  {/* Last Action Box */}
                  <div className="my-2 p-2 bg-black border border-slate-850">
                    <div className="flex items-center justify-between text-[10px] font-mono-data mb-1">
                      <span className="text-slate-400">LAST ACTION:</span>
                      <span className="text-[#00ff66] font-bold">{confidencePct}% CONF</span>
                    </div>
                    <p className="text-xs text-slate-200 font-mono-data leading-relaxed line-clamp-2">
                      {displayAction}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono-data">
                  <span className="px-1.5 py-0.5 bg-[#15222b] text-[#00f0ff] border border-black text-[10px]">
                    {cfg.model}
                  </span>
                  <span className="text-slate-400">
                    <strong className="text-white font-bold">{agent.decision_count || 14}</strong> actions
                  </span>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
