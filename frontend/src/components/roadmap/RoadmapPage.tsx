import { useState, useCallback, useEffect } from 'react'
import {
  Map,
  Target,
  TriangleAlert,
  Sparkles,
  AlertCircle,
  GraduationCap,
  Search,
  UserCheck,
  RotateCcw,
  Award,
} from 'lucide-react'
import { GitHubProfileInput } from './GitHubProfileInput'
import { ProfileSummary } from './ProfileSummary'
import { SkillAssessmentPanel } from './SkillAssessment'
import { RoadmapTimeline } from './RoadmapTimeline'
import { RecommendedProjects } from './RecommendedProjects'
import { RoadmapSkeleton } from './RoadmapSkeleton'
import { SkillAssessmentModal } from './SkillAssessmentModal'
import { Button } from '@/components/ui'
import { useAuthStore } from '@/lib/auth-store'
import type { GitHubUser, SkillAssessment, RoadmapMilestone, RecommendedProject } from '@/types/github'

interface RoadmapData {
  user: GitHubUser
  topLanguages: string[]
  totalStars: number
  skills: SkillAssessment[]
  milestones: RoadmapMilestone[]
  projects: RecommendedProject[]
  isLiveAi?: boolean
}

export function RoadmapPage({ embedded = false }: { embedded?: boolean } = {}) {
  const currentUser = useAuthStore((s) => s.user)
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<RoadmapData | null>(null)
  const [analyzedUser, setAnalyzedUser] = useState<string | null>(null)
  const [rateLimited, setRateLimited] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showProfileSearch, setShowProfileSearch] = useState(false)
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false)

  const defaultUsername = currentUser?.github_username || currentUser?.username

  const handleAnalyze = useCallback(
    async (username: string) => {
      setIsLoading(true)
      setAnalyzedUser(username)
      setRateLimited(false)
      setErrorMessage(null)

      try {
        let ghUser: GitHubUser
        let topLangs: string[] = []
        let totalStars = 0
        let skills: SkillAssessment[] = []

        // Step 1: Fetch Public GitHub Profile
        const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
          headers: { Accept: 'application/vnd.github+json' },
        })

        if (userRes.status === 403 || userRes.status === 429) {
          setRateLimited(true)
          setErrorMessage('GitHub API rate limit reached (60 unauthenticated requests/hr per IP).')
          setIsLoading(false)
          return
        }

        if (userRes.status === 404) {
          // If this is the current active local/demo user without a matching GitHub handle,
          // construct a resilient developer profile rather than terminating with an error.
          if (username === currentUser?.username || username === currentUser?.github_username) {
            ghUser = {
              login: username,
              avatar_url:
                currentUser?.avatar_url ||
                `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`,
              name: currentUser?.username || username,
              bio: 'Active developer charting an open-source contribution journey.',
              public_repos: 4,
              followers: 8,
              following: 12,
              created_at: new Date().toISOString(),
              html_url: `https://github.com`,
            }
            topLangs = ['TypeScript', 'Python', 'JavaScript']
            totalStars = 18
            const rawTier = currentUser?.skill_level?.toLowerCase()
            const assessedTier: 'beginner' | 'intermediate' | 'advanced' | 'expert' =
              rawTier === 'advanced' || rawTier === 'expert'
                ? 'advanced'
                : rawTier === 'beginner'
                ? 'beginner'
                : 'intermediate'
            skills = [
              {
                language: 'TypeScript',
                level: assessedTier,
                score: assessedTier === 'advanced' ? 88 : assessedTier === 'intermediate' ? 70 : 45,
                repos: 2,
                color: '#3178c6',
              },
              {
                language: 'Python',
                level: assessedTier === 'advanced' ? 'intermediate' : 'beginner',
                score: 60,
                repos: 2,
                color: '#3572A5',
              },
            ]
          } else {
            setErrorMessage(`GitHub user "@${username}" does not exist. Please check spelling.`)
            setIsLoading(false)
            return
          }
        } else if (!userRes.ok) {
          setErrorMessage(`GitHub API error (${userRes.status}). Please try again.`)
          setIsLoading(false)
          return
        } else {
          const u = await userRes.json()
          ghUser = {
            login: u.login,
            avatar_url: u.avatar_url,
            name: u.name || u.login,
            bio: u.bio || 'Open source developer.',
            public_repos: u.public_repos || 0,
            followers: u.followers || 0,
            following: u.following || 0,
            created_at: u.created_at,
            html_url: u.html_url,
          }

          // Step 2: Fetch Public Repositories to Compute Languages & Stars
          const reposRes = await fetch(
            `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=30`,
            { headers: { Accept: 'application/vnd.github+json' } },
          )

          if (reposRes.ok) {
            const repos = await reposRes.json()
            if (Array.isArray(repos) && repos.length > 0) {
              const langCounts: Record<string, number> = {}
              repos.forEach((r: any) => {
                totalStars += r.stargazers_count || 0
                if (r.language) {
                  langCounts[r.language] = (langCounts[r.language] || 0) + 1
                }
              })

              const sorted = Object.entries(langCounts).sort((a, b) => b[1] - a[1])
              topLangs = sorted.map(([lang]) => lang).slice(0, 5)

              const totalTaggedRepos = Object.values(langCounts).reduce((a, b) => a + b, 0) || 1
              skills = sorted.slice(0, 6).map(([lang, count]) => {
                const pct = Math.round((count / totalTaggedRepos) * 100)
                const level = pct > 40 ? 'advanced' : pct > 20 ? 'intermediate' : 'beginner'
                const colors: Record<string, string> = {
                  TypeScript: '#3178c6',
                  JavaScript: '#f7df1e',
                  Python: '#3572A5',
                  Rust: '#dea584',
                  Go: '#00add8',
                  HTML: '#e34c26',
                  CSS: '#563d7c',
                }
                return {
                  language: lang,
                  level,
                  score: Math.min(100, Math.max(30, pct + (count > 5 ? 30 : 15))),
                  repos: count,
                  color: colors[lang] || '#a855f7',
                }
              })
            }
          }
        }

        const primaryLang = topLangs[0] || 'TypeScript'
        const dominantSkill =
          currentUser?.skill_level ||
          (skills[0]?.level === 'expert' ? 'advanced' : skills[0]?.level) ||
          'intermediate'

        const topicTitle = `${primaryLang} Open Source Contribution`

        // Step 3: Query Live AI Learning Materials Agent on Backend
        let milestones: RoadmapMilestone[] = []
        let isLiveAi = false

        try {
          const aiRes = await fetch('/api/v1/learning/materials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              topic: topicTitle,
              skill_level: dominantSkill,
              user_context: `GitHub contributor @${username} (assessed level: ${dominantSkill}) with repos in ${topLangs.join(', ') || 'modern stacks'}`,
              limit: 4,
            }),
          })

          if (aiRes.ok) {
            const aiData = await aiRes.json()
            if (Array.isArray(aiData.modules) && aiData.modules.length > 0) {
              milestones = aiData.modules.map((mod: any, idx: number) => ({
                id: idx + 1,
                title: mod.title,
                description: mod.description,
                status: idx === 0 ? 'completed' : idx === 1 ? 'current' : 'upcoming',
                skills:
                  mod.key_takeaways && mod.key_takeaways.length > 0
                    ? mod.key_takeaways.slice(0, 3)
                    : [primaryLang, 'Collaboration'],
                estimatedWeeks: idx + 1,
              }))
              isLiveAi = true
            }
          }
        } catch {
          // Resilient foundational milestones fallback
          milestones = [
            {
              id: 1,
              title: `Set Up Local Tooling for ${primaryLang}`,
              description: `Configure runtime, fork target repositories, and verify build/test suites.`,
              status: 'completed',
              skills: ['Git', primaryLang, 'Testing'],
              estimatedWeeks: 1,
            },
            {
              id: 2,
              title: `Tackle Your First Good-First-Issue`,
              description: `Navigate repo structure, adhere to contributing guidelines, and open an atomic PR.`,
              status: 'current',
              skills: [primaryLang, 'Code Review', 'CI Checks'],
              estimatedWeeks: 2,
            },
            {
              id: 3,
              title: `Collaborate on Upstream Architecture`,
              description: `Participate in issue discussions, propose feature RFCs, and maintain code documentation.`,
              status: 'upcoming',
              skills: ['Architecture', 'Refactoring', 'Open Source'],
              estimatedWeeks: 3,
            },
          ]
        }

        // Apply saved localStorage progress if previously advanced
        const savedProgress = localStorage.getItem(`roadmap_milestones_${username}`)
        if (savedProgress) {
          try {
            const savedStatuses: Record<number, RoadmapMilestone['status']> = JSON.parse(savedProgress)
            milestones = milestones.map((m) =>
              savedStatuses[m.id] ? { ...m, status: savedStatuses[m.id] } : m,
            )
          } catch {
            /* ignore invalid json */
          }
        }

        // Step 4: Query Backend Search for Matching Recommended Repositories
        let projects: RecommendedProject[] = []
        try {
          const searchPayload: Record<string, unknown> = {
            query: `${primaryLang} beginner friendly open source library`,
            popularity_weight: 0.4,
            limit: 4,
          }
          if (primaryLang) {
            searchPayload.filters = { language: primaryLang }
          }

          const searchRes = await fetch('/api/v1/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(searchPayload),
          })

          if (searchRes.ok) {
            const searchData = await searchRes.json()
            if (Array.isArray(searchData.items) && searchData.items.length > 0) {
              projects = searchData.items.map((item: any, idx: number) => ({
                id: item.repo_id,
                name: item.full_name.split('/')[1] || item.full_name,
                fullName: item.full_name,
                description: item.description || `Recommended ${primaryLang} repository for contributions.`,
                stars: item.stars,
                forks: item.forks,
                language: item.language || primaryLang,
                difficulty: idx === 0 ? 'good-first-issue' : 'intermediate',
                openIssues: item.open_issues || 12,
                topics: item.topics || [primaryLang.toLowerCase(), 'open-source'],
                matchScore: Math.round((item.scores?.final_score ?? 0.85) * 100),
                url: item.html_url,
              }))
            }
          }
        } catch {
          // Projects remain empty or can be fetched later
        }

        setData({
          user: ghUser,
          topLanguages: topLangs,
          totalStars,
          skills,
          milestones,
          projects,
          isLiveAi,
        })
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : 'Failed to analyze profile')
      } finally {
        setIsLoading(false)
      }
    },
    [currentUser],
  )

  // Auto-hydrate roadmap for authenticated user on initial mount
  useEffect(() => {
    if (!data && !isLoading && defaultUsername) {
      void handleAnalyze(defaultUsername)
    }
  }, [defaultUsername, handleAnalyze, data, isLoading])

  // Milestone Progression Handlers
  const handleAdvanceMilestone = (milestoneId: number) => {
    if (!data) return
    const updated = data.milestones.map((m) => {
      if (m.id === milestoneId) {
        return { ...m, status: 'completed' as const }
      }
      if (m.id === milestoneId + 1 && m.status !== 'completed') {
        return { ...m, status: 'current' as const }
      }
      return m
    })
    setData({ ...data, milestones: updated })

    // Save to localStorage
    const saved = updated.reduce<Record<number, RoadmapMilestone['status']>>((acc, m) => {
      acc[m.id] = m.status
      return acc
    }, {})
    if (analyzedUser) {
      localStorage.setItem(`roadmap_milestones_${analyzedUser}`, JSON.stringify(saved))
    }
  }

  const handleSetCurrentMilestone = (milestoneId: number) => {
    if (!data) return
    const updated = data.milestones.map((m) => {
      if (m.id < milestoneId) return { ...m, status: 'completed' as const }
      if (m.id === milestoneId) return { ...m, status: 'current' as const }
      return { ...m, status: 'upcoming' as const }
    })
    setData({ ...data, milestones: updated })

    const saved = updated.reduce<Record<number, RoadmapMilestone['status']>>((acc, m) => {
      acc[m.id] = m.status
      return acc
    }, {})
    if (analyzedUser) {
      localStorage.setItem(`roadmap_milestones_${analyzedUser}`, JSON.stringify(saved))
    }
  }

  const completedCount = data?.milestones.filter((m) => m.status === 'completed').length ?? 0
  const totalCount = data?.milestones.length ?? 0
  const isViewingSelf = analyzedUser === defaultUsername

  const content = (
    <div className={embedded ? 'space-y-6' : 'max-w-5xl mx-auto px-4 sm:px-6 py-8'}>
      {/* Top Header & Personalization Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-md border border-border bg-surface p-4">
        <div>
          <div className="flex items-center gap-2">
            <Target size={18} className="text-accent" />
            <h1 className="text-base font-bold text-foreground">
              Personalized Contribution Roadmap
            </h1>
            {data?.isLiveAi && (
              <span className="inline-flex items-center gap-1 rounded-sm border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-semibold text-accent">
                <Sparkles size={11} /> AI Tailored
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {isViewingSelf
              ? `Tuned to your verified tech stack and ${currentUser?.skill_level ? `assessed level (${currentUser.skill_level})` : 'starter level'}.`
              : `Inspecting public open source roadmap for @${analyzedUser}.`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isViewingSelf && defaultUsername && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleAnalyze(defaultUsername)}
              className="gap-1.5 text-xs font-semibold"
            >
              <UserCheck size={14} />
              Back to My Roadmap
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowProfileSearch((v) => !v)}
            className="gap-1.5 text-xs"
          >
            <Search size={14} />
            {showProfileSearch ? 'Hide Search' : 'Inspect Profile'}
          </Button>
        </div>
      </div>

      {/* Collapsible Profile Inspector */}
      {showProfileSearch && (
        <div className="rounded-md border border-border bg-surface p-4 space-y-3">
          <div className="text-xs font-semibold text-foreground">
            Analyze any public GitHub profile:
          </div>
          <GitHubProfileInput onSubmit={handleAnalyze} isLoading={isLoading} />
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
            <span>Or try:</span>
            {['tiangolo', 'shadcn', 'torvalds'].map((uname) => (
              <button
                key={uname}
                type="button"
                disabled={isLoading}
                onClick={() => void handleAnalyze(uname)}
                className="rounded-sm border border-border bg-background px-2 py-0.5 font-mono text-[11px] text-accent hover:border-accent transition-colors"
              >
                @{uname}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Skill Assessment Recommendation Banner */}
      {!currentUser?.skill_level && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-md border border-accent/40 bg-accent/5 p-4">
          <div className="flex items-start sm:items-center gap-3">
            <GraduationCap className="size-5 shrink-0 text-accent mt-0.5 sm:mt-0" />
            <div>
              <p className="text-xs font-semibold text-foreground">
                Enhance your roadmap with the Skill Assessment Quiz
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Take the 5-minute quiz to calibrate milestones and project recommendations to your exact competency level.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setIsQuizModalOpen(true)}
            className="self-start sm:self-auto gap-1.5 text-xs font-semibold shrink-0"
          >
            <Sparkles className="size-3.5" />
            Take 5-min Quiz
          </Button>
        </div>
      )}

      {/* GitHub Rate Limit Warning Banner */}
      {rateLimited && (
        <div className="rounded-md border border-amber-600/40 bg-amber-950/20 p-3.5 text-xs text-amber-300 flex items-start gap-3">
          <TriangleAlert className="size-4 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-200">GitHub API Rate Limit Reached</p>
            <p className="text-amber-300/90 mt-0.5">
              Unauthenticated rate limit (60 requests/hr per IP) was reached. Try again shortly.
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && !rateLimited && (
        <div className="rounded-md border border-red-500/30 bg-red-950/20 p-3.5 text-xs text-red-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          {defaultUsername && (
            <button
              onClick={() => void handleAnalyze(defaultUsername)}
              className="flex items-center gap-1 font-mono text-xs hover:underline text-foreground"
            >
              <RotateCcw className="size-3" /> Retry My Profile
            </button>
          )}
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && <RoadmapSkeleton />}

      {/* Results View */}
      {data && !isLoading && (
        <div className="space-y-8">
          {/* Progress Banner */}
          <div className="rounded-md border border-border bg-surface px-5 py-3.5 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-sm bg-accent/15 border border-accent/30 flex items-center justify-center">
                <Target size={16} className="text-accent" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  Roadmap for <span className="font-mono text-accent">@{analyzedUser}</span>
                  {data.isLiveAi && (
                    <span className="inline-flex items-center gap-1 rounded-sm bg-accent/20 px-1.5 py-0.2 font-mono text-[10px] font-semibold text-accent">
                      <Sparkles className="size-3" /> Live Synthesized
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  {completedCount} of {totalCount} milestones completed
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-32 rounded-sm bg-background border border-border overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-300"
                  style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-accent">
                {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* Milestone Completion & Graduation Banner */}
          {totalCount > 0 && completedCount === totalCount && (
            <div className="rounded-md border border-emerald-500/40 bg-emerald-950/20 p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400">
                    <Award className="size-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      Roadmap Curriculum Completed! 🎉
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      You have mastered all milestones for this {currentUser?.skill_level || 'starter'} track.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => setIsQuizModalOpen(true)}
                    className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    <Sparkles className="size-3.5" />
                    Take Level-Up Assessment
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (analyzedUser) {
                        localStorage.removeItem(`roadmap_milestones_${analyzedUser}`)
                        void handleAnalyze(analyzedUser)
                      }
                    }}
                    className="gap-1 text-xs"
                  >
                    <RotateCcw className="size-3" />
                    Reset Progress
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-border/40 text-xs">
                <div className="rounded border border-border bg-background p-2.5">
                  <span className="text-[10px] uppercase font-mono text-muted-foreground">Contribution Status</span>
                  <p className="font-semibold text-emerald-400 mt-0.5">Ready for Upstream PRs</p>
                </div>
                <div className="rounded border border-border bg-background p-2.5">
                  <span className="text-[10px] uppercase font-mono text-muted-foreground">Badge Earned</span>
                  <p className="font-semibold text-foreground mt-0.5">Open Source Graduate 🏅</p>
                </div>
                <div className="rounded border border-border bg-background p-2.5">
                  <span className="text-[10px] uppercase font-mono text-muted-foreground">Next Milestone</span>
                  <p className="font-semibold text-accent mt-0.5">Advance to Next Tier</p>
                </div>
              </div>
            </div>
          )}

          {/* Profile Overview */}
          <ProfileSummary
            user={data.user}
            topLanguages={data.topLanguages}
            totalStars={data.totalStars}
          />

          {/* Skills Breakdown */}
          <SkillAssessmentPanel
            skills={data.skills}
            username={analyzedUser || data.user.login}
            userSkillLevel={currentUser?.skill_level}
          />

          {/* Sequential Milestone Timeline */}
          <RoadmapTimeline
            milestones={data.milestones}
            onAdvanceMilestone={handleAdvanceMilestone}
            onSetCurrentMilestone={handleSetCurrentMilestone}
          />

          {/* Tailored Recommended Repositories */}
          <RecommendedProjects projects={data.projects} />
        </div>
      )}

      {/* Empty Fallback State */}
      {!data && !isLoading && !errorMessage && (
        <div className="text-center py-16 border border-border border-dashed rounded-md bg-surface">
          <Map size={48} className="mx-auto text-muted-foreground mb-4" aria-hidden="true" />
          <p className="text-foreground text-sm font-semibold">
            Ready to chart your roadmap
          </p>
          <p className="text-muted-foreground text-xs mt-1">
            Search a GitHub username above or take the Skill Assessment quiz to generate your milestones.
          </p>
        </div>
      )}

      {/* Embedded Skill Assessment Quiz Modal */}
      <SkillAssessmentModal
        isOpen={isQuizModalOpen}
        onClose={() => setIsQuizModalOpen(false)}
        username={defaultUsername}
      />
    </div>
  )

  if (embedded) {
    return <div className="space-y-6">{content}</div>
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">{content}</main>
    </div>
  )
}

export default RoadmapPage
