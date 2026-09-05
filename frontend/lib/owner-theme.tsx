'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export type OwnerTheme = 'executive' | '8bitcn'

interface OwnerThemeContextType {
  theme: OwnerTheme
  toggleTheme: () => void
  setTheme: (theme: OwnerTheme) => void
  is8Bit: boolean
}

const OwnerThemeContext = createContext<OwnerThemeContextType>({
  theme: 'executive',
  toggleTheme: () => {},
  setTheme: () => {},
  is8Bit: false,
})

export function OwnerThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<OwnerTheme>('executive')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('resort_owner_theme') as OwnerTheme | null
      if (saved === '8bitcn' || saved === 'executive') {
        setThemeState(saved)
      }
    } catch {
      // ignore
    }
    setMounted(true)
  }, [])

  const setTheme = (newTheme: OwnerTheme) => {
    setThemeState(newTheme)
    try {
      localStorage.setItem('resort_owner_theme', newTheme)
      window.dispatchEvent(new Event('resort-theme-change'))
    } catch {
      // ignore
    }
  }

  const toggleTheme = () => {
    setTheme(theme === 'executive' ? '8bitcn' : 'executive')
  }

  useEffect(() => {
    const handleSync = () => {
      try {
        const saved = localStorage.getItem('resort_owner_theme') as OwnerTheme | null
        if (saved && (saved === '8bitcn' || saved === 'executive')) {
          setThemeState(saved)
        }
      } catch {}
    }
    window.addEventListener('resort-theme-change', handleSync)
    window.addEventListener('storage', handleSync)
    return () => {
      window.removeEventListener('resort-theme-change', handleSync)
      window.removeEventListener('storage', handleSync)
    }
  }, [])

  const is8Bit = mounted && theme === '8bitcn'

  return (
    <OwnerThemeContext.Provider value={{ theme, toggleTheme, setTheme, is8Bit }}>
      {children}
    </OwnerThemeContext.Provider>
  )
}

export function useOwnerTheme() {
  return useContext(OwnerThemeContext)
}
