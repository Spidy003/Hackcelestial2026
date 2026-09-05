import * as React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'green' | 'cyan' | 'amber' | 'red'
  titleBar?: string
}

export function Card({
  className = '',
  variant = 'default',
  titleBar,
  children,
  ...props
}: CardProps) {
  const variantStyles = {
    default: 'bg-[#0f171c] border-2 border-black shadow-[4px_4px_0px_#000]',
    green: 'bg-[#071711] border-2 border-[#00ff66] shadow-[4px_4px_0px_#000]',
    cyan: 'bg-[#06161f] border-2 border-[#00f0ff] shadow-[4px_4px_0px_#000]',
    amber: 'bg-[#191406] border-2 border-[#ffb703] shadow-[4px_4px_0px_#000]',
    red: 'bg-[#1c080e] border-2 border-[#ff3366] shadow-[4px_4px_0px_#000]',
  }

  return (
    <div
      className={`relative overflow-hidden transition-all ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {titleBar && (
        <div className="px-3 py-1.5 bg-black border-b-2 border-black flex items-center justify-between">
          <span className="font-pixel text-[10px] text-white tracking-wider uppercase">
            {titleBar}
          </span>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-[#ff3366] inline-block" />
            <span className="w-2 h-2 bg-[#ffb703] inline-block" />
            <span className="w-2 h-2 bg-[#00ff66] inline-block" />
          </div>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  )
}

export function CardHeader({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`mb-3 ${className}`} {...props}>{children}</div>
}

export function CardTitle({ className = '', children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={`font-pixel text-xs text-white uppercase tracking-wider ${className}`} {...props}>
      {children}
    </h3>
  )
}

export function CardDescription({ className = '', children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`font-mono-data text-xs text-slate-400 mt-1 leading-relaxed ${className}`} {...props}>
      {children}
    </p>
  )
}

export function CardContent({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={className} {...props}>{children}</div>
}

export function CardFooter({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`mt-3 pt-3 border-t-2 border-black/40 flex items-center justify-between ${className}`} {...props}>
      {children}
    </div>
  )
}
