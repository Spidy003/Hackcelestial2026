import type { Metadata } from 'next'
import './globals.css'
import SocketProvider from '@/components/SocketProvider'
import { SidebarLayout } from '@/components/ui/8bit/sidebar'

export const metadata: Metadata = {
  title: 'Smart Resort 360 — AI Operations Platform',
  description: '8 autonomous AI agents managing 84 rooms at Meridian Bay Resort, Alibaug with 8-bit retro operations dashboard.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=IBM+Plex+Mono:wght@400;500;600;700&family=VT323&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-[#070b0e] text-slate-100 antialiased selection:bg-[#00ff66] selection:text-black">
        <SocketProvider>
          <SidebarLayout>
            {children}
          </SidebarLayout>
        </SocketProvider>
      </body>
    </html>
  )
}
