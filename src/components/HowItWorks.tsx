import { Compass, Map, Trophy } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Reveal } from '@/components/Reveal'

const steps = [
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

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-[1240px] scroll-mt-24 px-5 py-24 sm:px-8">
      <Reveal>
        <p className="eyebrow">How it works</p>
        <h2 className="section-h2 section-underline max-w-[24ch]">
          From lurker to merged, in three moves
        </h2>
        <p className="section-body mt-6">
          Every contributor repeats the same loop. We just removed the parts
          where people usually quit.
        </p>
      </Reveal>

      {/* GSoC-style numbered timeline: gradient rail with filled milestone dots */}
      <div className="relative mt-16">
        <span
          className="bg-gradient-program absolute left-0 right-0 top-5 hidden h-1 rounded-full md:block"
          aria-hidden="true"
        />
        <ol className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="list-none">
              <Reveal delay={index * 120}>
                <div className="relative">
                  <span
                    className="bg-gradient-program relative z-10 mx-auto flex size-10 -translate-y-0 items-center justify-center rounded-full text-white shadow-accent-glow md:mx-0"
                    aria-hidden="true"
                  >
                    <step.icon className="size-5" />
                  </span>
                  <Card className="mt-5 h-full">
                    <CardContent className="p-6 pt-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">{step.title}</h3>
                        <span className="font-mono text-xs text-muted-foreground">
                          step {String(index + 1).padStart(2, '0')}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {step.body}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
