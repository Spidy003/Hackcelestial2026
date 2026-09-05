import * as React from 'react'

interface TabsContextType {
  activeTab: string
  setActiveTab: (val: string) => void
}

const TabsContext = React.createContext<TabsContextType>({
  activeTab: '',
  setActiveTab: () => {},
})

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  children,
  className = '',
}: {
  defaultValue?: string
  value?: string
  onValueChange?: (val: string) => void
  children: React.ReactNode
  className?: string
}) {
  const [current, setCurrent] = React.useState(value || defaultValue || '')

  const activeTab = value !== undefined ? value : current
  const setActiveTab = (val: string) => {
    if (value === undefined) setCurrent(val)
    onValueChange?.(val)
  }

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`flex flex-wrap gap-2 p-1.5 bg-black border-2 border-black shadow-[3px_3px_0px_#000] mb-4 ${className}`}>
      {children}
    </div>
  )
}

export function TabsTrigger({
  value,
  children,
  className = '',
}: {
  value: string
  children: React.ReactNode
  className?: string
}) {
  const { activeTab, setActiveTab } = React.useContext(TabsContext)
  const isActive = activeTab === value

  return (
    <button
      onClick={() => setActiveTab(value)}
      className={`font-pixel text-[9px] uppercase tracking-wider px-3 py-1.5 border-2 border-black transition-all cursor-pointer ${
        isActive
          ? 'bg-[#00ff66] text-black shadow-[2px_2px_0px_#000] -translate-y-0.5'
          : 'bg-[#16222b] text-slate-400 hover:text-white hover:bg-[#20323f]'
      } ${className}`}
    >
      {children}
    </button>
  )
}

export function TabsContent({
  value,
  children,
  className = '',
}: {
  value: string
  children: React.ReactNode
  className?: string
}) {
  const { activeTab } = React.useContext(TabsContext)
  if (activeTab !== value) return null

  return <div className={className}>{children}</div>
}
