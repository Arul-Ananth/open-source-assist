import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  ref?: React.Ref<HTMLInputElement>
  error?: string | boolean | null
}

export function Input({ className, type = 'text', error, ref, ...props }: InputProps) {
  return (
    <input
      type={type}
      ref={ref}
      aria-invalid={error ? true : undefined}
      className={cn(
        'input-field flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground transition-all duration-200 placeholder:text-muted-foreground focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50',
        error && 'border-accent text-accent-text focus-visible:ring-accent',
        className,
      )}
      {...props}
    />
  )
}

