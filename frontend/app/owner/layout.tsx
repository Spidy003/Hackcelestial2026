'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useResortStore } from '@/lib/store'
import { OwnerThemeProvider, useOwnerTheme } from '@/lib/owner-theme'
import { 
  Home, Calendar, Bell, Settings, LayoutDashboard, 
  FileText, Menu, X, Sparkles, Layers, Zap, ShieldCheck,
  Sun, Moon
} from 'lucide-react'

function OwnerLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { weather } = useResortStore()
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const { theme, toggleTheme, isCyberpunk } = useOwnerTheme()

  const isWeekly = pathname.endsWith('/week')

  return (
    <div
      className={`h-screen w-screen overflow-hidden flex flex-col lg:flex-row antialiased select-none transition-colors duration-150 ${
        isCyberpunk
          ? 'theme-dark theme-cyberpunk bg-[#080a0d] text-slate-100 font-cyber'
          : 'owner-neumorphic bg-[#f0f3f8] text-slate-800'
      }`}
    >
      {/* ── Mobile Top Bar (<1024px) ── */}
      <header
        className={`lg:hidden shrink-0 h-14 px-4 flex items-center justify-between ${
          isCyberpunk
            ? 'bg-[#0b0f15] border-b border-[#c6ff00]/30 shadow-[0_4px_20px_rgba(0,0,0,0.8)]'
            : 'bg-[#f0f3f8] border-b border-white/80 shadow-[0_4px_12px_#d1d9e6]'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            className={`w-9 h-9 flex items-center justify-center cursor-pointer transition-all ${
              isCyberpunk
                ? 'bg-[#121822] text-[#c6ff00] border border-[#c6ff00]/40 rounded-xl shadow-[0_0_10px_rgba(198,255,0,0.15)]'
                : 'neumorph-card text-slate-700 active:shadow-[inset_2px_2px_5px_#d1d9e6]'
            }`}
            aria-label="Toggle Navigation"
          >
            {mobileDrawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-white shadow-sm border border-sky-300/50 p-0.5 flex items-center justify-center shrink-0">
              <img src="/resorva-logo.png" alt="Resorva Logo" className="w-full h-full object-contain rounded-full" />
            </div>
            <span className={`font-bold text-sm tracking-tight ${isCyberpunk ? 'font-cyber-display text-white' : ''}`}>
              RESORVA
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme switcher on mobile */}
          <button
            onClick={toggleTheme}
            className={`px-3 py-1 text-[10px] font-bold uppercase cursor-pointer rounded-full transition-all flex items-center gap-1.5 ${
              isCyberpunk
                ? 'bg-[#c6ff00] text-black font-cyber-display shadow-[0_0_15px_rgba(198,255,0,0.4)]'
                : 'bg-slate-900 text-white border border-slate-700 shadow-xs'
            }`}
          >
            {isCyberpunk ? (
              <>
                <Moon className="w-3 h-3 text-black" />
                <span>DARK</span>
              </>
            ) : (
              <>
                <Sun className="w-3 h-3 text-amber-400" />
                <span>LIGHT</span>
              </>
            )}
          </button>
          <Link
            href="/"
            className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-colors ${
              isCyberpunk
                ? 'bg-[#141b25] text-[#c6ff00] border border-[#c6ff00]/30 hover:border-[#c6ff00]'
                : 'bg-slate-200 text-slate-700 shadow-sm hover:bg-slate-300'
            }`}
          >
            Ops →
          </Link>
        </div>
      </header>

      {/* ── Mobile Drawer Backdrop ── */}
      {mobileDrawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={() => setMobileDrawerOpen(false)}
        />
      )}

      {/* ── Left Sidebar (Desktop Fixed / Mobile Drawer) ── */}
      <aside
        className={`fixed lg:static top-0 left-0 z-50 h-screen w-64 shrink-0 flex flex-col justify-between p-4 transition-transform duration-200 ${
          isCyberpunk
            ? 'bg-[#0a0e14] border-r border-[#c6ff00]/25 shadow-[10px_0_30px_rgba(0,0,0,0.8)]'
            : 'bg-[#f0f3f8] border-r border-white/80 shadow-[4px_0_16px_rgba(209,217,230,0.4)]'
        } ${
          mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col gap-3.5">
          {/* Brand Header */}
          <div className={`flex items-center justify-between pb-3 ${isCyberpunk ? 'border-b border-[#c6ff00]/20' : 'border-b border-slate-200/80'}`}>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-white shadow-md border-2 border-sky-400/50 p-0.5 flex items-center justify-center shrink-0">
                <img src="/resorva-logo.png" alt="Resorva Logo" className="w-full h-full object-contain rounded-full" />
              </div>
              <div>
                <h1 className={`font-bold text-sm tracking-tight leading-none ${isCyberpunk ? 'font-cyber-display text-white uppercase' : ''}`}>
                  Resorva
                </h1>
                <span className={`text-[10px] font-medium tracking-wide ${isCyberpunk ? 'text-[#c6ff00] font-cyber' : 'text-blue-600'}`}>
                  Resort &amp; Hotel • 84 Keys
                </span>
              </div>
            </div>
            <button
              onClick={() => setMobileDrawerOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Theme Switcher Button directly in Sidebar */}
          <button
            onClick={toggleTheme}
            className={`w-full py-2.5 px-3 flex items-center justify-between font-bold cursor-pointer rounded-2xl transition-all duration-150 ${
              isCyberpunk
                ? 'bg-[#121822] text-[#c6ff00] border border-[#c6ff00]/40 text-[11px] shadow-[0_0_12px_rgba(198,255,0,0.2)] hover:border-[#c6ff00]'
                : 'neumorph-btn text-slate-800 text-xs hover:text-blue-600'
            }`}
            title="Toggle between Light Dashboard and Dark Theme"
          >
            <div className="flex items-center gap-2">
              {isCyberpunk ? (
                <>
                  <Moon className="w-4 h-4 text-[#c6ff00]" />
                  <span className="font-cyber-display text-[11px] tracking-wide">DARK THEME</span>
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span className="font-bold text-slate-900 text-xs">LIGHT DASHBOARD</span>
                </>
              )}
            </div>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full transition-colors ${
              isCyberpunk
                ? 'bg-[#c6ff00]/20 text-[#c6ff00] border border-[#c6ff00]/30'
                : 'bg-blue-100 text-blue-700 border border-blue-200'
            }`}>
              SWITCH ⇄
            </span>
          </button>

          {/* Quick Action Chips */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: Home, title: 'Home' },
              { icon: Calendar, title: 'Calendar' },
              { icon: Bell, title: 'Notifications' },
              { icon: Settings, title: 'Settings' },
            ].map(({ icon: Icon, title }, idx) => (
              <button
                key={idx}
                className={`h-9 flex items-center justify-center cursor-pointer transition-all ${
                  isCyberpunk
                    ? 'bg-[#101620] border border-[#c6ff00]/25 rounded-xl text-slate-300 hover:text-[#c6ff00] hover:border-[#c6ff00] hover:shadow-[0_0_12px_rgba(198,255,0,0.25)]'
                    : 'rounded-xl neumorph-btn text-slate-600 hover:text-slate-800'
                }`}
                title={title}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>

          {/* View Switcher: Owner vs Operations */}
          <div
            className={`p-1 flex items-center justify-between rounded-2xl gap-1 ${
              isCyberpunk
                ? 'bg-[#090d13] border border-[#c6ff00]/25'
                : 'neumorph-inset'
            }`}
          >
            <span
              className={`flex-1 py-1.5 text-center font-bold text-xs rounded-xl transition-all ${
                isCyberpunk
                  ? 'bg-[#c6ff00] text-black font-cyber-display font-bold text-[10px] shadow-[0_0_10px_rgba(198,255,0,0.3)]'
                  : 'bg-white shadow-sm text-blue-700'
              }`}
            >
              Owner (Resorva)
            </span>
            <Link
              href="/"
              className={`flex-1 py-1.5 text-center font-semibold text-xs rounded-xl transition-all ${
                isCyberpunk
                  ? 'text-slate-400 hover:text-[#c6ff00] font-cyber text-[10px]'
                  : 'text-slate-600 hover:text-blue-700 hover:bg-white/60'
              }`}
            >
              Operations (ResortierAi) →
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-2 mt-1">
            <Link
              href="/owner"
              onClick={() => setMobileDrawerOpen(false)}
              className={`w-full px-3.5 py-2.5 flex items-center gap-3 transition-all rounded-xl ${
                isCyberpunk
                  ? !isWeekly
                    ? 'bg-[#c6ff00] text-black font-cyber-display font-black text-[11px] shadow-[0_0_20px_rgba(198,255,0,0.4)]'
                    : 'bg-[#101620] text-slate-300 border border-[#c6ff00]/25 hover:border-[#c6ff00] hover:text-white font-cyber text-[11px]'
                  : !isWeekly
                  ? 'rounded-2xl neumorph-btn-blue font-semibold shadow-[4px_4px_12px_rgba(37,99,235,0.35)]'
                  : 'rounded-2xl neumorph-btn text-slate-700 font-medium'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span className={isCyberpunk ? 'font-cyber-display' : 'text-xs'}>Dashboard</span>
            </Link>

            <Link
              href="/owner/week"
              onClick={() => setMobileDrawerOpen(false)}
              className={`w-full px-3.5 py-2.5 flex items-center gap-3 transition-all rounded-xl ${
                isCyberpunk
                  ? isWeekly
                    ? 'bg-[#c6ff00] text-black font-cyber-display font-black text-[11px] shadow-[0_0_20px_rgba(198,255,0,0.4)]'
                    : 'bg-[#101620] text-slate-300 border border-[#c6ff00]/25 hover:border-[#c6ff00] hover:text-white font-cyber text-[11px]'
                  : isWeekly
                  ? 'rounded-2xl neumorph-btn-blue font-semibold shadow-[4px_4px_12px_rgba(37,99,235,0.35)]'
                  : 'rounded-2xl neumorph-btn text-slate-700 font-medium'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span className={isCyberpunk ? 'font-cyber-display' : 'text-xs'}>Weekly Briefing</span>
            </Link>
          </nav>
        </div>

        {/* Bottom Area: System Status Block + User Chip */}
        <div className={`space-y-2.5 pt-3 ${isCyberpunk ? 'border-t border-[#c6ff00]/20' : 'border-t border-slate-200/80'}`}>
          {/* Status Chip */}
          <div
            className={`p-2.5 flex items-center gap-2.5 ${
              isCyberpunk
                ? 'bg-[#101620] border border-[#c6ff00]/30 rounded-xl shadow-[0_0_15px_rgba(198,255,0,0.06)]'
                : 'neumorph-card-sm'
            }`}
          >
            <div className={`w-3 h-3 shrink-0 ${isCyberpunk ? 'bg-[#c6ff00] rounded-full shadow-[0_0_10px_#c6ff00] animate-pulse' : 'rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse'}`} />
            <div>
              <span className={`text-[10px] font-bold block leading-tight ${isCyberpunk ? 'font-cyber-display text-white' : ''}`}>
                [SYS // OPERATIONAL]
              </span>
              <span className={`text-[9px] block leading-tight ${isCyberpunk ? 'text-[#8b9bb4]' : 'text-slate-500'}`}>
                All departments running
              </span>
            </div>
          </div>

          {/* User Chip */}
          <div
            className={`p-2 flex items-center gap-2.5 ${
              isCyberpunk
                ? 'bg-[#101620] border border-[#c6ff00]/20 rounded-xl'
                : 'neumorph-card-sm'
            }`}
          >
            <div
              className={`w-7 h-7 font-bold text-xs flex items-center justify-center shrink-0 ${
                isCyberpunk
                  ? 'bg-[#090d13] text-[#c6ff00] border border-[#c6ff00]/50 rounded-lg font-cyber-display text-[10px]'
                  : 'rounded-full bg-gradient-to-tr from-slate-800 to-slate-600 text-white shadow-inner'
              }`}
            >
              RM
            </div>
            <div className="overflow-hidden">
              <span className={`font-semibold text-xs block truncate leading-tight ${isCyberpunk ? 'font-cyber-display text-white text-[10px]' : 'text-slate-900'}`}>
                Resort Manager
              </span>
              <span className={`text-[9px] block truncate leading-tight ${isCyberpunk ? 'text-[#8b9bb4]' : 'text-slate-500'}`}>
                Resorva Resort &amp; Hotel
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main className="flex-1 min-w-0 h-full overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  )
}

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <OwnerThemeProvider>
      <OwnerLayoutContent>{children}</OwnerLayoutContent>
    </OwnerThemeProvider>
  )
}
