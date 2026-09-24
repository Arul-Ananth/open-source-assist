import { useEffect, useState } from 'react'
import { Compass, FolderSearch, Terminal } from 'lucide-react'

const TYPED_LINE = 'osa roadmap --begin'

export function Hero() {
  // One-time typewriter for the terminal's first line, with a blinking caret.
  const [typed, setTyped] = useState('')

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTyped(TYPED_LINE)
      return
    }
    let i = 0
    const id = window.setInterval(() => {
      i += 1
      setTyped(TYPED_LINE.slice(0, i))
      if (i >= TYPED_LINE.length) window.clearInterval(id)
    }, 55)
    return () => window.clearInterval(id)
  }, [])

  return (
    <section className="mx-auto max-w-[1240px] px-5 pb-24 pt-32 sm:px-8 lg:pb-32 lg:pt-40">
      <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="max-w-xl">
          <a
            href="#modules"
            className="animate-fade-up inline-flex items-center gap-2.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-accent hover:text-accent-text"
          >
            <span className="chip">New</span>
            Explore, quests, badges and an AI mentor, all in one place
          </a>

          <h1
            className="animate-fade-up mt-6 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.4rem]"
            style={{ animationDelay: '90ms' }}
          >
            Your first pull request,
            <br />
            <span className="text-gradient-program">without the panic.</span>
          </h1>

          <p
            className="animate-fade-up mt-5 max-w-[46ch] text-base leading-relaxed text-muted-foreground sm:text-lg"
            style={{ animationDelay: '180ms' }}
          >
            OpenSource Assist walks you through open source: find
            beginner-friendly repos, follow a roadmap that adapts to you, and
            collect points and badges for real contributions. Stuck at 2am?
            The chatbot has actually read the repo.
          </p>

          <div
            className="animate-fade-up mt-8 flex flex-wrap items-center gap-3"
            style={{ animationDelay: '270ms' }}
          >
            <a href="#modules" className="btn-primary">
              <Compass className="size-4" aria-hidden="true" />
              See what's inside
            </a>
            <a href="#finder" className="btn-secondary">
              Try the explorer
              <FolderSearch className="size-4" aria-hidden="true" />
            </a>
          </div>
        </div>

        {/* Flat terminal mock with a floating card behind it */}
        <div className="animate-fade-up relative mx-auto w-full max-w-[520px]" style={{ animationDelay: '220ms' }}>
          <div className="animate-float-slow absolute -right-4 -top-4 -z-10 hidden h-full w-full rotate-3 rounded-xl border border-border bg-surface shadow-soft sm:block" />
          <div className="rounded-xl border border-border bg-surface shadow-soft-lg transition-transform duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <span className="relative flex size-2">
                <span className="animate-pulse-dot absolute inline-flex h-full w-full rounded-full bg-accent" />
                <span className="relative inline-flex size-2 rounded-full bg-accent" />
              </span>
              <Terminal className="size-4 text-accent" aria-hidden="true" />
              <span className="font-mono text-xs text-muted-foreground">osa --dashboard</span>
            </div>
            <div className="space-y-2.5 p-5 font-mono text-[13px] leading-relaxed">
              <p className="text-muted-foreground">
                $ {typed}
                <span className="terminal-caret" aria-hidden="true" />
              </p>
              <p className="text-foreground">
                <span className="text-accent-text">➜</span> Explore: pick a repo → Read the guide
              </p>
              <p className="text-muted-foreground">$ quests --active</p>
              <p className="text-foreground">
                <span className="text-accent-text">➜</span> "Open your first PR" · 80 pts · in progress
              </p>
              <p className="text-foreground">
                <span className="text-accent-text">➜</span> "Review a peer's PR" · 50 pts · locked
              </p>
              <p className="text-muted-foreground">$ badges --earned</p>
              <p>
                <span className="text-accent-text">✓</span> 2 earned · 6 to go
              </p>
              <p className="text-muted-foreground"># first PR is always the scariest. it gets easier.</p>
            </div>
            <div className="flex items-center justify-between border-t border-border px-5 py-3 font-mono text-[10px] text-muted-foreground">
              <span>you, three weeks from now</span>
              <span className="text-accent-text">level 2 · 430 pts</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero

