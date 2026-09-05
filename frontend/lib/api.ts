/**
 * Centralized API & WebSocket configuration.
 * When deployed (e.g. on Vercel), set NEXT_PUBLIC_API_URL to your Render backend URL
 * (e.g. https://resort360-api.onrender.com).
 * Defaults to http://localhost:8000 for local development.
 */

export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'https://smart-resort-backend.onrender.com'
).replace(/\/$/, '')

export const WS_URL =
  (process.env.NEXT_PUBLIC_WS_URL || API_URL.replace(/^http/, 'ws')) + '/ws'

