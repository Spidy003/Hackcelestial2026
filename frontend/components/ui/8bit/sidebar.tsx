'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useResortStore } from '@/lib/store'
import { formatSimTime, formatRupees } from '@/lib/format'
import { API_URL } from '@/lib/api'
import { Button } from './button'
import { Badge } from './badge'
import { 
  Play, Pause, Menu, X, Activity, ShieldCheck, 
  Cpu, Sparkles, Users, Wrench, Package, 
  TrendingUp, MessageSquare, AlertTriangle, Radio, 
  ChevronRight, Terminal, Layers, Sun, Moon
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/', label: 'Command Centre', icon: Activity, tag: 'CORE' },
  { href: '/ledger', label: 'Decision Ledger', icon: ShieldCheck, tag: 'AUDIT' },
  { href: '/models', label: 'ML Models (9)', icon: Cpu, tag: 'ML' },
  { href: '/guests', label: 'Guest Intel / GERS', icon: Sparkles, tag: 'CRM' },
  { href: '/staffing', label: 'Staff Roster', icon: Users, tag: 'OPS' },
  { href: '/maintenance', label: 'Predictive Maint', icon: Wrench, tag: 'IOT' },
  { href: '/inventory', label: 'Smart Inventory', icon: Package, tag: 'F&B' },
  { href: '/revenue', label: 'Revenue & Yield', icon: TrendingUp, tag: 'ADR' },
  { href: '/concierge', label: 'AI Concierge', icon: MessageSquare, tag: 'BOT' },
  { href: '/simulate', label: 'Chaos Simulator', icon: AlertTriangle, tag: 'LAB' },
]

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { clock, kpis, connectionStatus, setClock, theme, setTheme } = useResortStore()
  const [speedLoading, setSpeedLoading] = useState(false)

  // Apply theme to document tree dynamically
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (theme === 'white') {
        document.documentElement.classList.add('theme-white')
        document.documentElement.classList.remove('dark')
        document.body.classList.add('theme-white')
      } else {
        document.documentElement.classList.remove('theme-white')
        document.documentElement.classList.add('dark')
        document.body.classList.remove('theme-white')
      }
    }
  }, [theme])

  const togglePause = async () => {
    try {
      const endpoint = clock.paused ? '/api/clock/resume' : '/api/clock/pause'
      const res = await fetch(`${API_URL}${endpoint}`, { method: 'POST' })
      if (res.ok) {
        setClock({ paused: !clock.paused })
      }
    } catch (e) {
      console.error('Clock toggle error:', e)
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
      console.error('Speed change error:', e)
    } finally {
      setSpeedLoading(false)
    }
  }

  // If on /owner route, bypass the operator sidebar completely so owner views have their own layout
  if (pathname.startsWith('/owner')) {
    return <>{children}</>
  }

  return (
    <div className={`min-h-screen flex flex-col lg:flex-row font-mono-data transition-colors ${
      theme === 'white' ? 'theme-white bg-white text-black' : 'bg-[#070b0e] text-slate-100'
    }`}>
      {/* ── Top Header for Mobile & Tablet (<1024px) ── */}
      <header className="lg:hidden sticky top-0 z-50 bg-[#0c1318] border-b-2 border-black p-3 flex items-center justify-between shadow-[0_4px_0px_#000]">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="cyan"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
          <div className="flex items-center gap-2">
            <img src="/resortier_ai_logo.png" alt="ResortierAi" className="w-6 h-6 object-contain rounded bg-[#0a1014] border border-cyan-400/60 p-0.5 shadow-[1px_1px_0px_#000]" />
            <span className="font-pixel text-[11px] text-white tracking-wider">
              RESORTIERAI
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/owner"
            className="text-[10px] px-2.5 py-1 rounded-full uppercase font-bold bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
          >
            <img src="/resorva-logo.png" alt="Resorva" className="w-3.5 h-3.5 rounded-full object-contain shrink-0 bg-white" />
            <span>Owner view →</span>
          </Link>
          <button
            onClick={() => setTheme(theme === 'white' ? 'dark' : 'white')}
            className="text-xs px-2 py-1 rounded-full border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 cursor-pointer shadow-xs flex items-center gap-1 font-bold"
            title="Switch theme"
          >
            {theme === 'white' ? '☀️ Light' : '🌙 Dark'}
          </button>
          <Badge variant={connectionStatus === 'connected' ? 'green' : 'red'}>
            {connectionStatus === 'connected' ? 'LIVE' : 'OFFLINE'}
          </Badge>
          <button
            onClick={togglePause}
            className={`p-1 border-2 border-black ${clock?.paused ? 'bg-[#ffb703] text-black' : 'bg-[#00ff66] text-black'} shadow-[2px_2px_0px_#000] cursor-pointer`}
          >
            {clock?.paused ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3 fill-current" />}
          </button>
        </div>
      </header>

      {/* ── Mobile Navigation Drawer Backdrop ── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/80 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Navigation Rail / Sidebar (Fixed on Desktop, Drawer on Mobile) ── */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-72 bg-[#0a0f13] border-r-2 border-black flex flex-col justify-between shadow-[4px_0px_0px_#000] transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="overflow-y-auto">
          {/* Logo & Header */}
          <div className="p-4 bg-black border-b-2 border-black">
            <div className="flex items-center justify-between">
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 group"
              >
                <div className="w-9 h-9 rounded-lg overflow-hidden border-2 border-cyan-400/80 bg-[#0a1014] p-0.5 shadow-[2px_2px_0px_#000] group-hover:border-[#00ff66] transition-all shrink-0">
                  <img src="/resortier_ai_logo.png" alt="ResortierAi" className="w-full h-full object-contain rounded" />
                </div>
                <div>
                  <h1 className="font-pixel text-xs text-white tracking-wider">
                    RESORTIERAI
                  </h1>
                  <span className="text-[8px] text-[#00f0ff] font-mono-data tracking-tight block leading-tight">
                    Smart Resort Handling Multi-Agent System
                  </span>
                </div>
              </Link>

              <button
                onClick={() => setMobileOpen(false)}
                className="lg:hidden text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* View Switcher: Operations view vs Owner view */}
          <div className={`p-2.5 mx-3 mt-3 rounded-2xl transition-all ${
            theme === 'white'
              ? 'neumorph-card bg-[#f0f3f8] border border-white/80 shadow-[4px_4px_10px_#d1d9e6,-4px_-4px_10px_#ffffff]'
              : 'bg-[#0a1014] border-2 border-black shadow-[3px_3px_0px_#000]'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[9px] uppercase tracking-wider font-bold ${
                theme === 'white' ? 'text-slate-500 font-sans' : 'font-pixel text-[8px] text-slate-400'
              }`}>
                PORTAL VIEW
              </span>
              <span className={`text-[8px] font-bold ${
                theme === 'white' ? 'text-blue-600 font-sans' : 'font-pixel text-[7px] text-[#00ff66]'
              }`}>
                ACTIVE
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className={`py-1.5 px-2 text-center rounded-xl font-bold text-[10px] select-none transition-all ${
                theme === 'white'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'border-2 border-black font-pixel text-[7.5px] bg-black text-[#00ff66] shadow-[2px_2px_0px_#000]'
              }`}>
                Operations (ResortierAi)
              </div>
              <Link
                href="/owner"
                className={`py-1.5 px-2 text-center rounded-xl font-bold text-[10px] transition-all flex items-center justify-center gap-1.5 ${
                  theme === 'white'
                    ? 'bg-white text-slate-700 hover:text-blue-600 shadow-sm border border-slate-200'
                    : 'border-2 border-black font-pixel text-[7.5px] bg-white text-black hover:bg-slate-100 shadow-[2px_2px_0px_#000]'
                }`}
              >
                <img src="/resorva-logo.png" alt="Resorva" className="w-3.5 h-3.5 rounded-full object-contain shrink-0" />
                <span>Owner (Resorva) →</span>
              </Link>
            </div>
          </div>

          {/* UI Theme Selector: Light Dashboard (like Owner) vs Dark Mode */}
          <div className={`p-3 mx-3 my-2 rounded-2xl transition-all ${
            theme === 'white'
              ? 'neumorph-card bg-[#f0f3f8] border border-white/80 shadow-[4px_4px_10px_#d1d9e6,-4px_-4px_10px_#ffffff]'
              : 'bg-[#07131a] border-2 border-black shadow-[3px_3px_0px_#000]'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[9px] uppercase tracking-wider font-bold ${
                theme === 'white' ? 'text-slate-500 font-sans' : 'font-pixel text-[8px] text-slate-400'
              }`}>
                DASHBOARD THEME
              </span>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                theme === 'white'
                  ? 'bg-blue-100 text-blue-700 font-sans'
                  : 'font-pixel text-[7px] text-[#00f0ff] bg-[#00f0ff]/10'
              }`}>
                {theme === 'white' ? '☀️ LIGHT' : '🌙 DARK'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setTheme('white')}
                className={`py-2 px-2.5 rounded-xl text-center font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  theme === 'white'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-[#0f171c] text-slate-300 hover:text-white border border-slate-700 text-[9px]'
                }`}
                title="Switch to Light Dashboard theme matching Owner Portal"
              >
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Light</span>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`py-2 px-2.5 rounded-xl text-center font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-black text-[#00ff66] border border-[#00ff66]/40 shadow-sm text-[9px]'
                    : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200'
                }`}
                title="Switch to Dark Operations theme"
              >
                <Moon className="w-3.5 h-3.5 text-cyan-400" />
                <span>Dark</span>
              </button>
            </div>
          </div>

          {/* Clock & Speed Control Box */}
          <div className="p-3 m-3 mt-0 bg-[#07131a] border-2 border-black shadow-[3px_3px_0px_#000]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-pixel text-[8px] text-slate-400 uppercase">
                SIM CLOCK
              </span>
              <Badge variant={connectionStatus === 'connected' ? 'green' : 'red'}>
                {connectionStatus === 'connected' ? 'LIVE' : 'OFFLINE'}
              </Badge>
            </div>

            <div className="p-2 bg-black border border-slate-800 text-center mb-2">
              <span className="font-mono-data text-xs text-[#00ff66] font-bold tracking-tight block">
                {formatSimTime(clock?.sim_now || new Date().toISOString(), true)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-1">
              <button
                onClick={togglePause}
                className={`px-2 py-1 border-2 border-black font-pixel text-[8px] uppercase flex items-center gap-1 shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 ${
                  clock?.paused ? 'bg-[#ffb703] text-black' : 'bg-[#00ff66] text-black'
                }`}
              >
                {clock?.paused ? <Play className="w-2.5 h-2.5 fill-current" /> : <Pause className="w-2.5 h-2.5 fill-current" />}
                <span>{clock?.paused ? 'RESUME' : 'PAUSE'}</span>
              </button>

              <div className="flex items-center gap-0.5">
                {['1x', '5x', '30x', '60x'].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => changeSpeed(spd)}
                    disabled={speedLoading}
                    className={`px-1.5 py-1 border border-black font-pixel text-[7px] transition-colors ${
                      (clock?.speed || '5x') === spd
                        ? 'bg-[#00f0ff] text-black font-bold'
                        : 'bg-black text-slate-400 hover:text-white'
                    }`}
                  >
                    {spd}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 space-y-1 overflow-y-auto max-h-[calc(100vh-270px)] scrollbar-thin">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-2.5 py-2 border-2 border-black transition-all ${
                    isActive
                      ? 'bg-[#00ff66] text-black font-bold shadow-[2px_2px_0px_#000] -translate-y-0.5'
                      : 'bg-[#0e161c] text-slate-300 hover:bg-[#16232d] hover:text-white hover:translate-x-0.5'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="font-pixel text-[9px] uppercase tracking-wider">
                      {item.label}
                    </span>
                  </div>

                  <span
                    className={`font-pixel text-[7px] px-1 py-0.2 border border-black ${
                      isActive ? 'bg-black text-[#00ff66]' : 'bg-black text-slate-400'
                    }`}
                  >
                    {item.tag}
                  </span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Footer info box */}
        <div className="p-3 bg-black border-t-2 border-black">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-neutral-800">
            {/* 8-bit Monogram Badge exact to [SB] in reference image */}
            <div className="w-7 h-7 border-2 border-black bg-white text-black font-pixel text-[8px] font-black flex items-center justify-center shadow-[2px_2px_0px_#000] rounded-sm">
              SB
            </div>
            {/* 8-bit AI Agent Badge */}
            <div className="w-7 h-7 border-2 border-cyan-400/80 bg-[#0a1014] p-0.5 rounded shadow-[2px_2px_0px_#000] shrink-0">
              <img src="/resortier_ai_logo.png" alt="ResortierAi" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="font-pixel text-[8px] text-white">RESORTIERAI</div>
              <div className="text-[7.5px] text-slate-400 font-mono-data leading-tight">SMART RESORT HANDLING MULTI-AGENT SYSTEM</div>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono-data text-slate-400 mb-1">
            <span>8 Agents Fleet:</span>
            <span className="text-[#00ff66] font-bold">100% ONLINE</span>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono-data text-slate-400">
            <span>ML Models:</span>
            <span className="text-[#00f0ff] font-bold">9 Loaded</span>
          </div>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main className="flex-1 min-w-0 p-3 sm:p-5 lg:p-6 overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}
