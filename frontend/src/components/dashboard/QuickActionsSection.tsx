import {
  Compass,
  Map,
  Gift,
  ChevronRight,
  Sparkles,
} from 'lucide-react'

interface QuickActionsSectionProps {
  onNavigate: (sectionId: string) => void
  totalPoints?: number
  topLanguage?: string
}

export function QuickActionsSection({
  onNavigate,
  totalPoints = 0,
  topLanguage = 'TypeScript',
}: QuickActionsSectionProps) {
  const actions = [
    {
      title: 'Find Good First Issues',
      desc: `Curated beginner tickets in ${topLanguage}`,
      icon: Compass,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      action: () => onNavigate('explore'),
    },
    {
      title: 'Personalized Roadmap',
      desc: 'AI tailored milestones from your GitHub profile',
      icon: Map,
      color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
      action: () => onNavigate('roadmap'),
    },
    {
      title: 'Redeem Contribution Points',
      desc: `Spend your ${totalPoints.toLocaleString()} points on mentorship & swag`,
      icon: Gift,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      action: () => onNavigate('redeem'),
    },
    {
      title: 'Interactive Git Learning',
      desc: 'Master pull requests and branch workflows',
      icon: Sparkles,
      color: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
      action: () => onNavigate('learning'),
    },
  ]

  return (
    <div className="space-y-2">
      {actions.map((act) => (
        <button
          key={act.title}
          type="button"
          onClick={act.action}
          className="group flex w-full items-center gap-3 rounded-xl border border-border/60 bg-surface/30 p-2.5 text-left transition-all duration-150 hover:border-accent/40 hover:bg-surface/70"
        >
          <div
            className={`flex size-8 shrink-0 items-center justify-center rounded-lg border ${act.color}`}
          >
            <act.icon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground group-hover:text-accent-text">
              {act.title}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">{act.desc}</p>
          </div>
          <ChevronRight className="size-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
        </button>
      ))}
    </div>
  )
}
