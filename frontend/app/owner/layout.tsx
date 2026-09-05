'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useResortStore } from '@/lib/store'
import { OwnerThemeProvider, useOwnerTheme } from '@/lib/owner-theme'
import { 
  Home, Calendar, Bell, Settings, LayoutDashboard, 
  FileText, Menu, X, Sparkles, Layers
} from 'lucide-react'

function OwnerLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { weather } = useResortStore()
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const { theme, toggleTheme, is8Bit } = useOwnerTheme()

  const isWeekly = pathname.endsWith('/week')

  return (
    <div
      className={`h-screen w-screen overflow-hidden flex flex-col lg:flex-row antialiased select-none transition-colors duration-150 ${
        is8Bit
          ? 'theme-8bitcn bg-white text-black font-pixel'
          : 'owner-neumorphic bg-[#f0f3f8] text-slate-800'
      }`}
    >
      {/* ── Mobile Top Bar (<1024px) ── */}
      <header
        className={`lg:hidden shrink-0 h-14 px-4 flex items-center justify-between ${
          is8Bit
            ? 'bg-white border-b-3 border-black shadow-[0_4px_0px_#000]'
            : 'bg-[#f0f3f8] border-b border-white/80 shadow-[0_4px_12px_#d1d9e6]'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            className={`w-9 h-9 flex items-center justify-center cursor-pointer ${
              is8Bit
                ? 'bg-white border-2 border-black shadow-[2px_2px_0px_#000]'
                : 'neumorph-card text-slate-700 active:shadow-[inset_2px_2px_5px_#d1d9e6]'
            }`}
            aria-label="Toggle Navigation"
          >
            {mobileDrawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 flex items-center justify-center font-bold text-xs ${
                is8Bit
                  ? 'bg-black text-white border-2 border-black shadow-[2px_2px_0px_#000]'
                  : 'rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md'
              }`}
            >
              360
            </div>
            <span className="font-bold text-sm tracking-tight">
              SMART RESORT
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick theme switch on mobile top bar */}
          <button
            onClick={toggleTheme}
            className={`px-2.5 py-1 text-[9px] font-pixel uppercase cursor-pointer ${
              is8Bit
                ? 'bg-black text-white border-2 border-black shadow-[2px_2px_0px_#000] rounded-full'
                : 'bg-slate-900 text-white border border-slate-700 shadow-xs rounded-full'
            }`}
          >
            {is8Bit ? '👔 CLASSIC' : '🕹️ 8BIT'}
          </button>
          <Link
            href="/"
            className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
              is8Bit
                ? 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000]'
                : 'bg-slate-200 text-slate-700 shadow-sm hover:bg-slate-300'
            }`}
          >
            Ops
          </Link>
        </div>
      </header>

      {/* ── Mobile Drawer Backdrop ── */}
      {mobileDrawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs"
          onClick={() => setMobileDrawerOpen(false)}
        />
      )}

      {/* ── Left Sidebar (Desktop Fixed / Mobile Drawer) ── */}
      <aside
        className={`fixed lg:static top-0 left-0 z-50 h-screen w-64 shrink-0 flex flex-col justify-between p-4 transition-transform duration-200 ${
          is8Bit
            ? 'bg-white border-r-3 border-black shadow-[4px_0_0px_#000]'
            : 'bg-[#f0f3f8] border-r border-white/80 shadow-[4px_0_16px_rgba(209,217,230,0.4)]'
        } ${
          mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col gap-3.5">
          {/* Brand Header */}
          <div className={`flex items-center justify-between pb-3 ${is8Bit ? 'border-b-2 border-black' : 'border-b border-slate-200/80'}`}>
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 flex items-center justify-center font-bold text-sm ${
                  is8Bit
                    ? 'bg-black text-white border-2 border-black shadow-[3px_3px_0px_#000]'
                    : 'rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-[3px_3px_8px_rgba(37,99,235,0.4)]'
                }`}
              >
                360
              </div>
              <div>
                <h1 className="font-bold text-sm tracking-tight leading-none">
                  Smart Resort
                </h1>
                <span className={`text-[10px] font-medium tracking-wide ${is8Bit ? 'text-black' : 'text-blue-600'}`}>
                  Executive Suite • 84 Keys
                </span>
              </div>
            </div>
            <button
              onClick={() => setMobileDrawerOpen(false)}
              className="lg:hidden text-slate-500 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Theme Switcher Button directly in Sidebar */}
          <button
            onClick={toggleTheme}
            className={`w-full py-2 px-3 flex items-center justify-center gap-2 font-bold cursor-pointer transition-transform active:translate-x-[2px] active:translate-y-[2px] ${
              is8Bit
                ? 'pixel-pill-black text-[9px]'
                : 'neumorph-btn text-slate-800 text-xs hover:text-blue-600'
            }`}
            title="Toggle between Executive Neumorphic UI and Retro 8bitcn UI"
          >
            {is8Bit ? (
              <>
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>👔 SWITCH TO EXECUTIVE UI</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>🕹️ SWITCH TO 8bitcn UI</span>
              </>
            )}
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
                className={`h-9 flex items-center justify-center cursor-pointer ${
                  is8Bit
                    ? 'bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_#000] text-black hover:bg-slate-100'
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
            className={`p-1 flex items-center justify-between rounded-xl gap-1 ${
              is8Bit
                ? 'border-2 border-black bg-white shadow-[2px_2px_0px_#000]'
                : 'neumorph-inset rounded-2xl'
            }`}
          >
            <span
              className={`flex-1 py-1 text-center font-semibold text-xs ${
                is8Bit
                  ? 'bg-black text-white rounded-md font-pixel text-[9px]'
                  : 'rounded-xl bg-white shadow-sm text-blue-700'
              }`}
            >
              Owner view
            </span>
            <Link
              href="/"
              className={`flex-1 py-1 text-center font-medium text-xs rounded-md transition-colors ${
                is8Bit
                  ? 'text-black hover:bg-slate-100 font-pixel text-[9px]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Operations
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-2 mt-1">
            <Link
              href="/owner"
              onClick={() => setMobileDrawerOpen(false)}
              className={`w-full px-3.5 py-2.5 flex items-center gap-3 transition-all ${
                is8Bit
                  ? !isWeekly
                    ? 'bg-black text-white border-2 border-black shadow-[3px_3px_0px_#000] rounded-full font-pixel text-[10px]'
                    : 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] rounded-full font-pixel text-[10px] hover:bg-slate-50'
                  : !isWeekly
                  ? 'rounded-2xl neumorph-btn-blue font-semibold shadow-[4px_4px_12px_rgba(37,99,235,0.35)]'
                  : 'rounded-2xl neumorph-btn text-slate-700 font-medium'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span className={is8Bit ? 'text-[9px]' : 'text-xs'}>Dashboard</span>
            </Link>

            <Link
              href="/owner/week"
              onClick={() => setMobileDrawerOpen(false)}
              className={`w-full px-3.5 py-2.5 flex items-center gap-3 transition-all ${
                is8Bit
                  ? isWeekly
                    ? 'bg-black text-white border-2 border-black shadow-[3px_3px_0px_#000] rounded-full font-pixel text-[10px]'
                    : 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000] rounded-full font-pixel text-[10px] hover:bg-slate-50'
                  : isWeekly
                  ? 'rounded-2xl neumorph-btn-blue font-semibold shadow-[4px_4px_12px_rgba(37,99,235,0.35)]'
                  : 'rounded-2xl neumorph-btn text-slate-700 font-medium'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span className={is8Bit ? 'text-[9px]' : 'text-xs'}>Weekly Briefing</span>
            </Link>
          </nav>
        </div>

        {/* Bottom Area: System Status Block + User Chip */}
        <div className={`space-y-2.5 pt-3 ${is8Bit ? 'border-t-2 border-black' : 'border-t border-slate-200/80'}`}>
          {/* Status Chip */}
          <div
            className={`p-2.5 flex items-center gap-2.5 ${
              is8Bit
                ? 'bg-white border-2 border-black shadow-[2px_2px_0px_#000] rounded-md'
                : 'neumorph-card-sm'
            }`}
          >
            <div className={`w-3 h-3 shrink-0 ${is8Bit ? 'bg-[#00ff66] border border-black' : 'rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse'}`} />
            <div>
              <span className={`text-[10px] font-bold block leading-tight ${is8Bit ? 'font-pixel' : ''}`}>
                AI SYSTEM ONLINE
              </span>
              <span className="text-[9px] text-slate-500 block leading-tight">
                All departments running
              </span>
            </div>
          </div>

          {/* User Chip */}
          <div
            className={`p-2 flex items-center gap-2.5 ${
              is8Bit
                ? 'bg-white border-2 border-black shadow-[2px_2px_0px_#000] rounded-md'
                : 'neumorph-card-sm'
            }`}
          >
            <div
              className={`w-7 h-7 font-bold text-xs flex items-center justify-center shrink-0 ${
                is8Bit
                  ? 'bg-black text-white border border-black font-pixel text-[9px]'
                  : 'rounded-full bg-gradient-to-tr from-slate-800 to-slate-600 text-white shadow-inner'
              }`}
            >
              RM
            </div>
            <div className="overflow-hidden">
              <span className={`font-semibold text-xs block truncate leading-tight ${is8Bit ? 'font-pixel text-[9px]' : 'text-slate-900'}`}>
                Resort Manager
              </span>
              <span className="text-[9px] text-slate-500 block truncate leading-tight">
                Meridian Bay Resort
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
