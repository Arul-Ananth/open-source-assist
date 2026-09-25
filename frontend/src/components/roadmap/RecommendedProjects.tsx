import { Star, GitFork, ExternalLink, Sparkles, CircleDot } from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Button,
} from '@/components/ui'
import type { RecommendedProject } from '@/types/github'

interface RecommendedProjectsProps {
  projects: RecommendedProject[]
}

const difficultyConfig: Record<string, { badge: 'success' | 'warning' | 'accent'; label: string }> = {
  'good-first-issue': { badge: 'success', label: 'Good First Issue' },
  intermediate: { badge: 'warning', label: 'Intermediate' },
  advanced: { badge: 'accent', label: 'Advanced' },
}

export function RecommendedProjects({ projects }: RecommendedProjectsProps) {
  return (
    <section aria-labelledby="projects-heading">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={20} className="text-accent" aria-hidden="true" />
        <h2 id="projects-heading" className="text-lg font-semibold text-primary-text">
          Recommended Projects
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map((project) => {
          const difficulty = difficultyConfig[project.difficulty]
          return (
            <Card key={project.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="font-mono text-sm truncate">
                      {project.fullName}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {project.description}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <div
                      className="w-8 h-8 rounded-sm bg-accent/15 border border-accent/30 flex items-center justify-center"
                      title={`${project.matchScore}% match`}
                    >
                      <span className="text-xs font-mono font-bold text-accent">
                        {project.matchScore}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pb-3">
                <div className="flex items-center gap-3 text-xs text-secondary-text">
                  <span className="flex items-center gap-1">
                    <Star size={12} aria-hidden="true" />
                    <span className="font-mono text-primary-text">{project.stars.toLocaleString()}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <GitFork size={12} aria-hidden="true" />
                    <span className="font-mono text-primary-text">{project.forks.toLocaleString()}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <CircleDot size={12} aria-hidden="true" />
                    <span className="font-mono text-primary-text">{project.openIssues}</span>
                    <span>issues</span>
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <Badge variant="accent">{project.language}</Badge>
                  <Badge variant={difficulty.badge}>{difficulty.label}</Badge>
                  {project.topics.slice(0, 3).map((topic) => (
                    <Badge key={topic} variant="outline">{topic}</Badge>
                  ))}
                </div>
              </CardContent>

              <CardFooter>
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full"
                >
                  <Button variant="primary" size="sm" className="w-full">
                    Contribute
                    <ExternalLink size={14} aria-hidden="true" />
                  </Button>
                </a>
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
