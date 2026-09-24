import { GitBranch, MessageCircle } from 'lucide-react'
import { Card, CardContent, Button } from '@/components/ui'
import { AnimatedNumber } from '@/components/shared'
import { useLayout } from '@/components/layout'
import { COMMUNITY_STATS, PARTNER_PROGRAMS } from '@/data'

export interface CommunityProps {
  onOpenAuth?: (mode: 'login' | 'signup') => void
}

/** Tiny deterministic sparkline — no chart lib, no animation, just the shape. */
function Sparkline({ points, className }: { points: number[]; className?: string }) {
  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = max - min || 1
  const width = 96
  const height = 28
  const step = width / (points.length - 1)
  const coords = points.map(
    (p, i) =>
      `${(i * step).toFixed(1)},${(height - 4 - ((p - min) / range) * (height - 8)).toFixed(1)}`,
  )

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden="true">
      <polyline
        points={coords.join(' ')}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Community({ onOpenAuth }: CommunityProps) {
  let layoutAuth: ((mode: 'login' | 'signup') => void) | undefined
  try {
    layoutAuth = useLayout().openAuth
  } catch {
    // rendered outside Layout
  }
  const triggerAuth = onOpenAuth ?? layoutAuth

  return (
    <section id="community" className="mx-auto max-w-[1240px] scroll-mt-20 px-5 py-24 sm:px-8">
      <Card>
        <CardContent className="p-8 pt-8 sm:p-12 sm:pt-12">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Nobody merges their first PR alone
              </h2>
              <p className="mt-4 max-w-[50ch] text-base leading-relaxed text-muted-foreground">
                The forum is where most of it happens. Someone has hit your
                exact blocker before, and usually answers before your tea goes
                cold.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button onClick={() => triggerAuth?.('signup')}>
                  <GitBranch className="size-4" aria-hidden="true" />
                  Create free account
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => window.open('https://discord.com', '_blank', 'noreferrer')}
                >
                  <MessageCircle className="size-4" aria-hidden="true" />
                  Join the Discord
                </Button>
              </div>
            </div>

            {/* Deliberately not uniform: one stat gets a sparkline, two get
                week-over-week chips, the rest stay plain numbers. */}
            <dl className="grid grid-cols-2 gap-x-8 gap-y-10 self-center">
              {COMMUNITY_STATS.map((stat, i) => (
                <div key={stat.label}>
                  <dd className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 font-mono text-3xl font-semibold tracking-tight text-accent-text sm:text-4xl">
                    <AnimatedNumber value={stat.value} delay={i * 120} />
                    {stat.delta && (
                      <span className="inline-flex items-center rounded-full border border-accent/40 px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-accent-text">
                        {stat.delta}
                      </span>
                    )}
                  </dd>
                  {stat.spark && (
                    <Sparkline points={stat.spark} className="mt-2.5 h-7 w-24 text-accent" />
                  )}
                  <dt className="mt-2 text-sm text-muted-foreground">{stat.label}</dt>
                </div>
              ))}
            </dl>
          </div>

          {/* Programs strip — GSSoC/GSoC-style partner chips */}
          <div className="mt-12 border-t border-border pt-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              programs our community joins
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {PARTNER_PROGRAMS.map((program) => (
                <span key={program} className="program-chip">
                  {program}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

export default Community
