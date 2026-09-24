import { Card, CardContent, Badge } from '@/components/ui'
import { Reveal } from '@/components/shared'
import { FEATURE_MODULES, TRUST_FEATURE } from '@/data'

export function Features() {
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
        {FEATURE_MODULES.map((module, i) => (
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
                  <TRUST_FEATURE.icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="text-lg font-semibold">{TRUST_FEATURE.title}</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {TRUST_FEATURE.body}
              </p>
              {TRUST_FEATURE.chips && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {TRUST_FEATURE.chips.map((chip) => (
                    <Badge key={chip} variant="secondary">
                      {chip}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </Reveal>
      </div>
    </section>
  )
}

export default Features
