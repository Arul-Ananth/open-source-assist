import { useState, useCallback } from 'react'
import { Map, Target, TriangleAlert, Sparkles, AlertCircle } from 'lucide-react'
import { GitHubProfileInput } from './GitHubProfileInput'
import { ProfileSummary } from './ProfileSummary'
import { SkillAssessmentPanel } from './SkillAssessment'
import { RoadmapTimeline } from './RoadmapTimeline'
import { RecommendedProjects } from './RecommendedProjects'
import { RoadmapSkeleton } from './RoadmapSkeleton'
import { Badge } from '@/components/ui'
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
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<RoadmapData | null>(null)
  const [analyzedUser, setAnalyzedUser] = useState<string | null>(null)
  const [rateLimited, setRateLimited] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleAnalyze = useCallback(async (username: string) => {
    setIsLoading(true)
    setAnalyzedUser(username)
    setRateLimited(false)
    setErrorMessage(null)
    setData(null)

    try {
      // Step 1: Fetch Real Public GitHub Profile
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
        setErrorMessage(`GitHub user "@${username}" does not exist. Please check the spelling.`)
        setIsLoading(false)
        return
      }

      if (!userRes.ok) {
        setErrorMessage(`GitHub API error (${userRes.status}). Please try again.`)
        setIsLoading(false)
        return
      }

      const u = await userRes.json()
      const ghUser: GitHubUser = {
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

      // Step 2: Fetch Public Repositories to Compute Real Languages and Stars
      const reposRes = await fetch(
        `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=30`,
        { headers: { Accept: 'application/vnd.github+json' } },
      )

      if (reposRes.status === 403 || reposRes.status === 429) {
        setRateLimited(true)
        setErrorMessage('GitHub API rate limit reached while fetching repository activity.')
        setIsLoading(false)
        return
      }

      let topLangs: string[] = []
      let totalStars = 0
      let skills: SkillAssessment[] = []

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

      if (skills.length === 0) {
        // Handle new users or users without public language tags
        topLangs = []
        skills = []
      }

      const primaryLang = topLangs[0] || ''
      const dominantSkill = skills[0]?.level || 'beginner'
      const topicTitle = primaryLang ? `${primaryLang} Open Source Contribution` : 'Open Source Contribution'

      // Step 3: Query Live AI Learning Materials Agent on the Backend
      let milestones: RoadmapMilestone[] = []
      let isLiveAi = false

      try {
        const aiRes = await fetch('/api/v1/learning/materials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: topicTitle,
            skill_level: dominantSkill,
            user_context: `GitHub contributor @${username}${topLangs.length > 0 ? ` with repositories in ${topLangs.join(', ')}` : ''}`,
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
                  : [primaryLang || 'Git', 'Collaboration'],
              estimatedWeeks: idx + 1,
            }))
            isLiveAi = true
          }
        }
      } catch {
        // If AI backend is offline, create structured foundational milestones
        const langLabel = primaryLang || 'Open Source'
        milestones = [
          {
            id: 1,
            title: `Set Up Local Development for ${langLabel}`,
            description: `Fork and clone repositories, configure local ${langLabel} runtime, and run test suites.`,
            status: 'completed',
            skills: ['Git', langLabel, 'Environment Setup'],
            estimatedWeeks: 1,
          },
          {
            id: 2,
            title: `Solve Your First ${langLabel} Issue`,
            description: `Search for good-first-issue labels, understand the codebase architecture, and prepare a clean PR.`,
            status: 'current',
            skills: [langLabel, 'Code Review', 'Testing'],
            estimatedWeeks: 2,
          },
          {
            id: 3,
            title: `Participate in ${langLabel} Community Review`,
            description: `Contribute core features, review incoming pull requests, and maintain upstream documentation.`,
            status: 'upcoming',
            skills: ['Architecture', 'CI/CD', 'Documentation'],
            estimatedWeeks: 3,
          },
        ]
      }

      // Step 4: Query Backend Search for Matching Recommended Projects
      let projects: RecommendedProject[] = []
      try {
        const searchPayload: Record<string, unknown> = {
          query: primaryLang ? `${primaryLang} beginner friendly open source library` : 'beginner friendly open source library',
          popularity_weight: 0.4,
          limit: 3,
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
              description: item.description || `Recommended ${primaryLang || 'open-source'} project.`,
              stars: item.stars,
              forks: item.forks,
              language: item.language || primaryLang || 'Code',
              difficulty: idx === 0 ? 'good-first-issue' : 'intermediate',
              openIssues: item.open_issues || 10,
              topics: item.topics || (primaryLang ? [primaryLang.toLowerCase()] : ['open-source']),
              matchScore: Math.round(((item.scores?.final_score ?? 0.85) * 100)),
              url: item.html_url,
            }))
          }
        }
      } catch {
        // Leave projects empty or filled with fallback
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
  }, [])

  const completedCount = data?.milestones.filter((m) => m.status === 'completed').length ?? 0
  const totalCount = data?.milestones.length ?? 0

  const content = (
    <div className={embedded ? 'space-y-8' : 'max-w-5xl mx-auto px-4 sm:px-6 py-8'}>
      {/* Hero Section */}
      <section className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Target size={20} className="text-accent-text" aria-hidden="true" />
          <Badge variant="accent">AI-Powered Roadmap</Badge>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
          Discover Your Open Source Path
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto text-sm mb-4">
          Enter your GitHub username to generate a real-time roadmap based on your public repositories,
          languages, and contributions.
        </p>
        <GitHubProfileInput onSubmit={handleAnalyze} isLoading={isLoading} />

        {/* Quick Demo Suggestions */}
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>Try real profiles:</span>
          {['tiangolo', 'shadcn', 'torvalds'].map((uname) => (
            <button
              key={uname}
              type="button"
              disabled={isLoading}
              onClick={() => handleAnalyze(uname)}
              className="rounded border border-border bg-surface px-2 py-0.5 font-mono text-[11px] text-accent-text hover:border-accent transition-colors"
            >
              @{uname}
            </button>
          ))}
        </div>
      </section>

      {/* GitHub Rate Limit Warning Banner */}
      {rateLimited && (
        <div className="animate-fade-in mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-300 flex items-start gap-3">
          <TriangleAlert className="size-4 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-200">GitHub API Rate Limit Reached</p>
            <p className="text-amber-300/90 mt-0.5">
              Unauthenticated rate limit (60 requests/hr per IP) was exceeded. Please wait a short while or try again later.
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && !rateLimited && (
        <div className="animate-fade-in mb-6 rounded-lg border border-accent/40 bg-accent/10 p-3.5 text-xs text-accent-text flex items-center gap-3">
          <AlertCircle className="size-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading && <RoadmapSkeleton />}

      {/* Results */}
      {data && !isLoading && (
        <div className="space-y-10">
          {/* Progress banner */}
          <div className="rounded-md border border-accent/30 bg-accent/5 px-5 py-3 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-sm bg-accent/15 flex items-center justify-center">
                <Target size={16} className="text-accent" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary-text flex items-center gap-2">
                  Roadmap for <span className="font-mono text-accent">@{analyzedUser}</span>
                  {data.isLiveAi && (
                    <span className="inline-flex items-center gap-1 rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold text-accent-text">
                      <Sparkles className="size-3" /> Live AI Generated
                    </span>
                  )}
                </p>
                <p className="text-xs text-secondary-text">
                  {completedCount} of {totalCount} milestones completed
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-32 rounded-sm bg-background border border-border overflow-hidden">
                <div
                  className="h-full rounded-sm bg-accent transition-all duration-500"
                  style={{ width: `${(completedCount / totalCount) * 100}%` }}
                />
              </div>
              <span className="text-xs font-mono text-accent">
                {Math.round((completedCount / totalCount) * 100)}%
              </span>
            </div>
          </div>

          {/* Profile */}
          <ProfileSummary
            user={data.user}
            topLanguages={data.topLanguages}
            totalStars={data.totalStars}
          />

          {/* Skills */}
          <SkillAssessmentPanel skills={data.skills} />

          {/* Timeline */}
          <RoadmapTimeline milestones={data.milestones} />

          {/* Projects */}
          <RecommendedProjects projects={data.projects} />
        </div>
      )}

      {/* Empty state */}
      {!data && !isLoading && !errorMessage && (
        <div className="text-center py-16 border border-border border-dashed rounded-md bg-surface/50">
          <Map size={48} className="mx-auto text-muted-foreground/40 mb-4" aria-hidden="true" />
          <p className="text-muted-foreground text-sm">
            Enter a GitHub username above to generate your personalized roadmap
          </p>
        </div>
      )}
    </div>
  )

  if (embedded) {
    return <div className="animate-fade-up">{content}</div>
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {content}
      </main>
    </div>
  )
}

export default RoadmapPage
