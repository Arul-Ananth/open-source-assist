import type { ComponentType } from 'react'
import { Compass, Map, Trophy } from 'lucide-react'

export interface HowItWorksStep {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>
  title: string
  body: string
}

export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    icon: Compass,
    title: 'Discover',
    body: 'Open Explore, filter to your language, and star a couple of repos. That is the whole step. It takes five minutes.',
  },
  {
    icon: Map,
    title: 'Follow the path',
    body: 'The roadmap turns your first contribution into small quests. Read the contributing guide, set up the repo, fix the thing.',
  },
  {
    icon: Trophy,
    title: 'Earn & level up',
    body: 'Merged PRs earn points and badges. The graph on your profile starts filling in, and honestly it is a little addictive.',
  },
]

