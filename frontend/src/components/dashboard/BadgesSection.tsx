import { useState } from 'react'
import {
  FolderGit2,
  Code2,
  Flame,
  Users,
  Shield,
  Sparkles,
  Zap,
  GitPullRequest,
  CheckCircle2,
  Lock,
  Trophy,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { GitHubBadge } from '@/lib/use-github-profile'

interface BadgesSectionProps {
  badges?: GitHubBadge[]
  isLoading?: boolean
}

const ICON_MAP: Record<string, any> = {
  FolderGit2,
  Code2,
  Flame,
  Users,
  Shield,
  Sparkles,
  Zap,
  GitPullRequest,
}

const TIER_STYLES: Record<string, { border: string; bg: string; text: string; glow: string }> = {
  Gold: {
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    glow: 'hover:shadow-[0_0_20px_rgba(245,158,11,0.25)]',
  },
  Diamond: {
    border: 'border-violet-500/40',
    bg: 'bg-violet-500/10',
    text: 'text-violet-400',
    glow: 'hover:shadow-[0_0_20px_rgba(139,92,246,0.25)]',
  },
  Silver: {
    border: 'border-sky-500/40',
    bg: 'bg-sky-500/10',
    text: 'text-sky-400',
    glow: 'hover:shadow-[0_0_20px_rgba(56,189,248,0.25)]',
  },
  Bronze: {
    border: 'border-orange-500/40',
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    glow: 'hover:shadow-[0_0_20px_rgba(249,115,22,0.25)]',
  },
}

export function BadgesSection({ badges = [], isLoading }: BadgesSectionProps) {
  const [selectedBadge, setSelectedBadge] = useState<GitHubBadge | null>(null)

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-border/60 bg-surface/40 p-3" />
        ))}
      </div>
    )
  }

  const unlockedCount = badges.filter((b) => b.unlocked).length

  return (
    <div className="space-y-3">
      {/* Header bar with summary count */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Trophy className="size-3.5 text-accent-text" />
          <span>Earned via GitHub Activity</span>
        </span>
        <Badge variant="outline" className="border-accent/40 bg-accent/10 font-mono text-[11px] text-accent-text">
          {unlockedCount} of {badges.length} Unlocked
        </Badge>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {badges.slice(0, 6).map((badge) => {
          const IconComp = ICON_MAP[badge.icon] || Trophy
          const tierStyle = TIER_STYLES[badge.tier] || TIER_STYLES.Bronze

          return (
            <button
              key={badge.id}
              type="button"
              onClick={() => setSelectedBadge(badge)}
              className={cn(
                'group relative flex items-start gap-3 rounded-xl border p-2.5 text-left transition-all duration-200',
                badge.unlocked
                  ? `${tierStyle.border} ${tierStyle.bg} ${tierStyle.glow}`
                  : 'border-border/60 bg-surface/30 opacity-70 hover:opacity-100',
              )}
            >
              {/* Badge Icon */}
              <div
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-lg border text-sm transition-transform duration-200 group-hover:scale-105',
                  badge.unlocked ? `${tierStyle.border} ${tierStyle.bg} ${tierStyle.text}` : 'border-border bg-surface text-muted-foreground',
                )}
              >
                <IconComp className="size-4" />
              </div>

              {/* Badge Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="truncate text-xs font-semibold tracking-tight">{badge.title}</p>
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.2 font-mono text-[9px] uppercase tracking-wider',
                      tierStyle.text,
                    )}
                  >
                    {badge.tier}
                  </span>
                </div>
                <p className="line-clamp-1 text-[11px] text-muted-foreground">{badge.description}</p>

                {/* Progress bar or Unlocked tag */}
                <div className="mt-1.5 flex items-center justify-between text-[10px]">
                  {badge.unlocked ? (
                    <span className="flex items-center gap-1 font-medium text-emerald-400">
                      <CheckCircle2 className="size-3" />
                      <span>Unlocked</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Lock className="size-3" />
                      <span>{badge.progress}% completed</span>
                    </span>
                  )}
                  {badge.unlocked_at && (
                    <span className="font-mono text-[9px] text-muted-foreground/80">{badge.unlocked_at}</span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Selected Badge Detail Modal */}
      {selectedBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
          <div className="animate-pop-in relative w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-2xl">
            <button
              type="button"
              onClick={() => setSelectedBadge(null)}
              className="absolute right-3.5 top-3.5 rounded-md p-1 text-muted-foreground hover:bg-background/80 hover:text-foreground"
            >
              <X className="size-4" />
            </button>

            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex size-12 items-center justify-center rounded-xl border text-xl',
                  selectedBadge.unlocked
                    ? `${TIER_STYLES[selectedBadge.tier].border} ${TIER_STYLES[selectedBadge.tier].bg} ${TIER_STYLES[selectedBadge.tier].text}`
                    : 'border-border bg-surface text-muted-foreground',
                )}
              >
                {(() => {
                  const IconComp = ICON_MAP[selectedBadge.icon] || Trophy
                  return <IconComp className="size-6" />
                })()}
              </div>
              <div>
                <h3 className="text-sm font-bold">{selectedBadge.title}</h3>
                <span className={cn('font-mono text-xs font-semibold', TIER_STYLES[selectedBadge.tier].text)}>
                  {selectedBadge.tier} Tier Achievement
                </span>
              </div>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{selectedBadge.description}</p>

            <div className="mt-4 rounded-xl border border-border/60 bg-background/50 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Status</span>
                <span className={selectedBadge.unlocked ? 'font-semibold text-emerald-400' : 'text-amber-400'}>
                  {selectedBadge.unlocked ? '✓ Unlocked' : 'In Progress'}
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="h-full bg-accent transition-all duration-300"
                  style={{ width: `${selectedBadge.progress}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedBadge(null)}
              className="mt-4 w-full rounded-lg bg-surface border border-border py-2 text-xs font-semibold transition-colors hover:bg-accent/15 hover:text-accent-text"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
