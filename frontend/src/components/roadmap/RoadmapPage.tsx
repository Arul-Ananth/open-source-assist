import { useState, useCallback, useEffect, useRef } from 'react'
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
import { syncPersonalizedRoadmap, recordStepProgress } from '@/lib/roadmap-api'
import type { GitHubUser, SkillAssessment, RoadmapMilestone, RecommendedProject } from '@/types/github'

interface RoadmapData {
  user: GitHubUser
  topLanguages: string[]
  totalStars: number
  skills: SkillAssessment[]
  milestones: RoadmapMilestone[]
  projects: RecommendedProject[]
  isLiveAi?: boolean
  skillLevel?: string
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

        // Step 1: Fetch Profile & Repository Metrics through backend proxy (using server GITHUB_TOKEN & cache)
        const profileRes = await fetch(`/api/v1/github/user-profile/${encodeURIComponent(username)}`)

        if (profileRes.status === 403 || profileRes.status === 429) {
          setRateLimited(true)
          setErrorMessage('GitHub API rate limit reached. Please try again shortly.')
          setIsLoading(false)
          return
        }

        if (profileRes.status === 404) {
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
        } else if (!profileRes.ok) {
          setErrorMessage(`GitHub profile fetch failed (${profileRes.status}). Please try again.`)
          setIsLoading(false)
          return
        } else {
          const profileData = await profileRes.json()
          const p = profileData.profile || {}
          ghUser = {
            login: p.username || username,
            avatar_url:
              currentUser?.avatar_url ||
              p.avatar_url ||
              `https://api.dicebear.com/7.x/identicon/svg?seed=${username}`,
            name: p.name || currentUser?.username || username,
            bio: p.bio || 'Open source developer.',
            public_repos: p.public_repos ?? 0,
            followers: p.followers ?? 0,
            following: p.following ?? 0,
            created_at: p.created_at || new Date().toISOString(),
            html_url: p.html_url || `https://github.com/${username}`,
          }

          const rawLangs = Array.isArray(profileData.languages) ? profileData.languages : []
          topLangs = rawLangs.map((l: { name: string }) => l.name)

          const rawRepos = Array.isArray(profileData.top_repos) ? profileData.top_repos : []
          totalStars = rawRepos.reduce((acc: number, r: { stars?: number }) => acc + (r.stars || 0), 0)

          const rawTier = currentUser?.skill_level?.toLowerCase()
          const assessedTier: 'beginner' | 'intermediate' | 'advanced' | 'expert' =
            rawTier === 'advanced' || rawTier === 'expert'
              ? 'advanced'
              : rawTier === 'beginner'
              ? 'beginner'
              : 'intermediate'

          if (rawLangs.length > 0) {
            skills = rawLangs.slice(0, 6).map((l: { name: string; percentage: number; count: number; color?: string }) => {
              const level: 'beginner' | 'intermediate' | 'advanced' | 'expert' =
                l.percentage > 40 ? 'advanced' : l.percentage > 20 ? 'intermediate' : 'beginner'
              return {
                language: l.name,
                level,
                score: Math.min(100, Math.max(30, Math.round(l.percentage) + (l.count > 5 ? 30 : 15))),
                repos: l.count,
                color: l.color || '#a855f7',
              }
            })
          } else {
            if (topLangs.length === 0) {
              topLangs = ['TypeScript', 'Python', 'JavaScript']
            }
            skills = [
              {
                language: topLangs[0] || 'TypeScript',
                level: assessedTier,
                score: assessedTier === 'advanced' ? 88 : assessedTier === 'intermediate' ? 70 : 45,
                repos: 2,
                color: '#3178c6',
              },
              {
                language: topLangs[1] || 'Python',
                level: assessedTier === 'advanced' ? 'intermediate' : 'beginner',
                score: 60,
                repos: 2,
                color: '#3572A5',
              },
            ]
          }
        }

        const primaryLang = topLangs[0] || 'TypeScript'
        const currentSkill = useAuthStore.getState().user?.skill_level || currentUser?.skill_level
        const dominantSkill =
          currentSkill ||
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
                status: idx === 0 ? 'current' : 'upcoming',
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
              status: 'current',
              skills: ['Git', primaryLang, 'Testing'],
              estimatedWeeks: 1,
            },
            {
              id: 2,
              title: `Tackle Your First Good-First-Issue`,
              description: `Navigate repo structure, adhere to contributing guidelines, and open an atomic PR.`,
              status: 'upcoming',
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

        // Step 3b: Synchronize personalized roadmap & milestones into PostgreSQL database
        // and hydrate persisted step completion records for authenticated user
        try {
          const syncRes = await syncPersonalizedRoadmap({
            userId: currentUser?.id,
            language: primaryLang,
            skillLevel: dominantSkill,
            steps: milestones.map((m) => ({
              day_number: m.id,
              title: m.title,
              description: m.description,
              expected_duration_hours: m.estimatedWeeks * 10,
              step_order: m.id,
            })),
          })

          if (syncRes && Array.isArray(syncRes.steps) && syncRes.steps.length > 0) {
            milestones = milestones.map((m, idx) => {
              const dbStep =
                syncRes.steps[idx] ||
                syncRes.steps.find((s) => s.step_order === m.id || s.title === m.title)
              const isCompleted = dbStep ? dbStep.completed : false
              return {
                ...m,
                dbStepId: dbStep ? dbStep.id : undefined,
                dbRoadmapId: syncRes.roadmap_id,
                status: isCompleted ? ('completed' as const) : m.status,
              }
            })

            // Recalibrate active milestone if some were completed in DB
            let foundCurrent = false
            milestones = milestones.map((m) => {
              if (m.status === 'completed') return m
              if (!foundCurrent) {
                foundCurrent = true
                return { ...m, status: 'current' as const }
              }
              return { ...m, status: 'upcoming' as const }
            })
          }
        } catch {
          // Gracefully continue with client-side state
        }

        // Apply saved localStorage progress if previously advanced for this tier (offline fallback / merge)
        const progressKey = `roadmap_milestones_${username}_${dominantSkill}`
        const savedProgress = localStorage.getItem(progressKey)
        if (savedProgress) {
          try {
            const savedStatuses: Record<number, RoadmapMilestone['status']> = JSON.parse(savedProgress)
            milestones = milestones.map((m) =>
              m.status === 'completed'
                ? m
                : savedStatuses[m.id]
                ? { ...m, status: savedStatuses[m.id] }
                : m,
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
          skillLevel: dominantSkill,
        })
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : 'Failed to analyze profile')
      } finally {
        setIsLoading(false)
      }
    },
    [currentUser],
  )

  // Guard auto-hydration to avoid infinite re-fetch loops on failure or rate-limit
  const hasFetchedRef = useRef(false)

  // Auto-hydrate roadmap for authenticated user on initial mount
  useEffect(() => {
    if (!data && !isLoading && !errorMessage && !rateLimited && defaultUsername && !hasFetchedRef.current) {
      hasFetchedRef.current = true
      void handleAnalyze(defaultUsername)
    }
  }, [defaultUsername, handleAnalyze, data, isLoading, errorMessage, rateLimited])

  // Automatically recalibrate roadmap when the user completes/retakes an assessment and skill_level updates
  const lastSkillLevelRef = useRef(currentUser?.skill_level)
  useEffect(() => {
    if (defaultUsername && currentUser?.skill_level && currentUser.skill_level !== lastSkillLevelRef.current) {
      lastSkillLevelRef.current = currentUser.skill_level
      hasFetchedRef.current = true
      void handleAnalyze(defaultUsername)
    }
  }, [currentUser?.skill_level, defaultUsername, handleAnalyze])

  // Milestone Progression Handlers
  const handleAdvanceMilestone = (milestoneId: number) => {
    if (!data) return
    const targetMilestone = data.milestones.find((m) => m.id === milestoneId)
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

    // Save to localStorage scoped by user and tier
    const saved = updated.reduce<Record<number, RoadmapMilestone['status']>>((acc, m) => {
      acc[m.id] = m.status
      return acc
    }, {})
    if (analyzedUser) {
      const skillKey = data.skillLevel || currentUser?.skill_level || 'starter'
      localStorage.setItem(`roadmap_milestones_${analyzedUser}_${skillKey}`, JSON.stringify(saved))
    }

    // Persist progress to backend PostgreSQL if user is authenticated and roadmap IDs are present
    if (currentUser?.id && targetMilestone?.dbRoadmapId && targetMilestone?.dbStepId) {
      void recordStepProgress({
        userId: currentUser.id,
        roadmapId: targetMilestone.dbRoadmapId,
        stepId: targetMilestone.dbStepId,
        completed: true,
      })
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
      const skillKey = data.skillLevel || currentUser?.skill_level || 'starter'
      localStorage.setItem(`roadmap_milestones_${analyzedUser}_${skillKey}`, JSON.stringify(saved))
    }

    if (currentUser?.id) {
      updated.forEach((m) => {
        if (m.dbRoadmapId && m.dbStepId) {
          void recordStepProgress({
            userId: currentUser.id!,
            roadmapId: m.dbRoadmapId,
            stepId: m.dbStepId,
            completed: m.status === 'completed',
          })
        }
      })
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
              onClick={() => {
                hasFetchedRef.current = false
                void handleAnalyze(defaultUsername)
              }}
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

      {/* Skill Assessment Recommendation Banner (only shown while in progress) */}
      {!currentUser?.skill_level && totalCount > 0 && completedCount < totalCount && (
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
              onClick={() => {
                hasFetchedRef.current = false
                void handleAnalyze(defaultUsername)
              }}
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
                        try {
                          Object.keys(localStorage).forEach((k) => {
                            if (k.startsWith(`roadmap_milestones_${analyzedUser}`)) {
                              localStorage.removeItem(k)
                            }
                          })
                        } catch {
                          /* ignore */
                        }
                        if (currentUser?.id && data?.milestones) {
                          data.milestones.forEach((m) => {
                            if (m.dbRoadmapId && m.dbStepId) {
                              void recordStepProgress({
                                userId: currentUser.id!,
                                roadmapId: m.dbRoadmapId,
                                stepId: m.dbStepId,
                                completed: false,
                              })
                            }
                          })
                        }
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
        onCompleted={() => {
          if (defaultUsername) {
            void handleAnalyze(defaultUsername)
          }
        }}
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
