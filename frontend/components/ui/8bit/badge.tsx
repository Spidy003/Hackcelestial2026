import * as React from 'react'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'green' | 'cyan' | 'amber' | 'red' | 'purple' | 'dark'
}

export function Badge({
  className = '',
  variant = 'default',
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: 'bg-slate-800 text-slate-200 border-black',
    green: 'bg-[#00ff66]/20 text-[#00ff66] border-[#00ff66]',
    cyan: 'bg-[#00f0ff]/20 text-[#00f0ff] border-[#00f0ff]',
    amber: 'bg-[#ffb703]/20 text-[#ffb703] border-[#ffb703]',
    red: 'bg-[#ff3366]/20 text-[#ff3366] border-[#ff3366]',
    purple: 'bg-[#b5179e]/20 text-[#d946ef] border-[#d946ef]',
    dark: 'bg-black text-white border-slate-700',
  }

  return (
    <span
      className={`font-pixel text-[8px] uppercase tracking-wider px-2 py-0.5 border-2 shadow-[2px_2px_0px_#000] inline-flex items-center gap-1.5 leading-none ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}
