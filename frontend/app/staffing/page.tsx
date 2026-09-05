'use client'

import { useState } from 'react'
import { useResortStore, Staff } from '@/lib/store'
import { Card } from '@/components/ui/8bit/card'
import { Badge } from '@/components/ui/8bit/badge'
import { Progress } from '@/components/ui/8bit/progress'
import { Users, Clock, Flame } from 'lucide-react'

const MOCK_STAFF: Staff[] = [
  { id: 1, name: 'Sandeep Patil', role: 'Housekeeping Lead', skills: ['Deep Clean', 'VIP Setup'], status: 'active', current_zone_id: 1, fatigue_score: 34, utilisation_pct: 82, hours_this_week: 36, quality_rating: 4.9, shift_start: 7, shift_end: 15 },
  { id: 2, name: 'Anita Jadhav', role: 'Housekeeping Associate', skills: ['Turnover', 'Linen'], status: 'active', current_zone_id: 1, fatigue_score: 68, utilisation_pct: 91, hours_this_week: 39, quality_rating: 4.8, shift_start: 7, shift_end: 15 },
  { id: 3, name: 'Ganesh Kulkarni', role: 'Senior HVAC Tech', skills: ['Chillers', 'Electrical'], status: 'active', current_zone_id: 3, fatigue_score: 28, utilisation_pct: 65, hours_this_week: 32, quality_rating: 4.95, shift_start: 9, shift_end: 17 },
  { id: 4, name: 'Priya Shinde', role: 'F&B Service Captain', skills: ['Wine Pairing', 'Banquets'], status: 'active', current_zone_id: 6, fatigue_score: 75, utilisation_pct: 94, hours_this_week: 41, quality_rating: 4.85, shift_start: 12, shift_end: 20 },
  { id: 5, name: 'Rahul Pawar', role: 'Pool & Cabana Attendant', skills: ['Water Safety'], status: 'active', current_zone_id: 5, fatigue_score: 42, utilisation_pct: 78, hours_this_week: 35, quality_rating: 4.75, shift_start: 8, shift_end: 16 },
  { id: 6, name: 'Savita Bhosale', role: 'Ayurvedic Therapist', skills: ['Panchakarma'], status: 'break', current_zone_id: 8, fatigue_score: 22, utilisation_pct: 60, hours_this_week: 30, quality_rating: 5.0, shift_start: 10, shift_end: 18 },
  { id: 7, name: 'Nilesh Naik', role: 'Front Desk Concierge', skills: ['Languages', 'Ticketing'], status: 'active', current_zone_id: 3, fatigue_score: 38, utilisation_pct: 74, hours_this_week: 35, quality_rating: 4.9, shift_start: 7, shift_end: 15 },
  { id: 8, name: 'Kiran Thorat', role: 'Sous Chef (Coastal Seafood)', skills: ['Inventory BOM', 'Seafood'], status: 'active', current_zone_id: 6, fatigue_score: 82, utilisation_pct: 96, hours_this_week: 44, quality_rating: 4.9, shift_start: 11, shift_end: 21 },
]

export default function StaffingPage() {
  const { staff } = useResortStore()
  const rawList = Object.values(staff)
  const staffList = rawList.length > 0 ? rawList : MOCK_STAFF

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="p-4 bg-[#0a1014] border-2 border-black shadow-[4px_4px_0px_#000] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-3 h-3 bg-[#00f0ff] inline-block shadow-[1px_1px_0px_#000]" />
            <h1 className="font-pixel text-sm sm:text-base text-white tracking-wider uppercase">
              DYNAMIC STAFFING & ACTIVE ROSTER
            </h1>
          </div>
          <p className="font-mono-data text-xs text-slate-400">
            42 staff members load-balanced across 8 zones with algorithmic fatigue limits and zero overtime penalty.
          </p>
        </div>

        <Badge variant="cyan">{staffList.length} STAFF ON DUTY</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {staffList.map((s) => {
          const isFatigued = s.fatigue_score >= 75

          return (
            <Card key={s.id} titleBar={s.name} variant={isFatigued ? 'red' : 'default'} className="p-0">
              <div className="p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono-data text-xs text-slate-300 font-bold">{s.role}</span>
                  <Badge variant={s.status === 'active' ? 'green' : 'default'}>{s.status}</Badge>
                </div>

                <div className="p-2 bg-black border border-slate-850 space-y-1 font-mono-data text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Sector:</span>
                    <span className="text-white font-bold">Zone 0{s.current_zone_id}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Shift:</span>
                    <span className="text-slate-200">{s.shift_start}:00 - {s.shift_end}:00</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Utilisation:</span>
                    <span className="text-[#00f0ff] font-bold">{s.utilisation_pct}%</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-mono-data text-xs mb-1">
                    <span className="text-slate-400">Fatigue Index:</span>
                    <span className={isFatigued ? 'text-[#ff3366] font-bold' : 'text-[#00ff66] font-bold'}>
                      {s.fatigue_score}/100
                    </span>
                  </div>
                  <Progress value={s.fatigue_score} variant={isFatigued ? 'red' : 'green'} />
                </div>

                <div className="pt-2 border-t border-slate-850 flex items-center justify-between font-mono-data text-xs text-slate-400">
                  <span>{s.hours_this_week}h logged</span>
                  <span className="text-[#ffb703] font-bold">{s.quality_rating} ★</span>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
