'use client'

import { useState } from 'react'
import { useResortStore, Asset } from '@/lib/store'
import { formatRupees } from '@/lib/format'
import { Card } from '@/components/ui/8bit/card'
import { Badge } from '@/components/ui/8bit/badge'
import { Progress } from '@/components/ui/8bit/progress'
import { Wrench, AlertTriangle } from 'lucide-react'

const MOCK_ASSETS: Asset[] = [
  { id: 14, name: 'Main Chiller Unit #2', kind: 'HVAC', zone_id: 3, health_score: 48, predicted_days_to_failure: 4.2, revenue_exposure: 280000, criticality: 5, runtime_hours: 8420, recommended_service_window: 'Next 48 Hours' },
  { id: 22, name: 'Infinity Pool Pump A', kind: 'Water Systems', zone_id: 5, health_score: 88, predicted_days_to_failure: 45.0, revenue_exposure: 65000, criticality: 4, runtime_hours: 4200, recommended_service_window: 'Routine 30-Day' },
  { id: 31, name: 'Walk-in Deep Freezer', kind: 'Refrigeration', zone_id: 6, health_score: 59, predicted_days_to_failure: 9.5, revenue_exposure: 190000, criticality: 5, runtime_hours: 12100, recommended_service_window: 'Next 5 Days' },
  { id: 45, name: 'Commercial Laundry Press', kind: 'Laundry', zone_id: 3, health_score: 76, predicted_days_to_failure: 28.0, revenue_exposure: 45000, criticality: 3, runtime_hours: 6800, recommended_service_window: 'Routine 14-Day' },
  { id: 58, name: 'Villa 108 VRV Outdoor Unit', kind: 'HVAC', zone_id: 1, health_score: 94, predicted_days_to_failure: 120.0, revenue_exposure: 35000, criticality: 3, runtime_hours: 2100, recommended_service_window: 'Nominal' },
  { id: 62, name: 'Solar Thermal Bank', kind: 'Energy', zone_id: 4, health_score: 91, predicted_days_to_failure: 90.0, revenue_exposure: 55000, criticality: 3, runtime_hours: 5400, recommended_service_window: 'Nominal' },
]

export default function MaintenancePage() {
  const { assets } = useResortStore()
  const rawList = Object.values(assets)
  const assetList = rawList.length > 0 ? rawList : MOCK_ASSETS

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="p-4 bg-[#0a1014] border-2 border-black shadow-[4px_4px_0px_#000] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-3 h-3 bg-[#ffb703] inline-block shadow-[1px_1px_0px_#000]" />
            <h1 className="font-pixel text-sm sm:text-base text-white tracking-wider uppercase">
              PREDICTIVE MAINTENANCE & ASSET RUL
            </h1>
          </div>
          <p className="font-mono-data text-xs text-slate-400">
            120 assets continuously monitored via Isolation Forest anomaly detection and Gradient Boosting RUL estimation.
          </p>
        </div>

        <Badge variant="amber">120 IOT ASSETS MONITORED</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assetList.map((a) => {
          const isAtRisk = a.predicted_days_to_failure < 10

          return (
            <Card key={a.id} titleBar={a.name} variant={isAtRisk ? 'red' : 'default'} className="p-0">
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="cyan">Zone 0{a.zone_id} • {a.kind}</Badge>
                  <span className={`font-mono-data text-base font-bold ${isAtRisk ? 'text-[#ff3366]' : 'text-[#00ff66]'}`}>
                    {a.health_score}% HEALTH
                  </span>
                </div>

                <div className="p-2.5 bg-black border border-slate-850 space-y-1 font-mono-data text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Predicted RUL:</span>
                    <span className={`font-bold ${isAtRisk ? 'text-[#ff3366]' : 'text-white'}`}>
                      {a.predicted_days_to_failure} Days
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Revenue Exposure:</span>
                    <span className="text-[#ff527f] font-bold">{formatRupees(a.revenue_exposure, true)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Runtime Hours:</span>
                    <span className="text-slate-200">{a.runtime_hours.toLocaleString()} hrs</span>
                  </div>
                </div>

                {isAtRisk && (
                  <div className="p-2 bg-[#2a0c14] border border-[#ff3366] flex items-center gap-2 font-mono-data text-xs text-[#ff527f]">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Auto-dispatched Workorder to Senior Tech</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-850 flex items-center justify-between font-mono-data text-xs text-slate-400">
                  <span>Criticality: Level {a.criticality}</span>
                  <span className="text-[#00f0ff]">{a.recommended_service_window}</span>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
