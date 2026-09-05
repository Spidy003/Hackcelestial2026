'use client'

import { useState } from 'react'
import { useResortStore, InventoryItem } from '@/lib/store'
import { formatRupees } from '@/lib/format'
import { Card } from '@/components/ui/8bit/card'
import { Badge } from '@/components/ui/8bit/badge'
import { ShoppingCart } from 'lucide-react'

const MOCK_ITEMS: InventoryItem[] = [
  { id: 1, sku: 'FNB-SEAFOOD-SURMAI', name: 'Fresh King Fish (Surmai)', category: 'F&B Fresh', unit: 'kg', on_hand: 8.5, par_level: 25.0, forecast_7d: 32.0, days_of_cover: 1.8, shortfall_qty: 16.5, expiring_soon_qty: 0, unit_cost: 650 },
  { id: 2, sku: 'FNB-MANGO-ALPHONSO', name: 'Alibaug GI Alphonso Mangoes', category: 'F&B Fresh', unit: 'crates', on_hand: 4.0, par_level: 15.0, forecast_7d: 18.0, days_of_cover: 1.5, shortfall_qty: 11.0, expiring_soon_qty: 2.0, unit_cost: 1400 },
  { id: 3, sku: 'BAR-SPIRIT-GIN-IND', name: 'Jaisalmer Craft Indian Gin', category: 'Bar Spirits', unit: 'bottles', on_hand: 14.0, par_level: 20.0, forecast_7d: 12.0, days_of_cover: 8.2, shortfall_qty: 0, expiring_soon_qty: 0, unit_cost: 2800 },
  { id: 4, sku: 'HK-LINEN-TOWEL-POOL', name: 'Organic Cotton Pool Towels', category: 'Housekeeping', unit: 'pcs', on_hand: 180.0, par_level: 250.0, forecast_7d: 190.0, days_of_cover: 6.6, shortfall_qty: 70.0, expiring_soon_qty: 0, unit_cost: 450 },
  { id: 5, sku: 'SPA-OIL-AYUR-DHANV', name: 'Dhanwantharam Spa Oil', category: 'Spa Supplies', unit: 'litres', on_hand: 6.2, par_level: 10.0, forecast_7d: 4.5, days_of_cover: 9.6, shortfall_qty: 0, expiring_soon_qty: 0, unit_cost: 1200 },
  { id: 6, sku: 'FNB-DAIRY-MALAI-PNR', name: 'Fresh Artisan Malai Paneer', category: 'F&B Dairy', unit: 'kg', on_hand: 5.0, par_level: 18.0, forecast_7d: 22.0, days_of_cover: 1.6, shortfall_qty: 13.0, expiring_soon_qty: 1.5, unit_cost: 380 },
]

export default function InventoryPage() {
  const { inventory } = useResortStore()
  const rawList = Object.values(inventory)
  const itemList = rawList.length > 0 ? rawList : MOCK_ITEMS

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="p-4 bg-[#0a1014] border-2 border-black shadow-[4px_4px_0px_#000] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-3 h-3 bg-[#00ff66] inline-block shadow-[1px_1px_0px_#000]" />
            <h1 className="font-pixel text-sm sm:text-base text-white tracking-wider uppercase">
              SMART INVENTORY & RECIPE BOM DEPLETION
            </h1>
          </div>
          <p className="font-mono-data text-xs text-slate-400">
            Ridge regression consumption forecasting, automated purchase orders, and zero food-spoilage governance.
          </p>
        </div>

        <Badge variant="green">90 SKUS TRACKED</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {itemList.map((it) => {
          const isLow = it.days_of_cover < 2.5

          return (
            <Card key={it.id} titleBar={it.name} variant={isLow ? 'amber' : 'default'} className="p-0">
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="cyan">{it.category}</Badge>
                  <span className={`font-mono-data text-base font-bold ${isLow ? 'text-[#ffb703]' : 'text-[#00ff66]'}`}>
                    {it.days_of_cover}d COVER
                  </span>
                </div>

                <div className="p-2.5 bg-black border border-slate-850 space-y-1 font-mono-data text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Stock On Hand:</span>
                    <span className="text-white font-bold">{it.on_hand} / {it.par_level} {it.unit}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>7-Day ML Forecast:</span>
                    <span className="text-[#00f0ff] font-bold">{it.forecast_7d} {it.unit}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Unit Cost:</span>
                    <span className="text-slate-200">{formatRupees(it.unit_cost)}</span>
                  </div>
                </div>

                {isLow && it.shortfall_qty > 0 && (
                  <div className="p-2 bg-[#261c06] border border-[#ffb703] flex items-center justify-between font-mono-data text-xs text-[#ffc42e]">
                    <div className="flex items-center gap-1.5">
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Auto PO Generated</span>
                    </div>
                    <span>+{it.shortfall_qty} {it.unit}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-850 flex items-center justify-between font-mono-data text-xs text-slate-400">
                  <span>Val: {formatRupees(it.on_hand * it.unit_cost, true)}</span>
                  <span className={it.expiring_soon_qty > 0 ? 'text-[#ff3366]' : 'text-[#00ff66]'}>
                    {it.expiring_soon_qty > 0 ? `⚠️ ${it.expiring_soon_qty} expiring` : 'Fresh'}
                  </span>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
