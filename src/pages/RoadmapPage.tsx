import { useState, useCallback } from 'react'
import { Map, Target } from 'lucide-react'
import { GitHubProfileInput } from '@/components/GitHubProfileInput'
import { ProfileSummary } from '@/components/ProfileSummary'
import { SkillAssessmentPanel } from '@/components/SkillAssessment'
import { RoadmapTimeline } from '@/components/RoadmapTimeline'
import { RecommendedProjects } from '@/components/RecommendedProjects'
import { RoadmapSkeleton } from '@/components/RoadmapSkeleton'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Badge } from '@/components/ui/Badge'
import {
  mockUser,
  mockTopLanguages,
  mockTotalStars,
  mockSkills,
  mockMilestones,
  mockProjects,
} from '@/lib/mockData'
import type { GitHubUser, SkillAssessment, RoadmapMilestone, RecommendedProject } from '@/types/github'

interface RoadmapData {
  user: GitHubUser
  topLanguages: string[]
  totalStars: number
  skills: SkillAssessment[]
  milestones: RoadmapMilestone[]
  projects: RecommendedProject[]
}

export function RoadmapPage() {
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
    }, 2000)
  }, [])

  const completedCount = data?.milestones.filter((m) => m.status === 'completed').length ?? 0
  const totalCount = data?.milestones.length ?? 0

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-accent flex items-center justify-center">
              <Map size={18} className="text-white" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-primary-text leading-tight">
                OS GitHub Assistant
              </h1>
              <p className="text-xs text-secondary-text">Your open-source contribution roadmap</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero Section */}
        <section className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Target size={24} className="text-accent" aria-hidden="true" />
            <Badge variant="accent">AI-Powered Roadmap</Badge>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-primary-text mb-2">
            Discover Your Open Source Path
          </h2>
          <p className="text-secondary-text max-w-lg mx-auto text-sm mb-6">
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
            <Map size={48} className="mx-auto text-secondary-text/40 mb-4" aria-hidden="true" />
            <p className="text-secondary-text text-sm">
              Enter a GitHub username above to generate your personalized roadmap
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between text-xs text-secondary-text">
          <span>OS GitHub Assistant</span>
          <span className="font-mono">v1.0.0</span>
        </div>
      </footer>
    </div>
  )
}
