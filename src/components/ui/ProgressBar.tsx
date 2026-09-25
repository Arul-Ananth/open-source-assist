import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number
  max?: number
  label?: string
  color?: string
  className?: string
}

export function ProgressBar({ value, max = 100, label, color, className }: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-mono text-secondary-text">{label}</span>
          <span className="text-xs font-mono text-accent">{Math.round(percent)}%</span>
        </div>
      )}
      <div className="h-2 w-full rounded-sm bg-background border border-border overflow-hidden">
        <div
          className="h-full rounded-sm transition-all duration-500 ease-out"
          style={{
            width: `${percent}%`,
            backgroundColor: color || 'var(--accent)',
          }}
        />
      </div>
    </div>
  )
}
