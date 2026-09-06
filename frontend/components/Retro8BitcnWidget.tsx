'use client'

import React, { useState } from 'react'
import { Zap, Activity, Volume2, VolumeX, Shield, Sparkles, TrendingUp } from 'lucide-react'

export default function CyberHudWidget({
  onSelectDifficulty,
  activeDifficulty = 'NORMAL',
}: {
  onSelectDifficulty?: (level: 'EASY' | 'NORMAL' | 'HARD') => void
  activeDifficulty?: string
}) {
  const [difficulty, setDifficulty] = useState<'EASY' | 'NORMAL' | 'HARD'>('NORMAL')
  const [masterVol, setMasterVol] = useState(75)
  const [sfxVol, setSfxVol] = useState(50)
  const [muteAudio, setMuteAudio] = useState(false)
  const [healthA, setHealthA] = useState(75)
  const [healthB, setHealthB] = useState(45)

  const handleDiff = (d: 'EASY' | 'NORMAL' | 'HARD') => {
    setDifficulty(d)
    if (onSelectDifficulty) onSelectDifficulty(d)
  }

  // Monthly comparison data styled in neon lime vs cyan
  const visitorData = [
    { month: 'JAN', desktop: 38, mobile: 22 },
    { month: 'FEB', desktop: 82, mobile: 58 },
    { month: 'MAR', desktop: 65, mobile: 32 },
    { month: 'APR', desktop: 25, mobile: 48 },
    { month: 'MAY', desktop: 60, mobile: 38 },
    { month: 'JUN', desktop: 64, mobile: 44 },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 my-2 select-none font-cyber">
      {/* ── LEFT: Dual Telemetry & Visitor HUD (Matches Left Main Chart in XOTC Image) ── */}
      <div className="lg:col-span-7 bg-[#0c1017] border border-[#c6ff00]/35 rounded-2xl p-3.5 shadow-[0_0_25px_rgba(198,255,0,0.06)] flex flex-col justify-between relative overflow-hidden group">
        {/* Subtle HUD crosshairs in corners */}
        <span className="absolute top-1.5 left-2 text-[#c6ff00]/40 font-mono text-[9px] pointer-events-none">+</span>
        <span className="absolute top-1.5 right-2 text-[#c6ff00]/40 font-mono text-[9px] pointer-events-none">+</span>
        <span className="absolute bottom-1.5 left-2 text-[#c6ff00]/40 font-mono text-[9px] pointer-events-none">+</span>
        <span className="absolute bottom-1.5 right-2 text-[#c6ff00]/40 font-mono text-[9px] pointer-events-none">+</span>

        <div>
          <div className="flex items-center justify-between pb-2 border-b border-[#c6ff00]/20 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#c6ff00] shadow-[0_0_8px_#c6ff00] animate-pulse" />
              <h3 className="font-cyber-display text-xs text-white tracking-wider uppercase font-bold">
                Guest Flow & Channel Inflow
              </h3>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1.5 text-[#c6ff00] font-bold">
                <span className="w-2.5 h-2.5 bg-[#c6ff00] rounded-xs shadow-[0_0_6px_#c6ff00]" /> Direct (Web)
              </span>
              <span className="flex items-center gap-1.5 text-[#00f5d4] font-bold">
                <span className="w-2.5 h-2.5 bg-[#00f5d4] rounded-xs shadow-[0_0_6px_#00f5d4]" /> Mobile / OTA
              </span>
            </div>
          </div>

          {/* Cyber Dual Bar Canvas */}
          <div className="h-36 flex items-end justify-between gap-3 px-3 pt-3 pb-1 border-b border-l border-[#c6ff00]/25 bg-[#090d14]/70 rounded-lg">
            {visitorData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group/bar">
                <div className="flex items-end gap-1.5 w-full justify-center h-full">
                  {/* Neon Lime Bar */}
                  <div
                    style={{ height: `${d.desktop}%` }}
                    className="w-3 sm:w-4 bg-gradient-to-t from-[#7ca300] to-[#c6ff00] rounded-t-xs transition-all hover:brightness-125 shadow-[0_0_10px_rgba(198,255,0,0.3)] relative"
                    title={`Direct: ${d.desktop}%`}
                  >
                    <span className="opacity-0 group-hover/bar:opacity-100 absolute -top-5 left-1/2 -translate-x-1/2 font-cyber text-[8px] bg-[#c6ff00] text-black font-black px-1 py-0.5 rounded-xs whitespace-nowrap z-10 shadow-sm">
                      {d.desktop}%
                    </span>
                  </div>

                  {/* Cyber Cyan Bar */}
                  <div
                    style={{ height: `${d.mobile}%` }}
                    className="w-3 sm:w-4 bg-gradient-to-t from-[#008f7d] to-[#00f5d4] rounded-t-xs transition-all hover:brightness-125 shadow-[0_0_10px_rgba(0,245,212,0.3)] relative"
                    title={`Mobile: ${d.mobile}%`}
                  >
                    <span className="opacity-0 group-hover/bar:opacity-100 absolute -top-5 left-1/2 -translate-x-1/2 font-cyber text-[8px] bg-[#00f5d4] text-black font-black px-1 py-0.5 rounded-xs whitespace-nowrap z-10 shadow-sm">
                      {d.mobile}%
                    </span>
                  </div>
                </div>

                {/* Month Label */}
                <span className="font-cyber-display text-[9px] text-slate-400 font-bold mt-2 tracking-wider">
                  {d.month}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2.5 text-[9px] text-slate-400 font-cyber">
          <span className="flex items-center gap-1.5 text-[#c6ff00]">
            <TrendingUp className="w-3 h-3" /> [TELEMETRY: REAL-TIME FEED]
          </span>
          <span className="text-slate-500">SEASONAL PEAK COGNITION ACTIVE</span>
        </div>
      </div>

      {/* ── RIGHT: Operational Resilience & Controls (Matches Right Cards in XOTC Image) ── */}
      <div className="lg:col-span-5 flex flex-col gap-2.5">
        {/* Scenario Resilience Mode */}
        <div className="bg-[#0c1017] border border-[#c6ff00]/35 rounded-2xl p-3 shadow-[0_0_25px_rgba(198,255,0,0.06)] relative">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#c6ff00]/20 mb-2">
            <span className="font-cyber-display text-[10px] text-white font-bold tracking-wider uppercase">
              Operational Load Mode
            </span>
            <span className="text-[9px] text-[#c6ff00] font-bold">
              [HUD // ACTIVE]
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 mb-2.5">
            {[
              { id: 'EASY', label: 'CALM' },
              { id: 'NORMAL', label: 'PEAK' },
              { id: 'HARD', label: 'CRISIS' },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => handleDiff(d.id as any)}
                className={`py-1.5 text-[10px] font-cyber-display font-bold uppercase rounded-lg transition-all cursor-pointer ${
                  difficulty === d.id
                    ? 'bg-[#c6ff00] text-black shadow-[0_0_15px_rgba(198,255,0,0.5)] font-black'
                    : 'bg-[#101622] text-slate-300 border border-[#c6ff00]/20 hover:border-[#c6ff00] hover:text-white'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Resilience Meters */}
          <div className="space-y-1.5">
            <div>
              <div className="flex justify-between text-[9px] mb-0.5 font-bold">
                <span className="text-slate-300">Villa Service Readiness</span>
                <span className="text-[#c6ff00]">{healthA}%</span>
              </div>
              <div className="cyber-meter-track">
                <div className="cyber-meter-bar-lime" style={{ width: `${healthA}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[9px] mb-0.5 font-bold">
                <span className="text-slate-300">Dining & Bar Surge Capacity</span>
                <span className="text-[#00f5d4]">{healthB}%</span>
              </div>
              <div className="cyber-meter-track">
                <div className="cyber-meter-bar-cyan" style={{ width: `${healthB}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Audio / Signal Telemetry */}
        <div className="bg-[#0c1017] border border-[#c6ff00]/35 rounded-2xl p-2.5 shadow-[0_0_20px_rgba(198,255,0,0.06)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMuteAudio(!muteAudio)}
              className="w-8 h-8 rounded-lg bg-[#141b25] border border-[#c6ff00]/30 flex items-center justify-center text-[#c6ff00] hover:border-[#c6ff00] transition-colors"
            >
              {muteAudio ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <div>
              <span className="text-[10px] font-cyber-display font-bold text-white block leading-none">
                HUD Alert Chimes
              </span>
              <span className="text-[8.5px] text-slate-400 block mt-0.5">
                {muteAudio ? 'Muted' : 'Stereo Operational'}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              setHealthA(Math.min(100, healthA + 5))
              setHealthB(Math.min(100, healthB + 8))
            }}
            className="px-3 py-1.5 bg-[#c6ff00] text-black font-cyber-display font-black text-[9px] rounded-lg shadow-[0_0_12px_rgba(198,255,0,0.4)] hover:bg-[#d8ff33] transition-all cursor-pointer uppercase"
          >
            OPTIMIZE
          </button>
        </div>
      </div>
    </div>
  )
}
