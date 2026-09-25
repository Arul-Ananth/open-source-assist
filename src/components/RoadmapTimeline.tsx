import { CheckCircle2, Circle, Lock, ArrowRight, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { RoadmapMilestone } from '@/types/github'

interface RoadmapTimelineProps {
  milestones: RoadmapMilestone[]
}

const statusConfig: Record<string, {
  icon: React.ReactNode
  lineColor: string
  dotBg: string
  textClass: string
}> = {
  completed: {
    icon: <CheckCircle2 size={20} className="text-emerald-400" aria-hidden="true" />,
    lineColor: 'bg-emerald-400/40',
    dotBg: 'bg-emerald-400 border-emerald-400/30',
    textClass: 'text-secondary-text line-through',
  },
  current: {
    icon: <Circle size={20} className="text-accent animate-pulse" aria-hidden="true" />,
    lineColor: 'bg-accent/40',
    dotBg: 'bg-accent border-accent/30',
    textClass: 'text-primary-text font-semibold',
  },
  upcoming: {
    icon: <Circle size={20} className="text-secondary-text" aria-hidden="true" />,
    lineColor: 'bg-border',
    dotBg: 'bg-surface border-border',
    textClass: 'text-secondary-text',
  },
  locked: {
    icon: <Lock size={20} className="text-secondary-text/50" aria-hidden="true" />,
    lineColor: 'bg-border/50',
    dotBg: 'bg-surface border-border/50',
    textClass: 'text-secondary-text/50',
  },
}

export function RoadmapTimeline({ milestones }: RoadmapTimelineProps) {
  return (
    <section aria-labelledby="roadmap-heading">
      <div className="flex items-center gap-2 mb-6">
        <ArrowRight size={20} className="text-accent" aria-hidden="true" />
        <h2 id="roadmap-heading" className="text-lg font-semibold text-primary-text">
          Your Contribution Roadmap
        </h2>
      </div>

      <div className="relative">
        {milestones.map((milestone, index) => {
          const config = statusConfig[milestone.status]
          const isLast = index === milestones.length - 1

          return (
            <div key={milestone.id} className="relative flex gap-4 pb-8 last:pb-0">
              {/* Vertical line */}
              {!isLast && (
                <div
                  className={`absolute left-[19px] top-[32px] w-[2px] bottom-0 ${config.lineColor}`}
                  aria-hidden="true"
                />
              )}

              {/* Status dot */}
              <div className="relative z-10 flex-shrink-0 mt-0.5">
                <div className={`w-10 h-10 rounded-md border-2 flex items-center justify-center ${config.dotBg}`}>
                  {config.icon}
                </div>
              </div>

              {/* Content */}
              <div
                className={`flex-1 rounded-md border border-border bg-surface p-4 shadow-none transition-shadow duration-150
                  ${milestone.status === 'current' ? 'border-accent/40 hover:shadow-[4px_4px_0px_0px_rgba(var(--accent-rgb),0.5)]' : ''}
                  ${milestone.status === 'upcoming' ? 'hover:shadow-[4px_4px_0px_0px_rgba(var(--accent-rgb),0.3)]' : ''}
                  ${milestone.status === 'locked' ? 'opacity-60' : ''}
                `}
              >
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <h3 className={`text-sm ${config.textClass}`}>
                      {milestone.title}
                    </h3>
                    <p className="text-xs text-secondary-text mt-1">
                      {milestone.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-secondary-text">
                    <Clock size={12} aria-hidden="true" />
                    <span className="font-mono">{milestone.estimatedWeeks}w</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {milestone.skills.map((skill) => (
                    <Badge key={skill} variant="outline">
                      {skill}
                    </Badge>
                  ))}
                </div>

                {milestone.status === 'current' && (
                  <div className="mt-3">
                    <Button size="sm" variant="primary">
                      Start This Milestone
                      <ArrowRight size={14} aria-hidden="true" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
