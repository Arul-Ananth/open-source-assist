import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-sm px-2 py-0.5 font-mono text-[10px] font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'bg-accent text-on-accent',
        secondary: 'border border-border bg-surface text-muted-foreground',
        outline: 'border border-border text-muted-foreground bg-transparent',
        accent: 'bg-accent/15 border border-accent/30 text-accent-text',
        success: 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400',
        warning: 'bg-yellow-500/15 border border-yellow-500/30 text-yellow-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
