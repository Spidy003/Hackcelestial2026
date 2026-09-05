'use client'

import { formatRupees } from '@/lib/format'
import { Card } from '@/components/ui/8bit/card'
import { Badge } from '@/components/ui/8bit/badge'
import { TrendingUp, DollarSign } from 'lucide-react'

const RATES = [
  { id: 1, type: 'Deluxe Coastal Room', base_rate: 14000, current_rate: 16800, multiplier: 1.2, elasticity_score: -1.15, booking_prob: 0.88, inventory_left: 6 },
  { id: 2, type: 'Executive Suite Sea View', base_rate: 22000, current_rate: 28600, multiplier: 1.3, elasticity_score: -0.85, booking_prob: 0.79, inventory_left: 3 },
  { id: 3, type: 'Private Pool Beach Villa', base_rate: 38000, current_rate: 45600, multiplier: 1.2, elasticity_score: -0.62, booking_prob: 0.92, inventory_left: 1 },
  { id: 4, type: 'Superior Garden Cottage', base_rate: 11000, current_rate: 12100, multiplier: 1.1, elasticity_score: -1.35, booking_prob: 0.84, inventory_left: 8 },
  { id: 5, type: 'Meridian Presidential Suite', base_rate: 65000, current_rate: 78000, multiplier: 1.2, elasticity_score: -0.45, booking_prob: 0.71, inventory_left: 1 },
]

export default function RevenuePage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="p-4 bg-[#0a1014] border-2 border-black shadow-[4px_4px_0px_#000] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-3 h-3 bg-[#00ff66] inline-block shadow-[1px_1px_0px_#000]" />
            <h1 className="font-pixel text-sm sm:text-base text-white tracking-wider uppercase">
              REVENUE OPTIMIZATION & DYNAMIC YIELD
            </h1>
          </div>
          <p className="font-mono-data text-xs text-slate-400">
            Gradient Boosting booking probability engine optimizing ADR, RevPAR, and booking conversion curves in real time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-2 bg-black border-2 border-black text-center min-w-[110px]">
            <span className="font-pixel text-[8px] text-slate-400 block mb-0.5">PROJECTED ADR</span>
            <span className="font-mono-data text-base font-bold text-[#00ff66]">₹24,800</span>
          </div>
          <div className="p-2 bg-black border-2 border-black text-center min-w-[110px]">
            <span className="font-pixel text-[8px] text-slate-400 block mb-0.5">REVPAR INDEX</span>
            <span className="font-mono-data text-base font-bold text-[#00f0ff]">₹19,468</span>
          </div>
        </div>
      </div>

      {/* Dynamic Rate Matrix */}
      <Card titleBar="LIVE RATE MATRIX & DEMAND ELASTICITY" variant="green" className="p-0">
        <div className="p-4 space-y-3">
          {RATES.map((r) => (
            <div
              key={r.id}
              className="p-3.5 bg-[#0a1014] border-2 border-black shadow-[3px_3px_0px_#000] flex flex-col md:flex-row md:items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-mono-data text-sm font-bold text-white">{r.type}</h4>
                  <Badge variant="green">
                    {Math.round(r.booking_prob * 100)}% BOOK PROB
                  </Badge>
                </div>
                <div className="font-mono-data text-xs text-slate-400">
                  Elasticity: {r.elasticity_score} (Inelastic) • {r.inventory_left} Rooms Left
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="font-mono-data text-xs text-slate-500 line-through block">
                    {formatRupees(r.base_rate)} Base
                  </span>
                  <span className="font-mono-data text-base font-bold text-[#00ff66]">
                    {formatRupees(r.current_rate)}
                  </span>
                </div>

                <div className="p-2 bg-[#071d13] border-2 border-[#00ff66] text-center min-w-[70px]">
                  <span className="font-pixel text-[7px] text-slate-400 block">SURGE</span>
                  <span className="font-mono-data text-xs font-bold text-[#00ff66]">
                    +{Math.round((r.multiplier - 1) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
