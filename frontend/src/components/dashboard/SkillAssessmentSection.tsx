import { useState } from 'react'
import {
  Award,
  Code2,
  GraduationCap,
  Sparkles,
  Target,
  Terminal,
} from 'lucide-react'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui'
import { useAuthStore } from '@/lib/auth-store'
import { SkillAssessmentModal } from '@/components/roadmap/SkillAssessmentModal'

export function SkillAssessmentSection() {
  const user = useAuthStore((s) => s.user)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const skillLevel = user?.skill_level
  const userContext = user?.user_context

  return (
    <div className="animate-fade-up space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent-text">
            Evaluation / Competency
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            GitHub Skill Assessment
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            AI-grounded technical evaluation calibrated to real open-source architectures, version
            control workflows, and your GitHub activity.
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="shrink-0 gap-2 font-semibold shadow-[3px_3px_0px_0px_rgba(255,140,0,0.5)]"
        >
          <Sparkles className="size-4" />
          <span>{skillLevel ? 'Retake Assessment' : 'Start Assessment'}</span>
        </Button>
      </div>

      {/* Main Status Card */}
      <Card className="border border-border bg-surface shadow-none">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-md border border-accent/40 bg-accent/10 text-accent-text">
                <GraduationCap className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base">Current Profile Evaluation</CardTitle>
                <CardDescription className="text-xs">
                  Calibrated against repository patterns and open-source contribution readiness
                </CardDescription>
              </div>
            </div>
            {skillLevel ? (
              <Badge
                variant="outline"
                className="border-accent/40 bg-accent/10 font-mono text-xs uppercase text-accent-text"
              >
                {skillLevel} Tier
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-amber-500/40 bg-amber-500/10 font-mono text-xs uppercase text-amber-400"
              >
                Not Assessed Yet
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {skillLevel ? (
            <div className="space-y-3">
              <div className="rounded-md border border-border bg-background p-4">
                <p className="text-xs font-semibold text-foreground">Assessed Context &amp; Focus</p>
                <p className="mt-1 font-mono text-xs leading-relaxed text-accent-text">
                  {userContext || `Assessed as ${skillLevel}. Ready for tailored recommendations across the platform.`}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-md border border-border bg-background p-3">
                  <p className="text-[11px] text-muted-foreground">Documentation Recommendations</p>
                  <p className="mt-1 font-semibold text-emerald-400">✓ Calibrated</p>
                </div>
                <div className="rounded-md border border-border bg-background p-3">
                  <p className="text-[11px] text-muted-foreground">Roadmap Difficulty</p>
                  <p className="mt-1 font-semibold text-foreground capitalize">{skillLevel}</p>
                </div>
                <div className="rounded-md border border-border bg-background p-3">
                  <p className="text-[11px] text-muted-foreground">Evaluation Engine</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">Gemini + LangGraph</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border bg-background p-6 text-center">
              <Target className="mx-auto size-10 text-muted-foreground/50" />
              <h3 className="mt-3 text-sm font-semibold text-foreground">
                No active assessment found
              </h3>
              <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                Take the 5-minute interactive quiz (3 MCQs and 2 short technical questions) to
                evaluate your knowledge and calibrate documentation and roadmap recommendations.
              </p>
              <Button
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="mt-4 gap-1.5 font-semibold"
              >
                <Sparkles className="size-3.5" />
                Launch Assessment Quiz
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* How it Works Grid */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          How Evaluation Works
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border border-border bg-surface shadow-none">
            <CardContent className="p-4">
              <div className="flex size-8 items-center justify-center rounded-md border border-border bg-background text-accent-text">
                <Code2 className="size-4" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-foreground">
                1. Project Grounded
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Questions are synthesized directly from real open-source architectures, Git branch
                scenarios, and project workflows.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border bg-surface shadow-none">
            <CardContent className="p-4">
              <div className="flex size-8 items-center justify-center rounded-md border border-border bg-background text-accent-text">
                <Terminal className="size-4" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-foreground">
                2. Subjective Reasoning
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Beyond multiple-choice questions, answer short architectural prompts evaluated by
                AI for technical depth and design considerations.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border bg-surface shadow-none">
            <CardContent className="p-4">
              <div className="flex size-8 items-center justify-center rounded-md border border-border bg-background text-accent-text">
                <Award className="size-4" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-foreground">
                3. Platform Personalization
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Your assessed skill tier immediately personalizes Documentation Hub badges, search
                filters, and roadmap milestones.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal */}
      <SkillAssessmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        username={user?.username}
      />
    </div>
  )
}
