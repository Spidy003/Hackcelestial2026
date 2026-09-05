import * as React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'green' | 'cyan' | 'amber' | 'red' | 'dark' | 'pill-black' | 'pill-white'
  size?: 'sm' | 'md' | 'lg'
  pill?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'md', pill = false, children, ...props }, ref) => {
    const variantStyles = {
      default: 'bg-[#e2e8f0] text-black hover:bg-white',
      green: 'bg-[#00ff66] text-black hover:bg-[#2eff81]',
      cyan: 'bg-[#00f0ff] text-black hover:bg-[#3bf4ff]',
      amber: 'bg-[#ffb703] text-black hover:bg-[#ffc42e]',
      red: 'bg-[#ff3366] text-white hover:bg-[#ff527f]',
      dark: 'bg-[#16222b] text-[#00f0ff] hover:bg-[#1f303d] hover:text-white',
      'pill-black': 'bg-black text-white hover:bg-neutral-800',
      'pill-white': 'bg-white text-black hover:bg-slate-100',
    }

    const sizeStyles = {
      sm: 'px-2.5 py-1 text-[8px]',
      md: 'px-4 py-2 text-[10px]',
      lg: 'px-6 py-3 text-xs',
    }

    const isPill = pill || variant === 'pill-black' || variant === 'pill-white'

    return (
      <button
        ref={ref}
        className={`font-pixel uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#000] cursor-pointer inline-flex items-center justify-center gap-2 select-none transition-transform disabled:opacity-50 disabled:cursor-not-allowed ${
          isPill ? 'rounded-full' : 'rounded-none'
        } ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
