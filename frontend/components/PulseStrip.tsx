'use client'

import { useLiveMetrics } from '@/lib/useLiveMetrics'
import { formatRupees } from '@/lib/format'
import { Card } from './ui/8bit/card'
import { Badge } from './ui/8bit/badge'
import { BedDouble, Users, AlertCircle, ShieldCheck, TrendingUp, Sparkles, UtensilsCrossed } from 'lucide-react'

export default function PulseStrip() {
  const metrics = useLiveMetrics()

  const occ = metrics.occupancyPct
  const staff = metrics.staffOnDuty
  const openTasks = metrics.openTasks
  const breaches = metrics.slaBreaches
  const decisions = metrics.decisionsToday
  const protectedInr = metrics.rupeesProtected
  const atRisk = metrics.guestsAtRisk
  const foodWaste = metrics.foodWastePct

  const stats = [
    {
      label: 'OCCUPANCY',
      value: `${occ.toFixed(1)}%`,
      sub: `${metrics.occupiedRooms}/84 Rooms`,
      icon: BedDouble,
      variant: occ > 0 ? ('green' as const) : ('amber' as const),
      color: occ > 0 ? 'text-[#00ff66]' : 'text-[#ffb703]',
    },
    {
      label: 'STAFF ON DUTY',
      value: `${staff}/42`,
      sub: '8 Zones Active',
      icon: Users,
      variant: 'cyan' as const,
      color: 'text-[#00f0ff]',
    },
    {
      label: 'TASKS & SLA',
      value: `${openTasks} OPEN`,
      sub: `${breaches} Breaching`,
      icon: AlertCircle,
      variant: breaches > 0 ? ('red' as const) : ('amber' as const),
      color: breaches > 0 ? 'text-[#ff3366]' : 'text-[#ffb703]',
    },
    {
      label: 'AI DECISIONS',
      value: `${decisions}`,
      sub: 'Today across 8 Agents',
      icon: ShieldCheck,
      variant: 'default' as const,
      color: 'text-white',
    },
    {
      label: 'PROTECTED REV',
      value: formatRupees(protectedInr, true),
      sub: 'Via auto-actions',
      icon: TrendingUp,
      variant: 'cyan' as const,
      color: 'text-[#00f0ff]',
    },
    {
      label: 'GUESTS AT RISK',
      value: `${atRisk}`,
      sub: 'GERS < 70 Intervening',
      icon: Sparkles,
      variant: atRisk > 0 ? ('red' as const) : ('default' as const),
      color: atRisk > 0 ? 'text-[#ff3366]' : 'text-slate-300',
    },
    {
      label: 'F&B SPOILAGE',
      value: `${foodWaste.toFixed(1)}%`,
      sub: 'Target < 6.0%',
      icon: UtensilsCrossed,
      variant: foodWaste < 5.0 ? ('green' as const) : ('red' as const),
      color: foodWaste < 5.0 ? 'text-[#00ff66]' : 'text-[#ff3366]',
    },
  ]

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="font-pixel text-[9px] text-[#00ff66] uppercase tracking-wider">
          LIVE RESORT TELEMETRY [PULSE STRIP]
        </span>
        <span className="text-[11px] font-mono-data text-slate-400">
          Auto-refresh: 1s
        </span>
      </div>

      {/* Responsive Grid: 4-up on desktop, 2-up on tablet, 1-up on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        {stats.map((s, idx) => {
          const Icon = s.icon
          return (
            <Card key={idx} variant={s.variant} className="p-0">
              <div className="p-3 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-pixel text-[8px] text-slate-400 tracking-wider">
                    {s.label}
                  </span>
                  <Icon className={`w-3.5 h-3.5 ${s.color}`} />
                </div>
                <div>
                  <div className={`text-xl font-bold font-mono-data tracking-tight ${s.color}`}>
                    {s.value}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono-data mt-0.5 truncate">
                    {s.sub}
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
