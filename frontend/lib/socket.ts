/**
 * WebSocket client — singleton.
 * Connects to the backend WS at /ws, auto-reconnects on drop,
 * dispatches patches and snapshots to the Zustand store.
 */

import { useResortStore } from './store'
import { WS_URL } from './api'

let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectDelay = 1000

function connect() {
  if (typeof window === 'undefined') return
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return

  ws = new WebSocket(WS_URL)

  ws.onopen = () => {
    console.log('[WS] Connected to', WS_URL)
    reconnectDelay = 1000
    useResortStore.getState().setConnectionStatus('connected')
  }

  ws.onmessage = (evt) => {
    try {
      const msg = JSON.parse(evt.data)
      const store = useResortStore.getState()

      if (msg.type === 'snapshot') {
        store.applySnapshot(msg.state, msg.sim_ts)
      } else if (msg.type === 'patch') {
        store.applyPatch(msg.paths, msg.sim_ts)
        if (msg.events?.length) store.addEvents(msg.events)
        if (msg.decisions?.length) store.addDecisions(msg.decisions)
      }
    } catch (e) {
      console.warn('[WS] Parse error', e)
    }
  }

  ws.onclose = () => {
    console.log('[WS] Disconnected — reconnecting in', reconnectDelay, 'ms')
    useResortStore.getState().setConnectionStatus('disconnected')
    ws = null
    reconnectTimer = setTimeout(() => {
      reconnectDelay = Math.min(reconnectDelay * 1.5, 10000)
      connect()
    }, reconnectDelay)
  }

  ws.onerror = (err) => {
    console.error('[WS] Error', err)
    ws?.close()
  }
}

export function initSocket() {
  connect()
}

export function sendMessage(msg: object) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg))
  }
}
