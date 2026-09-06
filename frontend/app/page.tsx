'use client'

import PulseStrip from '@/components/PulseStrip'
import AgentRail from '@/components/AgentRail'
import CascadeFeed from '@/components/CascadeFeed'
import ZoneHeatmap from '@/components/ZoneHeatmap'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/8bit/button'
import { Badge } from '@/components/ui/8bit/badge'
import { AlertTriangle, ShieldCheck, ArrowRight, Zap, RefreshCw } from 'lucide-react'

const FloatingAgent3D = dynamic(() => import('@/components/FloatingAgent3D'), {
  ssr: false,
})

export default function CommandCentrePage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Banner with Title & Quick Action buttons */}
      <div className="p-4 bg-[#0a1014] border-2 border-black shadow-[4px_4px_0px_#000] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-cyan-400/80 bg-[#0a1014] p-0.5 shadow-[2px_2px_0px_#000] shrink-0">
            <img src="/resortier_ai_logo.png" alt="ResortierAi" className="w-full h-full object-contain rounded-lg" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="w-2.5 h-2.5 bg-[#00ff66] inline-block shadow-[1px_1px_0px_#000]" />
              <h1 className="font-pixel text-sm sm:text-base text-white tracking-wider uppercase">
                RESORTIERAI COMMAND CENTRE
              </h1>
            </div>
            <p className="font-mono-data text-xs text-slate-400">
              Smart Resort Handling Multi-Agent System • Meridian Bay Resort, Alibaug • 84 Keys
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link href="/simulate">
            <Button variant="amber" size="sm">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>CHAOS LAB</span>
            </Button>
          </Link>
          <Link href="/ledger">
            <Button variant="green" size="sm">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>DECISION LEDGER</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 8-Bit KPI Pulse Strip (4-up → 2-up → 1-up responsive) */}
      <PulseStrip />

      {/* 8 Autonomous Agents Rail */}
      <AgentRail />

      {/* Zone Workload Matrix & Load Balancing (Table on desktop, Cards on mobile) */}
      <ZoneHeatmap />

      {/* Live Autonomous Decision Cascade Stream */}
      <CascadeFeed />

      {/* Interactive 3D Flying Robot Agent at Left Bottom */}
      <FloatingAgent3D />
    </div>
  )
}
