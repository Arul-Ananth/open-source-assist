import { useState } from 'react'
import { Code2, Sparkles, TrendingUp } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, Badge, ProgressBar, Button } from '@/components/ui'
import { SkillAssessmentModal } from './SkillAssessmentModal'
import type { SkillAssessment as SkillAssessmentType } from '@/types/github'

interface SkillAssessmentProps {
  skills: SkillAssessmentType[]
  username?: string
  userSkillLevel?: string
}

const levelConfig: Record<string, { badge: 'default' | 'accent' | 'success' | 'warning'; label: string }> = {
  beginner: { badge: 'default', label: 'Beginner' },
  intermediate: { badge: 'warning', label: 'Intermediate' },
  advanced: { badge: 'accent', label: 'Advanced' },
  expert: { badge: 'success', label: 'Expert' },
}

export function SkillAssessmentPanel({ skills, username, userSkillLevel }: SkillAssessmentProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <section aria-labelledby="skills-heading">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Code2 size={20} className="text-accent" aria-hidden="true" />
          <div>
            <div className="flex items-center gap-2">
              <h2 id="skills-heading" className="text-base font-semibold text-foreground">
                Technical Skill Breakdown
              </h2>
              {userSkillLevel && (
                <span className="rounded-sm border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] font-semibold capitalize text-accent">
                  Assessed: {userSkillLevel}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Repository metrics and evaluated open-source competencies
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="gap-1.5 self-start sm:self-auto font-semibold text-xs"
        >
          <Sparkles className="size-3.5" />
          {userSkillLevel ? 'Retake Quiz' : 'Take 5-min Quiz'}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {skills.map((skill) => {
          const config = levelConfig[skill.level] || levelConfig.beginner
          return (
            <Card key={skill.language}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-mono text-sm">{skill.language}</CardTitle>
                  <Badge variant={config.badge} className="font-mono text-xs">{config.label}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ProgressBar
                  value={skill.score}
                  color={skill.color}
                  label={`${skill.repos} repos`}
                />
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <TrendingUp size={12} aria-hidden="true" />
                  <span>Proficiency score: <span className="font-mono text-foreground font-semibold">{skill.score}/100</span></span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <SkillAssessmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        username={username}
      />
    </section>
  )
}
