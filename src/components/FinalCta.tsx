import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Reveal } from '@/components/Reveal'

interface FinalCtaProps {
  onOpenAuth: (mode: 'login' | 'signup') => void
}

export default function FinalCta({ onOpenAuth }: FinalCtaProps) {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-[1240px] px-5 py-24 sm:px-8">
        <Reveal>
          <div className="bg-gradient-soft relative overflow-hidden rounded-xl border border-border p-10 text-center shadow-soft sm:p-14">
            {/* Top edge: thin GSSoC gradient line */}
            <span
              className="bg-gradient-program absolute inset-x-0 top-0 h-1"
              aria-hidden="true"
            />

            <h2 className="mx-auto mt-5 max-w-[20ch] text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
              The repo you were scared of is{' '}
              <span className="text-gradient-program">waiting</span>
            </h2>
            <p className="mx-auto mt-5 max-w-[52ch] text-base leading-relaxed text-muted-foreground sm:text-lg">
              Pick an issue tonight. Open the PR this weekend, even if it is
              scary. Everyone in the forum did the same thing once.
            </p>
            <div className="mt-9 flex justify-center">
              <Button size="lg" onClick={() => onOpenAuth('signup')}>
                Start contributing free
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
            <p className="mt-4 font-mono text-xs text-muted-foreground">
              free forever, no credit card, no trial timer
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
