'use client'

import { useState } from 'react'
import { Card } from './ui/8bit/card'
import { Badge } from './ui/8bit/badge'
import { Button } from './ui/8bit/button'
import { 
  AlertTriangle, ShieldCheck, Download, CheckCircle2, 
  Flame, Bell, X, ArrowRight, Zap, RefreshCw, Sparkles,
  ThermometerSnowflake, Users, Send
} from 'lucide-react'
import { useResortStore } from '@/lib/store'

interface DemoReportAlertModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function DemoReportAlertModal({ isOpen, onClose }: DemoReportAlertModalProps) {
  const [resolved, setResolved] = useState(false)
  const [broadcasting, setBroadcasting] = useState(false)
  const [broadcastDone, setBroadcastDone] = useState(false)
  const { addEvents, addDecisions } = useResortStore()

  if (!isOpen) return null

  // 1. Download full formatted shift incident report
  const handleDownloadReport = () => {
    const reportText = `================================================================================
RESORTIERAI — AUTONOMOUS RESORT OPERATIONS INCIDENT REPORT
Meridian Bay Resort, Alibaug • 84 Keys
Generated: ${new Date().toLocaleString()}
Incident Reference: #REP-2026-904
Severity: CRITICAL (HIGH RISK)
================================================================================

[1. INCIDENT TELEMETRY & DIAGNOSTICS]
--------------------------------------------------------------------------------
Trigger Event       : Zone 4 Seafood Cold-Storage Compressor Pressure Spike (3.8 bar)
Secondary Impact    : VIP Villa 102 Airflow Temperature Deviation (+4.2°C)
Primary Guest Impact: Vikramaditya Singhania (Cohort: High-LTV Coastal Escapists)
GERS Sentiment Score: Dropped to 58/100 (High Churn / Review Escalation Risk)
Financial At Risk   : ₹54,000 (F&B inventory + VIP stay cancellation risk)

[2. MULTI-AGENT AUTONOMOUS RESOLUTION DISPATCH]
--------------------------------------------------------------------------------
1. MAINTENANCE AGENT (Model: XGBoost Asset Anomaly Detector)
   • Action: Dispatched HVAC Technician Anil Pawar (Staff ID #ST-09)
   • Directive: Deploy auxiliary R-410A coolant bypass valve
   • SLA Target: 6 mins | Current ETA: 3 mins | Status: In-Progress

2. CONCIERGE & GUEST EXPERIENCE AGENT (Model: TF-IDF Aspect Classifier)
   • Action: Automatic VIP Service Recovery triggered
   • Benefit: Allocated complimentary Sunset Beach Cabana + Coastal Seafood Platter
   • Projected GERS Recovery: 58 ➔ 93 (+35 pts)

3. F&B INVENTORY AGENT (Model: Demand-Forecast RFC)
   • Action: Transferred 42kg premium seafood stock to Cold Room 2B
   • Loss Incurred: ₹0 (100% Stock Preserved)

[3. SYSTEM KPI IMPACT SUMMARY]
--------------------------------------------------------------------------------
Revenue Protected   : ₹54,000
Guest Sentiment     : Restored to 93 (Excellent)
SLA Breaches        : 0 Breaches
Negative Reviews    : Prevented (Tripadvisor / Google rating protected at 4.9★)

================================================================================
CONFIRMED BY: ResortierAi Autonomous Event Bus & Decision Engine
================================================================================`

    const blob = new Blob([reportText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ResortierAi_Shift_Incident_Report_${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // 2. Simulate AI Resolution Execution
  const handleResolveAlert = () => {
    setResolved(true)

    // Add live decision and event into the store
    addDecisions([{
      id: `DEC-DEMO-${Date.now().toString().slice(-4)}`,
      agent: 'MAINTENANCE & CONCIERGE',
      kind: 'incident_mitigation',
      title: 'Auto-Resolved Incident #REP-904: Coolant bypass deployed & VIP GERS restored to 93',
      reasoning_steps: [
        'Detected 3.8 bar pressure anomaly on Cold Storage Compressor #CS-04',
        'Dispatched Technician Anil Pawar with auxiliary bypass valve',
        'Upgraded guest Vikramaditya Singhania to Seaside Cabana',
        'GERS recovered from 58 to 93 points'
      ],
      inputs: { zone_id: 4, room: 'Villa 102', temp: 8.4 },
      confidence: 0.98,
      rupee_impact: 54000,
      counterfactual_text: 'Compressor failure would spoil ₹54,000 seafood and result in 1-star negative review.',
      counterfactual_rupees: 54000,
      autonomy: 'autonomous',
      ts: new Date().toISOString(),
      cascade_id: 'cascade-demo-report'
    }])

    addEvents([{
      id: `EVT-DEMO-${Date.now()}`,
      type: 'incident.resolved',
      payload: { ref: '#REP-2026-904', status: 'mitigated', value_saved: 54000 },
      emitted_by: 'ResortierAi_Supervisor',
      cascade_id: 'cascade-demo-report',
      sim_ts: new Date().toISOString(),
      ts: new Date().toISOString()
    }])
  }

  // 3. Broadcast to Owner Dashboard
  const handleBroadcastToOwner = () => {
    setBroadcasting(true)
    try {
      const existing = JSON.parse(localStorage.getItem('resort_escalated_alerts') || '[]')
      const demoAlert = {
        id: `alt-demo-${Date.now()}`,
        alertId: `alt-demo-${Date.now()}`,
        severity: 'CRITICAL',
        title: '🚨 VIP Villa 102 Temperature Spike & Zone 4 Cold Storage Failure',
        source: 'ResortierAi Operations Alert',
        message: 'Compressor anomaly detected in Zone 4. Autonomous recovery dispatched. ₹54,000 revenue protected.',
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        room: 'Villa 102',
        guest: 'Vikramaditya Singhania',
        impact: '₹54,000 Revenue Protected • GERS 93 Restored',
        status: 'investigating',
        actionLabel: 'View Resolution'
      }
      existing.unshift(demoAlert)
      localStorage.setItem('resort_escalated_alerts', JSON.stringify(existing))
      window.dispatchEvent(new Event('storage'))
      setBroadcastDone(true)
    } catch {}
    setBroadcasting(false)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#090e13] border-4 border-[#ff3366] shadow-[8px_8px_0px_#000] p-0 overflow-hidden">
        {/* Header Ribbon */}
        <div className="bg-[#ff3366] text-black px-4 py-2.5 flex items-center justify-between font-pixel">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold tracking-wider">
            <span className="w-3 h-3 bg-black inline-block animate-ping" />
            <span>CRITICAL INCIDENT REPORT & AI ALERT [DEMO]</span>
          </div>
          <button 
            onClick={onClose}
            className="w-6 h-6 border-2 border-black bg-black text-[#ff3366] hover:text-white flex items-center justify-center font-bold cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto font-mono-data text-xs">
          {/* Incident Meta Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-black/60 border border-slate-800 rounded">
            <div className="flex items-center gap-2">
              <Badge variant="red" className="animate-pulse">SEVERITY: CRITICAL</Badge>
              <span className="text-slate-300 font-bold">REF: #REP-2026-904</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-[11px]">
              <span className="text-emerald-400 font-bold">● LIVE TELEMETRY TRIGGER</span>
              <span>• Zone 4 & Villa 102</span>
            </div>
          </div>

          {/* Incident Description */}
          <div className="p-3 bg-[#13070b] border-2 border-[#ff3366]/40 rounded-lg">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-[#ff3366] shrink-0 mt-0.5 animate-bounce" />
              <div>
                <h4 className="font-bold text-white text-sm mb-1">
                  Seafood Cold-Storage Compressor Failure + VIP Villa 102 Temperature Spike
                </h4>
                <p className="text-slate-300 leading-relaxed text-xs">
                  Temperature sensor in Zone 4 Cold Storage surged to <strong>8.4°C</strong> (Target: &lt; 2.0°C). Concurrently, VIP Villa 102 reported HVAC failure. Guest Vikramaditya Singhania&apos;s GERS sentiment score dropped to <strong>58/100</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Autonomous Multi-Agent Mitigation Actions */}
          <div className="space-y-2">
            <span className="font-pixel text-[9px] text-[#00ff66] uppercase tracking-wider block">
              AUTONOMOUS MULTI-AGENT MITIGATION ACTIONS:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="p-2.5 bg-[#0a141b] border border-cyan-500/30 rounded">
                <div className="flex items-center gap-1.5 text-[#00f0ff] font-bold text-[11px] mb-1">
                  <ThermometerSnowflake className="w-3.5 h-3.5" />
                  <span>Maintenance Agent</span>
                </div>
                <p className="text-slate-300 text-[10px] leading-tight">
                  Technician Anil Pawar dispatched with bypass valve. ETA: <strong>3 mins</strong>.
                </p>
              </div>

              <div className="p-2.5 bg-[#0a141b] border border-purple-500/30 rounded">
                <div className="flex items-center gap-1.5 text-purple-400 font-bold text-[11px] mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Concierge Agent</span>
                </div>
                <p className="text-slate-300 text-[10px] leading-tight">
                  Upgraded guest to Seaside Cabana + vintage wine. GERS restored to <strong>93</strong>.
                </p>
              </div>

              <div className="p-2.5 bg-[#0a141b] border border-emerald-500/30 rounded">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px] mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>F&amp;B Agent</span>
                </div>
                <p className="text-slate-300 text-[10px] leading-tight">
                  Re-routed 42kg seafood to Cold Room 2B. <strong>₹0 spoilage</strong> loss.
                </p>
              </div>
            </div>
          </div>

          {/* KPI Value Card */}
          <div className="p-3 bg-black border-2 border-black flex items-center justify-around text-center rounded">
            <div>
              <div className="text-[10px] text-slate-400">PROTECTED VALUE</div>
              <div className="text-base font-bold text-[#00ff66]">₹54,000</div>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div>
              <div className="text-[10px] text-slate-400">GERS RECOVERY</div>
              <div className="text-base font-bold text-[#00f0ff]">58 ➔ 93 (+35)</div>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div>
              <div className="text-[10px] text-slate-400">STATUS</div>
              <div className={`text-base font-bold ${resolved ? 'text-[#00ff66]' : 'text-[#ffb703]'}`}>
                {resolved ? 'RESOLVED' : 'ACTIVE'}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
            {!resolved ? (
              <Button 
                variant="green" 
                size="md" 
                className="w-full sm:flex-1 py-2 font-bold cursor-pointer"
                onClick={handleResolveAlert}
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                EXECUTE AI MITIGATION
              </Button>
            ) : (
              <div className="w-full sm:flex-1 py-2 px-3 bg-emerald-950/70 border-2 border-[#00ff66] text-[#00ff66] font-bold text-center rounded flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>INCIDENT MITIGATED &amp; LOGGED IN LEDGER</span>
              </div>
            )}

            <Button 
              variant="cyan" 
              size="md" 
              className="w-full sm:flex-1 py-2 font-bold cursor-pointer"
              onClick={handleDownloadReport}
            >
              <Download className="w-4 h-4 mr-1.5" />
              DOWNLOAD REPORT (TXT)
            </Button>

            <button
              onClick={handleBroadcastToOwner}
              disabled={broadcasting || broadcastDone}
              className={`w-full sm:w-auto px-3 py-2 border-2 border-black font-pixel text-[9px] uppercase tracking-wider rounded transition-all cursor-pointer ${
                broadcastDone 
                  ? 'bg-purple-900/60 text-purple-300 border-purple-500' 
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
              title="Sync alert to Owner Dashboard"
            >
              {broadcastDone ? '✓ ON OWNER DASHBOARD' : 'SYNC TO OWNER'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-black border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500 font-mono-data">
          <span>ResortierAi Multi-Agent System • Telemetry Simulator</span>
          <span>Press ESC or ✕ to close</span>
        </div>
      </div>
    </div>
  )
}
