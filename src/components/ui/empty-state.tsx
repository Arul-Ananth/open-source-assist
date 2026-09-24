import * as React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>
  title: string
  description: string
  action?: React.ReactNode
  className?: string
  iconClassName?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  iconClassName,
}: EmptyStateProps) {
  return (
    <Card className={cn('mt-8', className)}>
      <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
        <Icon className={cn('size-8 text-muted-foreground', iconClassName)} aria-hidden="true" />
        <div>
          <p className="font-semibold text-foreground">{title}</p>
          <p className="mt-1 max-w-[48ch] text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  )
}

