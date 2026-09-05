'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useResortStore } from '@/lib/store'
import { 
  Home, Calendar, Bell, Settings, LayoutDashboard, 
  FileText, Menu, X, ArrowLeftRight
} from 'lucide-react'

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { weather } = useResortStore()
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  const isWeekly = pathname.endsWith('/week')

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col lg:flex-row owner-neumorphic bg-[#f0f3f8] text-slate-800 antialiased select-none">
      {/* ── Mobile Top Bar (<1024px) ── */}
      <header className="lg:hidden shrink-0 h-14 bg-[#f0f3f8] border-b border-white/80 px-4 flex items-center justify-between shadow-[0_4px_12px_#d1d9e6]">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            className="w-9 h-9 neumorph-card flex items-center justify-center text-slate-700 active:shadow-[inset_2px_2px_5px_#d1d9e6]"
            aria-label="Toggle Navigation"
          >
            {mobileDrawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-xs shadow-md">
              360
            </div>
            <span className="font-bold text-sm tracking-tight text-slate-900">
              SMART RESORT
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-200 text-slate-700 shadow-sm hover:bg-slate-300"
          >
            Operations view
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

      {/* ── Neumorphic Left Sidebar (Desktop Fixed / Mobile Drawer) ── */}
      <aside
        className={`fixed lg:static top-0 left-0 z-50 h-screen w-64 bg-[#f0f3f8] border-r border-white/80 shrink-0 flex flex-col justify-between p-4 transition-transform duration-200 shadow-[4px_0_16px_rgba(209,217,230,0.4)] ${
          mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col gap-4">
          {/* Brand Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center font-bold text-sm shadow-[3px_3px_8px_rgba(37,99,235,0.4)]">
                360
              </div>
              <div>
                <h1 className="font-bold text-sm text-slate-900 tracking-tight leading-none">
                  Smart Resort
                </h1>
                <span className="text-[10px] text-blue-600 font-medium tracking-wide">
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

          {/* Quick Neumorphic Action Chips (Exact to Reference Image Top Row) */}
          <div className="grid grid-cols-4 gap-2">
            <button
              className="h-10 rounded-xl neumorph-btn flex items-center justify-center text-blue-600 hover:text-blue-700"
              title="Home"
            >
              <Home className="w-4 h-4" />
            </button>
            <button
              className="h-10 rounded-xl neumorph-btn flex items-center justify-center text-slate-600 hover:text-slate-800"
              title="Calendar"
            >
              <Calendar className="w-4 h-4" />
            </button>
            <button
              className="h-10 rounded-xl neumorph-btn flex items-center justify-center text-slate-600 hover:text-slate-800"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>
            <button
              className="h-10 rounded-xl neumorph-btn flex items-center justify-center text-slate-600 hover:text-slate-800"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* View Switcher: Owner vs Operations */}
          <div className="p-1.5 neumorph-inset flex items-center justify-between rounded-2xl gap-1">
            <span className="flex-1 py-1 text-center font-semibold text-xs rounded-xl bg-white shadow-sm text-blue-700">
              Owner view
            </span>
            <Link
              href="/"
              className="flex-1 py-1 text-center font-medium text-xs rounded-xl text-slate-600 hover:text-slate-900 transition-colors"
            >
              Operations
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-2 mt-1">
            <Link
              href="/owner"
              onClick={() => setMobileDrawerOpen(false)}
              className={`w-full px-3.5 py-2.5 rounded-2xl flex items-center gap-3 transition-all ${
                !isWeekly
                  ? 'neumorph-btn-blue font-semibold shadow-[4px_4px_12px_rgba(37,99,235,0.35)]'
                  : 'neumorph-btn text-slate-700 font-medium'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span className="text-xs">Dashboard</span>
            </Link>

            <Link
              href="/owner/week"
              onClick={() => setMobileDrawerOpen(false)}
              className={`w-full px-3.5 py-2.5 rounded-2xl flex items-center gap-3 transition-all ${
                isWeekly
                  ? 'neumorph-btn-blue font-semibold shadow-[4px_4px_12px_rgba(37,99,235,0.35)]'
                  : 'neumorph-btn text-slate-700 font-medium'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span className="text-xs">Weekly Briefing</span>
            </Link>
          </nav>
        </div>

        {/* Bottom Area: System Status Block + User Chip */}
        <div className="space-y-3 pt-3 border-t border-slate-200/80">
          {/* Status Chip */}
          <div className="p-3 neumorph-card-sm flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] shrink-0 animate-pulse" />
            <div>
              <span className="text-[11px] font-bold text-slate-800 block leading-tight">
                AI System Online
              </span>
              <span className="text-[10px] text-slate-500 block leading-tight">
                All departments running
              </span>
            </div>
          </div>

          {/* User Chip */}
          <div className="p-2.5 neumorph-card-sm flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-800 to-slate-600 text-white font-bold text-xs flex items-center justify-center shadow-inner shrink-0">
              RM
            </div>
            <div className="overflow-hidden">
              <span className="font-semibold text-xs text-slate-900 block truncate leading-tight">
                Resort Manager
              </span>
              <span className="text-[10px] text-slate-500 block truncate leading-tight">
                Meridian Bay Resort
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content Area (Fitted in viewport, No Scroll) ── */}
      <main className="flex-1 min-w-0 h-full overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  )
}
