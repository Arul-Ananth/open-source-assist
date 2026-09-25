import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

const variantStyles: Record<string, string> = {
  primary:
    'bg-accent text-white border border-accent shadow-none hover:shadow-[4px_4px_0px_0px_rgba(var(--accent-rgb),0.5)] hover:brightness-110',
  secondary:
    'bg-surface text-primary-text border border-border shadow-none hover:shadow-[4px_4px_0px_0px_rgba(var(--accent-rgb),0.3)]',
  ghost:
    'bg-transparent text-secondary-text border border-transparent hover:bg-surface hover:text-primary-text',
  outline:
    'bg-transparent text-primary-text border border-border shadow-none hover:shadow-[4px_4px_0px_0px_rgba(var(--accent-rgb),0.3)] hover:border-accent/50',
}

const sizeStyles: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-150 cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
