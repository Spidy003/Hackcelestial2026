'use client'

import { useEffect } from 'react'
import { initSocket } from '@/lib/socket'

export default function SocketProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initSocket()
  }, [])

  return <>{children}</>
}
