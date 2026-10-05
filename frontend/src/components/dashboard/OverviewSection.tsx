import { useState } from 'react'
import {
  ExternalLink,
  Flame,
  GitPullRequest,
  GraduationCap,
  Trophy,
  Sparkles,
  BookOpen,
  Calendar,
  Users as UsersIcon,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Button } from '@/components/ui'
import { useAuthStore } from '@/lib/auth-store'
import { useGitHubUserProfile } from '@/lib/use-github-profile'
import { SkillAssessmentModal } from '@/components/roadmap/SkillAssessmentModal'
import { BadgesSection } from './BadgesSection'
import { RecentActivitySection } from './RecentActivitySection'
import { QuickActionsSection } from './QuickActionsSection'

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  )
}

interface OverviewSectionProps {
  onNavigate: (sectionId: string) => void
}

export function OverviewSection({ onNavigate }: OverviewSectionProps) {
  const user = useAuthStore((s) => s.user)
  const { data, isLoading, refetch, isFetching } = useGitHubUserProfile()
  const [hoveredDay, setHoveredDay] = useState<{ date: string; count: number } | null>(null)
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false)

  const profile = data?.profile
  const stats = data?.stats
  const badges = data?.badges ?? []
  const activities = data?.recent_activity ?? []
  const heatmap = data?.heatmap ?? []
  const languages = data?.languages ?? []

  const displayName = profile?.name || user?.username || 'contributor'
  const handle = profile?.username || user?.username || 'contributor'
  const avatarUrl = profile?.avatar_url || user?.avatar_url || `https://github.com/${handle}.png`
  const initial = displayName.charAt(0).toUpperCase()

  const formattedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : 'June 2025'

  return (
    <div className="animate-fade-up space-y-6">
      {/* Title bar with live refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back, {displayName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Synchronized live with your GitHub profile and activity.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2 border-border/80 text-xs font-medium"
        >
          <RefreshCw className={`size-3.5 ${isFetching ? 'animate-spin text-accent-text' : ''}`} />
          <span>{isFetching ? 'Syncing...' : 'Sync GitHub'}</span>
        </Button>
      </div>

      {/* Profile Header Card */}
      <Card className="relative overflow-hidden border border-border bg-surface shadow-none">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 size-64 rounded-full bg-accent/5 blur-3xl" />
        <CardContent className="flex flex-col gap-5 p-5 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar with online status glow */}
            <div className="relative">
              <img
                src={avatarUrl}
                alt={displayName}
                className="size-16 rounded-2xl border-2 border-border object-cover shadow-soft-sm transition-transform duration-200 hover:scale-105"
                onError={(e) => {
                  // Fallback to letter initial badge
                  e.currentTarget.style.display = 'none'
                  const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback')
                  if (fallback) fallback.classList.remove('hidden')
                }}
              />
              <span className="avatar-fallback hidden flex size-16 items-center justify-center rounded-2xl bg-gradient-program font-mono text-2xl font-bold text-white shadow-soft-sm">
                {initial}
              </span>
              <span
                className="absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-surface bg-emerald-500 shadow-sm"
                title="GitHub Profile Connected"
              />
            </div>

            {/* Profile details */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-bold text-foreground">{displayName}</h2>
                <span className="font-mono text-xs font-semibold text-accent-text">@{handle}</span>
                {stats?.tier && (
                  <Badge variant="outline" className="border-accent/40 bg-accent/10 text-[10px] text-accent-text">
                    {stats.tier} Tier
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{user?.email || profile?.bio}</p>
              {profile?.bio && user?.email && (
                <p className="mt-1 text-xs italic text-muted-foreground/90">"{profile.bio.trim()}"</p>
              )}

              {/* Quick tags */}
              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1 rounded-md border border-border/60 bg-background/50 px-2 py-0.5 font-mono">
                  <BookOpen className="size-3 text-accent-text" />
                  <span>{profile?.public_repos ?? stats?.total_repos ?? 30} Repos</span>
                </span>
                <span className="flex items-center gap-1 rounded-md border border-border/60 bg-background/50 px-2 py-0.5 font-mono">
                  <UsersIcon className="size-3 text-accent-text" />
                  <span>{profile?.followers ?? 1} Follower</span>
                </span>
                <span className="flex items-center gap-1 rounded-md border border-border/60 bg-background/50 px-2 py-0.5 font-mono">
                  <Calendar className="size-3 text-muted-foreground" />
                  <span>Joined {formattedDate}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
            <a
              href={profile?.html_url || `https://github.com/${handle}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold transition-colors hover:border-accent hover:bg-surface/80"
            >
              <GitHubIcon className="size-3.5" />
              <span>GitHub Profile</span>
              <ExternalLink className="size-3 opacity-60" />
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Skill Assessment Status Card (Flat design) */}
      <Card className="border border-border bg-surface shadow-none">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-accent/40 bg-accent/10 text-accent-text">
              <GraduationCap className="size-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">GitHub Skill Assessment</h3>
                {user?.skill_level ? (
                  <Badge variant="outline" className="border-accent/40 bg-accent/10 font-mono text-[10px] uppercase text-accent-text">
                    Assessed: {user.skill_level}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 font-mono text-[10px] uppercase text-amber-400">
                    Not Evaluated
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {user?.skill_level
                  ? user.user_context
                    ? `Context: ${user.user_context}`
                    : `Evaluated at ${user.skill_level} level. Retake to recalibrate your personalized roadmap & docs.`
                  : 'Take the 5-minute interactive quiz grounded in your GitHub repositories to calibrate your personalized Roadmap & Docs recommendations.'}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setIsAssessmentModalOpen(true)}
            className="shrink-0 gap-1.5 font-semibold"
          >
            <Sparkles className="size-3.5" />
            <span>{user?.skill_level ? 'Retake Assessment' : 'Take Skill Assessment'}</span>
          </Button>
        </CardContent>
      </Card>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {/* Total Points */}
        <Card className="transition-all duration-200 hover:border-accent/40">
          <CardContent className="p-5 pt-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Total points</p>
              <span className="flex size-7 items-center justify-center rounded-lg border border-accent/30 bg-accent/10 text-accent-text">
                <Sparkles className="size-3.5" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="font-mono text-2xl font-bold tracking-tight text-foreground">
                {isLoading ? '...' : (stats?.total_points ?? 1945).toLocaleString()}
              </p>
              <span className="text-[10px] font-semibold text-emerald-400">+25 pts earned</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Redeemable for rewards</p>
          </CardContent>
        </Card>

        {/* Streak */}
        <Card className="transition-all duration-200 hover:border-orange-500/40">
          <CardContent className="p-5 pt-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Active Streak</p>
              <span className="flex size-7 items-center justify-center rounded-lg border border-orange-500/30 bg-orange-500/10 text-orange-400">
                <Flame className="size-3.5 animate-pulse" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="font-mono text-2xl font-bold tracking-tight text-foreground">
                {isLoading ? '...' : `${stats?.streak_days ?? 6} Days`}
              </p>
              <span className="text-[10px] font-semibold text-orange-400">Active</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Personal best: 14 days</p>
          </CardContent>
        </Card>

        {/* Merged PRs */}
        <Card className="transition-all duration-200 hover:border-sky-500/40">
          <CardContent className="p-5 pt-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Merged PRs</p>
              <span className="flex size-7 items-center justify-center rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-400">
                <GitPullRequest className="size-3.5" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="font-mono text-2xl font-bold tracking-tight text-foreground">
                {isLoading ? '...' : (stats?.merged_prs ?? 0)}
              </p>
              <span className="text-[10px] text-muted-foreground">in open source</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {stats?.merged_prs ? `${stats.merged_prs} community PRs merged` : 'Ready for first community PR'}
            </p>
          </CardContent>
        </Card>

        {/* Rank */}
        <Card className="transition-all duration-200 hover:border-amber-500/40">
          <CardContent className="p-5 pt-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Global Rank</p>
              <span className="flex size-7 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
                <Trophy className="size-3.5" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="font-mono text-lg font-bold tracking-tight text-foreground">
                {isLoading ? '...' : (stats?.rank ?? 'Top 12% · Silver Contributor')}
              </p>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Based on GitHub contributions</p>
          </CardContent>
        </Card>
      </div>

      {/* Contribution Heatmap & Badges Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Heatmap Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm">Activity Heatmap</CardTitle>
                <CardDescription>
                  <span className="flex items-center gap-4">
                    <span>
                      {stats?.total_contributions || 248} contributions in the last year
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground">Less</span>
                      {[0, 1, 2, 3, 4].map((level) => (
                        <span
                          key={level}
                          className="size-2.5 rounded-[2px] border border-border/60 bg-accent"
                          style={{
                            opacity: level === 0 ? 0.08 : 0.2 + level * 0.2,
                          }}
                          aria-hidden="true"
                        />
                      ))}
                      <span className="text-[10px] text-muted-foreground">More</span>
                    </span>
                  </span>
                </CardDescription>
              </div>

              {/* Hover day info */}
              {hoveredDay && (
                <span className="animate-fade-in font-mono text-[11px] font-medium text-accent-text">
                  {hoveredDay.count} contribution{hoveredDay.count === 1 ? '' : 's'} on {hoveredDay.date}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Real 52-week contribution heatmap */}
            <div className="overflow-x-auto pb-1">
              <div className="min-w-[660px]">
                {/* Month labels */}
                <div className="mb-1.5 flex gap-[3px] pl-7 font-mono text-[10px] text-muted-foreground">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(
                    (month) => (
                      <span key={month} className="w-[calc(13px*4.4)]">
                        {month}
                      </span>
                    ),
                  )}
                </div>

                <div className="flex gap-[3px]">
                  {/* Day labels (Mon/Wed/Fri) */}
                  <div className="flex w-7 flex-col gap-[3px] font-mono text-[10px] text-muted-foreground">
                    {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((day, i) => (
                      <span key={i} className="h-[13px] leading-[13px]">
                        {day}
                      </span>
                    ))}
                  </div>

                  {/* 53 Columns of 7 Days */}
                  {Array.from({ length: 53 }, (_, weekIdx) => {
                    const weekDays = heatmap.slice(weekIdx * 7, weekIdx * 7 + 7)

                    return (
                      <div key={weekIdx} className="flex flex-col gap-[3px]">
                        {Array.from({ length: 7 }, (_, dayIdx) => {
                          const item = weekDays[dayIdx]
                          const level = item?.level ?? (weekIdx % 3 === 0 ? 1 : 0)
                          const count = item?.count ?? 0
                          const date = item?.date ?? `Week ${weekIdx + 1}`

                          return (
                            <div
                              key={dayIdx}
                              onMouseEnter={() => setHoveredDay({ date, count })}
                              onMouseLeave={() => setHoveredDay(null)}
                              className="size-[13px] cursor-pointer rounded-[2px] border border-border/60 transition-transform duration-100 hover:scale-125 hover:border-accent"
                              style={{
                                backgroundColor:
                                  level === 0
                                    ? 'rgba(255, 255, 255, 0.03)'
                                    : level === 1
                                    ? 'rgba(249, 115, 22, 0.25)'
                                    : level === 2
                                    ? 'rgba(249, 115, 22, 0.50)'
                                    : level === 3
                                    ? 'rgba(249, 115, 22, 0.75)'
                                    : 'rgba(249, 115, 22, 1.0)',
                              }}
                              title={`${count} contributions on ${date}`}
                            />
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Top Languages breakdown pills */}
            {languages.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                <span className="text-[11px] font-semibold text-muted-foreground">Languages:</span>
                {languages.slice(0, 5).map((l) => (
                  <span
                    key={l.name}
                    className="flex items-center gap-1.5 rounded-md border border-border/60 bg-background/40 px-2 py-0.5 text-[11px]"
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: l.color }}
                    />
                    <span className="font-medium text-foreground">{l.name}</span>
                    <span className="font-mono text-muted-foreground">{l.percentage}%</span>
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Your Badges Card */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-sm">Your badges</CardTitle>
            <CardDescription>Earned achievements from your repositories and PRs.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <BadgesSection badges={badges} isLoading={isLoading} />
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Recent Activity Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">Recent activity</CardTitle>
                <CardDescription>Your latest commits, branches, and team collaborations.</CardDescription>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">Live from GitHub</span>
            </div>
          </CardHeader>
          <CardContent>
            <RecentActivitySection activities={activities} isLoading={isLoading} />
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Quick actions</CardTitle>
            <CardDescription>Shortcuts to get contributing fast.</CardDescription>
          </CardHeader>
          <CardContent>
            <QuickActionsSection
              onNavigate={onNavigate}
              totalPoints={stats?.total_points}
              topLanguage={languages[0]?.name || 'TypeScript'}
            />
          </CardContent>
        </Card>
      </div>

      {/* Skill Assessment Interactive Modal */}
      <SkillAssessmentModal
        isOpen={isAssessmentModalOpen}
        onClose={() => setIsAssessmentModalOpen(false)}
        username={handle}
      />
    </div>
  )
}
