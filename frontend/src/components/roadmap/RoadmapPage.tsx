import { useState, useCallback } from 'react'
import { Map, Target } from 'lucide-react'
import { GitHubProfileInput } from './GitHubProfileInput'
import { ProfileSummary } from './ProfileSummary'
import { SkillAssessmentPanel } from './SkillAssessment'
import { RoadmapTimeline } from './RoadmapTimeline'
import { RecommendedProjects } from './RecommendedProjects'
import { RoadmapSkeleton } from './RoadmapSkeleton'
import { Badge } from '@/components/ui'
import {
  mockUser,
  mockTopLanguages,
  mockTotalStars,
  mockSkills,
  mockMilestones,
  mockProjects,
} from '@/lib/mockRoadmapData'
import type { GitHubUser, SkillAssessment, RoadmapMilestone, RecommendedProject } from '@/types/github'

interface RoadmapData {
  user: GitHubUser
  topLanguages: string[]
  totalStars: number
  skills: SkillAssessment[]
  milestones: RoadmapMilestone[]
  projects: RecommendedProject[]
}

export function RoadmapPage({ embedded = false }: { embedded?: boolean } = {}) {
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<RoadmapData | null>(null)
  const [analyzedUser, setAnalyzedUser] = useState<string | null>(null)

  const handleAnalyze = useCallback((username: string) => {
    setIsLoading(true)
    setAnalyzedUser(username)

    setTimeout(() => {
      setData({
        user: { ...mockUser, login: username, name: username },
        topLanguages: mockTopLanguages,
        totalStars: mockTotalStars,
        skills: mockSkills,
        milestones: mockMilestones,
        projects: mockProjects,
      })
      setIsLoading(false)
    }, 1200)
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
        <p className="text-muted-foreground max-w-lg mx-auto text-sm mb-6">
          Enter your GitHub username to get a personalized roadmap based on your skills,
          contributions, and interests.
        </p>
        <GitHubProfileInput onSubmit={handleAnalyze} isLoading={isLoading} />
      </section>

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
                  <p className="text-sm font-medium text-primary-text">
                    Roadmap for <span className="font-mono text-accent">@{analyzedUser}</span>
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
        {!data && !isLoading && (
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
