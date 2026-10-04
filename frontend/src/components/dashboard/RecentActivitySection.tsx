import {
  GitCommit,
  GitPullRequest,
  FolderGit2,
  Users,
  ExternalLink,
  Activity,
} from 'lucide-react'
import type { GitHubRecentActivity } from '@/lib/use-github-profile'

interface RecentActivitySectionProps {
  activities?: GitHubRecentActivity[]
  isLoading?: boolean
}

const ICON_MAP: Record<string, any> = {
  GitCommit,
  GitPullRequest,
  FolderGit2,
  Users,
}

export function RecentActivitySection({ activities = [], isLoading }: RecentActivitySectionProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl border border-border/60 bg-surface/40 p-3" />
        ))}
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="flex min-h-[140px] flex-col items-center justify-center rounded-xl border border-dashed border-border/80 p-6 text-center text-xs text-muted-foreground">
        <Activity className="size-6 text-muted-foreground/60 mb-2" />
        <p className="font-semibold text-foreground">No recent public events found</p>
        <p className="mt-1 max-w-[32ch] text-[11px]">
          Make a commit, open a PR, or star a repo on GitHub to see live updates here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {activities.slice(0, 5).map((act) => {
        const IconComp = ICON_MAP[act.icon] || GitCommit

        return (
          <div
            key={act.id}
            className="group flex items-start gap-3 rounded-xl border border-border/60 bg-surface/30 p-3 transition-colors hover:border-accent/40 hover:bg-surface/60"
          >
            {/* Event Icon */}
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-accent-text">
              <IconComp className="size-4" />
            </div>

            {/* Event details */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-semibold text-foreground">{act.title}</p>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                  {act.time_display}
                </span>
              </div>

              <div className="mt-0.5 flex items-center gap-1.5 text-[11px]">
                <a
                  href={act.repo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono font-medium text-accent-text hover:underline"
                >
                  <span>{act.repo}</span>
                  <ExternalLink className="size-2.5 opacity-60 group-hover:opacity-100" />
                </a>
              </div>

              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                {act.detail}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
