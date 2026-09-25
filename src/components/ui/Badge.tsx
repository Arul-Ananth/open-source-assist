import { cn } from '@/lib/utils'
import type { HTMLAttributes, ReactNode } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'accent' | 'outline' | 'success' | 'warning'
  children: ReactNode
}

const variantStyles: Record<string, string> = {
  default: 'bg-surface border border-border text-secondary-text',
  accent: 'bg-accent/15 border border-accent/30 text-accent',
  outline: 'border border-border text-secondary-text bg-transparent',
  success: 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400',
  warning: 'bg-yellow-500/15 border border-yellow-500/30 text-yellow-400',
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-mono font-medium shadow-none',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
