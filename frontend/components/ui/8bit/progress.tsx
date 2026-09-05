import * as React from 'react'

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  variant?: 'green' | 'cyan' | 'amber' | 'red'
}

export function Progress({
  value,
  max = 100,
  variant = 'green',
  className = '',
  ...props
}: ProgressProps) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100)

  const variantBar = {
    green: 'pixel-progress-bar-green',
    cyan: 'pixel-progress-bar-cyan',
    amber: 'pixel-progress-bar-amber',
    red: 'pixel-progress-bar-red',
  }

  return (
    <div
      className={`pixel-progress-bg w-full ${className}`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      {...props}
    >
      <div
        className={`${variantBar[variant]} transition-all duration-300`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
