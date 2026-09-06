'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useResortStore } from '@/lib/store'
import { formatSimTime, formatRupees } from '@/lib/format'
import { API_URL } from '@/lib/api'
import { 
  Play, Pause, FastForward, Activity, ShieldCheck, 
  Users, Wrench, Package, TrendingUp, MessageSquare, 
  Cpu, AlertTriangle, Radio, Sparkles, Layers
} from 'lucide-react'

const navItems = [
  { href: '/', label: 'Command Centre', icon: Activity },
  { href: '/ledger', label: 'Decision Ledger', icon: ShieldCheck },
  { href: '/models', label: 'ML Models', icon: Cpu },
  { href: '/guests', label: 'Guest Intel & GERS', icon: Sparkles },
  { href: '/staffing', label: 'Staff Roster', icon: Users },
  { href: '/maintenance', label: 'Maintenance', icon: Wrench },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/revenue', label: 'Revenue & Yield', icon: TrendingUp },
  { href: '/concierge', label: 'AI Concierge', icon: MessageSquare },
  { href: '/simulate', label: 'Chaos & Sim', icon: AlertTriangle },
]

export default function Navbar() {
  const pathname = usePathname()
  const { clock, kpis, connectionStatus, setClock } = useResortStore()
  const [speedLoading, setSpeedLoading] = useState(false)

  const togglePause = async () => {
    try {
      const endpoint = clock.paused ? '/api/clock/resume' : '/api/clock/pause'
      const res = await fetch(`${API_URL}${endpoint}`, { method: 'POST' })
      if (res.ok) {
        setClock({ paused: !clock.paused })
      }
    } catch (e) {
      console.error('Failed to toggle clock pause:', e)
    }
  }

  const changeSpeed = async (speed: string) => {
    setSpeedLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/clock/speed?speed=${speed}`, { method: 'POST' })
      if (res.ok) {
        setClock({ speed })
      }
    } catch (e) {
      console.error('Failed to change speed:', e)
    } finally {
      setSpeedLoading(false)
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md shadow-2xl">
      {/* Top Banner / Pulse Strip summary */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/50 text-xs">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-500 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold tracking-wider text-slate-100 uppercase text-sm font-mono">
                ResortierAi
              </span>
              <span className="hidden sm:inline-block ml-2 px-1.5 py-0.5 text-[10px] uppercase font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 rounded">
                Smart Resort Handling Multi-Agent System • 84 Rooms
              </span>
            </div>
          </Link>

          {/* Quick KPIs */}
          <div className="hidden lg:flex items-center gap-3 pl-4 border-l border-slate-800 font-mono text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Occupancy:</span>
              <span className="font-semibold text-emerald-300">{(kpis?.occupancy_pct ?? 78.5).toFixed(1)}%</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-slate-700" />
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Protected:</span>
              <span className="font-semibold text-cyan-300">{formatRupees(kpis?.rupees_protected ?? 342000, true)}</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-slate-700" />
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Decisions:</span>
              <span className="font-semibold text-amber-300">{kpis?.decisions_today ?? 48}</span>
            </div>
          </div>
        </div>

        {/* Sim Clock & Connection Status */}
        <div className="flex items-center gap-3">
          {/* Clock controls */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg shadow-inner">
            <span className="text-[11px] font-mono text-slate-300 font-medium" suppressHydrationWarning>
              {formatSimTime(clock?.sim_now || '2026-01-01T00:00:00.000Z', true)}
            </span>

            <button
              onClick={togglePause}
              className={`p-1 rounded transition-colors ${clock?.paused ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'}`}
              title={clock?.paused ? 'Resume Simulation' : 'Pause Simulation'}
            >
              {clock?.paused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
            </button>

            {/* Speeds */}
            <div className="flex items-center gap-0.5 border-l border-slate-800 pl-1.5">
              {['1x', '5x', '30x', '60x'].map((spd) => (
                <button
                  key={spd}
                  onClick={() => changeSpeed(spd)}
                  disabled={speedLoading}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-all ${
                    (clock?.speed || '5x') === spd
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {spd}
                </button>
              ))}
            </div>
          </div>

          {/* Connection status badge */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-900 border border-slate-800">
            <Radio className={`w-3 h-3 ${connectionStatus === 'connected' ? 'text-emerald-400 animate-pulse' : 'text-rose-400'}`} />
            <span className={`text-[10px] font-mono uppercase tracking-wider font-semibold ${
              connectionStatus === 'connected' ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {connectionStatus === 'connected' ? 'LIVE' : connectionStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Main Nav Items */}
      <nav className="flex items-center gap-1 px-4 py-1 overflow-x-auto scrollbar-none bg-slate-950">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
