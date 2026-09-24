import type { ComponentType } from 'react'
import {
  Bot,
  CalendarDays,
  Compass,
  Map,
  MessageSquare,
  ShieldCheck,
  Trophy,
  UserRound,
} from 'lucide-react'

export interface FeatureModule {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>
  title: string
  body: string
  chips?: string[]
  wide?: boolean
}

export const FEATURE_MODULES: FeatureModule[] = [
  {
    icon: Compass,
    title: 'Explore',
    body: 'A GitHub-Explore-style feed of beginner-friendly repositories, tuned to the languages and labels you care about.',
    chips: ['good-first-issue', 'trending', 'beginner-only'],
    wide: true,
  },
  {
    icon: Map,
    title: 'AI Roadmap',
    body: 'Tell it what you know and what you want to learn. It plans the route from "never contributed" to "regular around here". Re-plans when life happens.',
  },
  {
    icon: Trophy,
    title: 'Quests & Rewards',
    body: 'Points and badges for real milestones. Your first PR, your first review, your first merge. Yes, it works a bit like LeetCode.',
  },
  {
    icon: CalendarDays,
    title: 'Events',
    body: 'GSSoC, Hacktoberfest, hackathons, deadlines. If it is happening in open source this month, it is on the calendar.',
  },
  {
    icon: UserRound,
    title: 'Profile',
    body: 'Your contribution graph, badges, XP and quest history in one view. It is the profile you would have built anyway, minus the spreadsheet.',
  },
  {
    icon: MessageSquare,
    title: 'Forum',
    body: 'Ask anything, no question too basic. Other first-timers answer fast, and maintainers show up for the tricky ones.',
  },
  {
    icon: Bot,
    title: 'AI Chatbot',
    body: 'Ask why a function exists or what the issue actually means. It answers from the real repo, not vibes.',
  },
]

export const TRUST_FEATURE: FeatureModule = {
  icon: ShieldCheck,
  title: 'Private by default',
  body: 'Your code stays on your machine unless you say otherwise. We do not train on your repos. Not ever, not "anonymized", not with an asterisk.',
  chips: ['no data selling'],
}

