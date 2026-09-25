import { Code2, TrendingUp } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, Badge, ProgressBar } from '@/components/ui'
import type { SkillAssessment as SkillAssessmentType } from '@/types/github'

interface SkillAssessmentProps {
  skills: SkillAssessmentType[]
}

const levelConfig: Record<string, { badge: 'default' | 'accent' | 'success' | 'warning'; label: string }> = {
  beginner: { badge: 'default', label: 'Beginner' },
  intermediate: { badge: 'warning', label: 'Intermediate' },
  advanced: { badge: 'accent', label: 'Advanced' },
  expert: { badge: 'success', label: 'Expert' },
}

export function SkillAssessmentPanel({ skills }: SkillAssessmentProps) {
  return (
    <section aria-labelledby="skills-heading">
      <div className="flex items-center gap-2 mb-4">
        <Code2 size={20} className="text-accent" aria-hidden="true" />
        <h2 id="skills-heading" className="text-lg font-semibold text-primary-text">
          Skill Assessment
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {skills.map((skill) => {
          const config = levelConfig[skill.level]
          return (
            <Card key={skill.language}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-mono text-sm">{skill.language}</CardTitle>
                  <Badge variant={config.badge}>{config.label}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ProgressBar
                  value={skill.score}
                  color={skill.color}
                  label={`${skill.repos} repos`}
                />
                <div className="flex items-center gap-1 mt-2 text-xs text-secondary-text">
                  <TrendingUp size={12} aria-hidden="true" />
                  <span>Proficiency score: <span className="font-mono text-primary-text">{skill.score}/100</span></span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
