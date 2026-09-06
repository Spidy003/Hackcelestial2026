'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export type OwnerTheme = 'dark' | 'executive'

interface OwnerThemeContextType {
  theme: OwnerTheme
  toggleTheme: () => void
  setTheme: (theme: OwnerTheme) => void
  isDark: boolean
  isCyberpunk: boolean // compatibility alias
  is8Bit: boolean // compatibility alias
}

const OwnerThemeContext = createContext<OwnerThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
  isDark: true,
  isCyberpunk: true,
  is8Bit: false,
})

export function OwnerThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<OwnerTheme>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('resort_owner_theme') as string | null
      if (saved === 'executive') {
        setThemeState('executive')
      } else {
        setThemeState('dark')
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
    setTheme(theme === 'executive' ? 'dark' : 'executive')
  }

  useEffect(() => {
    const handleSync = () => {
      try {
        const saved = localStorage.getItem('resort_owner_theme') as string | null
        if (saved === 'executive') {
          setThemeState('executive')
        } else {
          setThemeState('dark')
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

  const isDark = !mounted || theme === 'dark'

  return (
    <OwnerThemeContext.Provider value={{ 
      theme, 
      toggleTheme, 
      setTheme, 
      isDark,
      isCyberpunk: isDark, 
      is8Bit: false 
    }}>
      {children}
    </OwnerThemeContext.Provider>
  )
}

export function useOwnerTheme() {
  return useContext(OwnerThemeContext)
}
