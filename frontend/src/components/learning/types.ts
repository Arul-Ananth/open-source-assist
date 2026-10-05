export type Pillar = 'learn' | 'ai-modules' | 'knowledge'

export interface CoachConfig {
  step: number
  title: string
  text: string
  do: string
  why: string
  target: string
  pose?: string
}

export interface TutorialCompletion {
  title: string
  text: string
  learned: string[]
  relatedQuestionIds: string[]
}

export interface Tutorial {
  id: string
  icon: string
  name: string
  desc: string
  title: string
  descText: string
  badge: string
  time: string
  steps: [string, string][] | string[][]
  coachConfigs: CoachConfig[]
  completion: TutorialCompletion
}

export interface KnowledgeCategory {
  id: string
  name: string
  icon: string
  desc: string
}

export interface KnowledgeConcept {
  id: string
  category: string
  categoryName: string
  title: string
  short: string
  explanation: string
  whyItMatters?: string
  example?: string
  mistake?: string
  command?: string | null
  tutorialId?: string
}

export interface ChatMessage {
  role: 'user' | 'assist'
  text: string
}

export type ModalState =
  | {
      kind: 'why'
      title: string
      text: string
      categoryName?: string
      explanation?: string
      whyItMatters?: string
      example?: string
      mistake?: string
    }
  | (KnowledgeConcept & { kind?: undefined })
  | null

export interface TutorialStepActionProps {
  tutorialId: string
  step: number
  target: string
  onComplete: (createdBranch?: string) => void
}
