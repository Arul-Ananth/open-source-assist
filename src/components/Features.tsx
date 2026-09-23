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
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Reveal } from '@/components/Reveal'

const modules = [
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

export default function Features() {
  return (
    <section id="modules" className="mx-auto max-w-[1240px] scroll-mt-24 px-5 py-24 sm:px-8">
      <Reveal>
        <p className="eyebrow">Inside the platform</p>
        <h2 className="section-h2 section-underline max-w-[24ch]">
          Everything a first-time contributor needs
        </h2>
        <p className="section-body">
          Seven modules that cover the whole journey. Discover a project,
          follow your roadmap, earn rewards, get help when you are stuck. No
          tab-hopping required.
        </p>
      </Reveal>

      <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
        {modules.map((module, i) => (
          <Reveal key={module.title} delay={(i % 3) * 90} className={module.wide ? 'md:col-span-2' : undefined}>
            <Card className="h-full">
              <CardContent className="p-6 pt-6">
                <div className="flex items-center gap-3">
                  <span className="bg-gradient-soft flex size-9 items-center justify-center rounded-lg text-accent-text transition-all duration-300">
                    <module.icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="text-lg font-semibold">{module.title}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{module.body}</p>
                {module.chips && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {module.chips.map((chip) => (
                      <Badge key={chip}>{chip}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </Reveal>
        ))}

        {/* Trust card completes the 3x3 grid */}
        <Reveal delay={180}>
          <Card className="h-full">
            <CardContent className="p-6 pt-6">
              <div className="flex items-center gap-3">
                <span className="bg-gradient-soft flex size-9 items-center justify-center rounded-lg text-accent-text">
                  <ShieldCheck className="size-5" aria-hidden="true" />
                </span>
                <h3 className="text-lg font-semibold">Private by default</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Your code stays on your machine unless you say otherwise. We do
                not train on your repos. Not ever, not "anonymized", not with
                an asterisk.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Badge variant="secondary">no data selling</Badge>
              </div>
            </CardContent>
          </Card>
        </Reveal>
      </div>
    </section>
  )
}
