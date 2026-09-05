'use client'

import { useResortStore, Zone } from '@/lib/store'
import { Card } from './ui/8bit/card'
import { Badge } from './ui/8bit/badge'
import { Progress } from './ui/8bit/progress'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/8bit/table'
import { MapPin, Users, Flame, AlertTriangle } from 'lucide-react'

const DEFAULT_ZONES: Zone[] = [
  { id: 1, name: 'North Villa Cluster', kind: 'Rooms', floor: 1, capacity: 20, staff_required_baseline: 6, workload_index: 84, staff_on_duty: 6, staff_required_now: 7, backlog_count: 3 },
  { id: 2, name: 'South Coastal Cottages', kind: 'Rooms', floor: 1, capacity: 16, staff_required_baseline: 4, workload_index: 62, staff_on_duty: 4, staff_required_now: 4, backlog_count: 1 },
  { id: 3, name: 'Main Wing — Floor 1', kind: 'Rooms', floor: 1, capacity: 24, staff_required_baseline: 6, workload_index: 54, staff_on_duty: 5, staff_required_now: 5, backlog_count: 1 },
  { id: 4, name: 'Main Wing — Floor 2', kind: 'Rooms', floor: 2, capacity: 24, staff_required_baseline: 6, workload_index: 48, staff_on_duty: 6, staff_required_now: 5, backlog_count: 0 },
  { id: 5, name: 'Infinity Pool & Cabanas', kind: 'Amenity', floor: 0, capacity: 60, staff_required_baseline: 4, workload_index: 76, staff_on_duty: 4, staff_required_now: 5, backlog_count: 2 },
  { id: 6, name: 'Mandwa Coastal Dining', kind: 'F&B', floor: 0, capacity: 90, staff_required_baseline: 8, workload_index: 89, staff_on_duty: 8, staff_required_now: 9, backlog_count: 4 },
  { id: 7, name: 'Sunset Beach Lounge', kind: 'F&B', floor: 0, capacity: 50, staff_required_baseline: 4, workload_index: 68, staff_on_duty: 4, staff_required_now: 4, backlog_count: 1 },
  { id: 8, name: 'Serenity Ayurvedic Spa', kind: 'Wellness', floor: 1, capacity: 15, staff_required_baseline: 4, workload_index: 42, staff_on_duty: 4, staff_required_now: 3, backlog_count: 0 },
]

export default function ZoneHeatmap() {
  const { zones } = useResortStore()
  const rawList = Object.values(zones)
  
  // Use store data if loaded and has active workloads, else operational defaults
  const zoneList = rawList.length > 0 && rawList.some(z => (z.workload_index || 0) > 0)
    ? rawList
    : DEFAULT_ZONES

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-[#00f0ff] inline-block shadow-[1px_1px_0px_#000]" />
          <h2 className="font-pixel text-xs text-white uppercase tracking-wider">
            OPERATIONAL ZONE MATRIX & LOAD BALANCING
          </h2>
        </div>
        <span className="font-mono-data text-xs text-slate-400">
          8 Active Resort Sectors
        </span>
      </div>

      {/* ── Desktop View (>=768px): 8-bit Table ── */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ZONE / SECTOR</TableHead>
              <TableHead>TYPE</TableHead>
              <TableHead>WORKLOAD INDEX</TableHead>
              <TableHead>STAFF ON DUTY</TableHead>
              <TableHead>REQUIRED</TableHead>
              <TableHead>BACKLOG</TableHead>
              <TableHead>STATUS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {zoneList.map((z) => {
              const wl = z.workload_index || 50
              const progressVariant = wl >= 80 ? 'red' : wl >= 65 ? 'amber' : 'green'
              const isSurge = wl >= 80

              return (
                <TableRow key={z.id}>
                  <TableCell className="font-bold text-white">
                    <span className="font-pixel text-[9px] text-[#00f0ff] mr-2">Z0{z.id}</span>
                    {z.name}
                  </TableCell>
                  <TableCell className="text-slate-400 uppercase text-[11px]">
                    {z.kind}
                  </TableCell>
                  <TableCell className="w-48">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono-data">
                        <span className="text-slate-400">Load:</span>
                        <span className={isSurge ? 'text-[#ff3366] font-bold' : 'text-[#00ff66] font-bold'}>
                          {wl}/100
                        </span>
                      </div>
                      <Progress value={wl} variant={progressVariant} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-bold text-white text-sm">{z.staff_on_duty}</span>
                    <span className="text-slate-400 text-xs"> staff</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-mono-data text-slate-300">{z.staff_required_now || z.staff_required_baseline}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`text-sm font-mono-data ${z.backlog_count > 2 ? 'text-[#ff3366] font-bold' : 'text-slate-300'}`}>
                      {z.backlog_count} tasks
                    </span>
                  </TableCell>
                  <TableCell>
                    {isSurge ? (
                      <Badge variant="red">SURGE</Badge>
                    ) : wl >= 65 ? (
                      <Badge variant="amber">BUSY</Badge>
                    ) : (
                      <Badge variant="green">NOMINAL</Badge>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* ── Mobile View (<768px): Stacked 8-bit Cards ── */}
      <div className="md:hidden space-y-3">
        {zoneList.map((z) => {
          const wl = z.workload_index || 50
          const progressVariant = wl >= 80 ? 'red' : wl >= 65 ? 'amber' : 'green'
          const isSurge = wl >= 80

          return (
            <Card key={z.id} titleBar={`Z0${z.id} • ${z.name}`} variant={isSurge ? 'red' : 'default'} className="p-0">
              <div className="p-3 space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-pixel text-[8px] text-slate-400 uppercase">Sector Type:</span>
                  <span className="font-mono-data text-white font-bold">{z.kind}</span>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono-data mb-1">
                    <span className="text-slate-400">Workload Index:</span>
                    <span className={isSurge ? 'text-[#ff3366] font-bold' : 'text-[#00ff66] font-bold'}>
                      {wl}/100
                    </span>
                  </div>
                  <Progress value={wl} variant={progressVariant} />
                </div>

                <div className="pt-2 border-t border-slate-850 flex items-center justify-between text-xs font-mono-data">
                  <div>
                    <span className="text-slate-400">Staff: </span>
                    <strong className="text-white">{z.staff_on_duty}</strong> / {z.staff_required_now || z.staff_required_baseline} req
                  </div>
                  <div>
                    <span className="text-slate-400">Backlog: </span>
                    <strong className={z.backlog_count > 2 ? 'text-[#ff3366]' : 'text-white'}>
                      {z.backlog_count}
                    </strong>
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
