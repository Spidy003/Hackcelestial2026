'use client'

import React, { useState } from 'react'

export default function Retro8BitcnWidget({
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

  // Monthly comparison data exactly matching "Desktop vs Mobile visitors" from reference image
  const visitorData = [
    { month: 'Jan', desktop: 38, mobile: 22 },
    { month: 'Feb', desktop: 82, mobile: 58 },
    { month: 'Mar', desktop: 65, mobile: 32 },
    { month: 'Apr', desktop: 25, mobile: 48 },
    { month: 'May', desktop: 60, mobile: 38 },
    { month: 'Jun', desktop: 64, mobile: 44 },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 my-1 select-none">
      {/* ── LEFT: "Desktop vs Mobile visitors" (Pixel Bar Chart - Exact Match to Reference Image) ── */}
      <div className="lg:col-span-7 bg-white border-3 border-black p-3 shadow-[4px_4px_0px_#000000] flex flex-col justify-between">
        <div className="flex items-center justify-between pb-2 border-b-2 border-black mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-black" />
            <h3 className="font-pixel text-[11px] text-black tracking-tight uppercase">
              Desktop vs Mobile visitors
            </h3>
          </div>
          <div className="flex items-center gap-3 text-[9px] font-pixel">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-black inline-block" /> Desktop
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-[#4b5563] inline-block" /> Mobile
            </span>
          </div>
        </div>

        {/* Pixel Bar Graph Canvas */}
        <div className="h-40 flex items-end justify-between gap-3 px-3 pt-4 pb-1 border-b-2 border-l-2 border-black bg-white">
          {visitorData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group">
              <div className="flex items-end gap-1.5 w-full justify-center h-full">
                {/* Desktop Bar (Solid Black) */}
                <div
                  style={{ height: `${d.desktop}%` }}
                  className="w-4 sm:w-5 bg-black border-t-2 border-l-2 border-r-2 border-black transition-all hover:bg-neutral-800 relative"
                  title={`Desktop: ${d.desktop}%`}
                >
                  <span className="opacity-0 group-hover:opacity-100 absolute -top-5 left-1/2 -translate-x-1/2 font-pixel text-[7px] bg-black text-white px-1 py-0.5 whitespace-nowrap z-10">
                    {d.desktop}%
                  </span>
                </div>

                {/* Mobile Bar (Charcoal Grey) */}
                <div
                  style={{ height: `${d.mobile}%` }}
                  className="w-4 sm:w-5 bg-[#4b5563] border-t-2 border-l-2 border-r-2 border-black transition-all hover:bg-[#374151] relative"
                  title={`Mobile: ${d.mobile}%`}
                >
                  <span className="opacity-0 group-hover:opacity-100 absolute -top-5 left-1/2 -translate-x-1/2 font-pixel text-[7px] bg-black text-white px-1 py-0.5 whitespace-nowrap z-10">
                    {d.mobile}%
                  </span>
                </div>
              </div>

              {/* Month Label */}
              <span className="font-pixel text-[9px] text-black mt-2">
                {d.month}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 text-[8px] font-pixel text-slate-600">
          <span>SOURCE: RESORT TELEMETRY ENGINE</span>
          <span>SEASONAL PEAK TRACKER</span>
        </div>
      </div>

      {/* ── RIGHT: Select Difficulty + Health Meter + Audio Settings (Exact Match to Image) ── */}
      <div className="lg:col-span-5 flex flex-col gap-2.5">
        {/* Select Difficulty Card */}
        <div className="bg-white border-3 border-black p-3 shadow-[4px_4px_0px_#000000]">
          <h4 className="font-pixel text-[10px] text-center text-black mb-2 uppercase">
            Select Difficulty
          </h4>
          <div className="flex flex-col gap-2">
            {(['EASY', 'NORMAL', 'HARD'] as const).map((lvl) => {
              const isActive = difficulty === lvl
              return (
                <button
                  key={lvl}
                  onClick={() => handleDiff(lvl)}
                  className={`w-full py-2 font-pixel text-[9px] uppercase tracking-wider rounded-full border-2 border-black shadow-[2px_2px_0px_#000000] cursor-pointer transition-transform active:translate-x-[2px] active:translate-y-[2px] ${
                    isActive
                      ? 'bg-black text-white'
                      : 'bg-white text-black hover:bg-slate-100'
                  }`}
                >
                  {lvl}
                </button>
              )
            })}
          </div>
        </div>

        {/* Health Meters & Audio Settings */}
        <div className="bg-white border-3 border-black p-3 shadow-[4px_4px_0px_#000000] space-y-3">
          {/* Health Bars (Segmented Red Meter) */}
          <div className="space-y-2">
            <div>
              <div className="flex justify-between items-center text-[9px] font-pixel text-black mb-1">
                <span>Facility Health</span>
                <span>{healthA}%</span>
              </div>
              <div className="pixel-health-meter">
                <div
                  className="pixel-health-segmented"
                  style={{ width: `${healthA}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-[9px] font-pixel text-black mb-1">
                <span>System Stress</span>
                <span>{healthB}%</span>
              </div>
              <div className="pixel-health-meter">
                <div
                  className="pixel-health-segmented"
                  style={{ width: `${healthB}%` }}
                />
              </div>
            </div>
          </div>

          {/* Audio Settings */}
          <div className="pt-2 border-t-2 border-black space-y-2">
            <span className="font-pixel text-[9px] text-black block uppercase">
              Audio Settings
            </span>

            <div>
              <div className="flex justify-between text-[8px] font-pixel text-black mb-0.5">
                <span>Master Volume</span>
                <span>{masterVol}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={masterVol}
                onChange={(e) => setMasterVol(Number(e.target.value))}
                className="w-full h-2 bg-black accent-black cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[8px] font-pixel text-black mb-0.5">
                <span>SFX Volume</span>
                <span>{sfxVol}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={sfxVol}
                onChange={(e) => setSfxVol(Number(e.target.value))}
                className="w-full h-2 bg-black accent-black cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="font-pixel text-[8px] text-black uppercase">Mute Audio</span>
              <button
                onClick={() => setMuteAudio(!muteAudio)}
                className={`w-9 h-5 rounded-full border-2 border-black p-0.5 transition-colors cursor-pointer ${
                  muteAudio ? 'bg-black' : 'bg-white'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full border border-black transition-transform ${
                    muteAudio ? 'bg-white translate-x-3.5' : 'bg-black translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
