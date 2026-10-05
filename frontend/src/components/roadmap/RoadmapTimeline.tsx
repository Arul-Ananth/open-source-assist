import { CheckCircle2, Circle, Lock, ArrowRight, Clock, Check } from 'lucide-react'
import { Badge, Button } from '@/components/ui'
import type { RoadmapMilestone } from '@/types/github'

interface RoadmapTimelineProps {
  milestones: RoadmapMilestone[]
  onAdvanceMilestone?: (milestoneId: number) => void
  onSetCurrentMilestone?: (milestoneId: number) => void
}

const statusConfig: Record<string, {
  icon: React.ReactNode
  lineColor: string
  dotBg: string
  textClass: string
}> = {
  completed: {
    icon: <CheckCircle2 size={18} className="text-emerald-500" aria-hidden="true" />,
    lineColor: 'bg-emerald-500/40',
    dotBg: 'bg-emerald-500/10 border-emerald-500/40',
    textClass: 'text-muted-foreground line-through',
  },
  current: {
    icon: <Circle size={18} className="text-accent animate-pulse" aria-hidden="true" />,
    lineColor: 'bg-accent/40',
    dotBg: 'bg-accent/10 border-accent',
    textClass: 'text-foreground font-semibold',
  },
  upcoming: {
    icon: <Circle size={18} className="text-muted-foreground" aria-hidden="true" />,
    lineColor: 'bg-border',
    dotBg: 'bg-surface border-border',
    textClass: 'text-muted-foreground',
  },
  locked: {
    icon: <Lock size={18} className="text-muted-foreground/50" aria-hidden="true" />,
    lineColor: 'bg-border/50',
    dotBg: 'bg-surface border-border/50',
    textClass: 'text-muted-foreground/50',
  },
}

export function RoadmapTimeline({
  milestones,
  onAdvanceMilestone,
  onSetCurrentMilestone,
}: RoadmapTimelineProps) {
  return (
    <section aria-labelledby="roadmap-heading">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ArrowRight size={20} className="text-accent" aria-hidden="true" />
          <h2 id="roadmap-heading" className="text-base font-semibold text-foreground">
            Contribution Roadmap Timeline
          </h2>
        </div>
        <span className="text-xs font-mono text-muted-foreground">
          Sequential Progression
        </span>
      </div>

      <div className="relative">
        {milestones.map((milestone, index) => {
          const config = statusConfig[milestone.status] || statusConfig.upcoming
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
                <div className={`w-10 h-10 rounded-md border flex items-center justify-center ${config.dotBg}`}>
                  {config.icon}
                </div>
              </div>

              {/* Content */}
              <div
                className={`flex-1 rounded-md border bg-surface p-4 transition-colors
                  ${milestone.status === 'current' ? 'border-accent shadow-sm' : 'border-border'}
                  ${milestone.status === 'locked' ? 'opacity-60' : ''}
                `}
              >
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        Step {milestone.id}
                      </span>
                      {milestone.status === 'completed' && (
                        <span className="rounded-sm bg-emerald-500/10 px-1.5 py-0.2 font-mono text-[10px] font-semibold text-emerald-400">
                          DONE
                        </span>
                      )}
                      {milestone.status === 'current' && (
                        <span className="rounded-sm bg-accent/15 px-1.5 py-0.2 font-mono text-[10px] font-semibold text-accent">
                          IN PROGRESS
                        </span>
                      )}
                    </div>
                    <h3 className={`text-sm mt-0.5 ${config.textClass}`}>
                      {milestone.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {milestone.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                    <Clock size={12} aria-hidden="true" />
                    <span>{milestone.estimatedWeeks}w</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {milestone.skills.map((skill) => (
                    <Badge key={skill} variant="outline" className="font-mono text-[11px]">
                      {skill}
                    </Badge>
                  ))}
                </div>

                {milestone.status === 'current' && onAdvanceMilestone && (
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => onAdvanceMilestone(milestone.id)}
                      className="gap-1.5 text-xs font-semibold"
                    >
                      <Check size={14} aria-hidden="true" />
                      Mark Step Completed
                    </Button>
                  </div>
                )}

                {milestone.status === 'upcoming' && onSetCurrentMilestone && (
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSetCurrentMilestone(milestone.id)}
                      className="gap-1.5 text-xs"
                    >
                      Jump to This Step
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
