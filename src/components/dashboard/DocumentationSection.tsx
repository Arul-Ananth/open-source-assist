import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, FileText, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type DocBlock =
  | { type: 'p'; text: string }
  | { type: 'h'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'steps'; items: string[] }
  | { type: 'code'; text: string }
  | { type: 'note'; text: string }

interface DocPage {
  id: string
  title: string
  section: 'Getting started' | 'Modules' | 'Points & rewards' | 'FAQ'
  blocks: DocBlock[]
}

const DOC_PAGES: DocPage[] = [
  {
    id: 'quick-start',
    title: 'Quick start',
    section: 'Getting started',
    blocks: [
      { type: 'p', text: 'OpenSource Assist helps you find beginner-friendly repositories, follow a personalized contribution roadmap and earn points for merged pull requests.' },
      { type: 'h', text: 'Create your account' },
      { type: 'steps', items: ['Click Sign up in the top navigation.', 'Choose a username (3+ characters) and a password (8+ characters).', 'You are taken straight to your dashboard.'] },
      { type: 'h', text: 'The dashboard' },
      { type: 'p', text: 'The sidebar lists every module in priority order. Profile & Overview is your home base — it shows your stats, contribution heatmap and badges as you earn them.' },
      { type: 'note', text: 'Your session is stored in your browser. Logging out on one device does not affect other devices.' },
    ],
  },
  {
    id: 'linking-github',
    title: 'Linking your GitHub account',
    section: 'Getting started',
    blocks: [
      { type: 'p', text: 'Linking GitHub lets the platform detect your pull requests automatically and award points when they merge.' },
      { type: 'steps', items: ['Open Profile & Overview from the sidebar.', 'Select Connect GitHub in the profile header.', 'Authorize the OAuth prompt on github.com.', 'Your public repositories and PRs start syncing within a few minutes.'] },
      { type: 'note', text: 'Only public activity is read. Private repository work is never indexed.' },
    ],
  },
  {
    id: 'learning',
    title: 'Learning module',
    section: 'Modules',
    blocks: [
      { type: 'p', text: 'The Learning module contains short, focused lessons that take you from "never opened a terminal" to "comfortable reviewing code".' },
      { type: 'h', text: 'How lessons work' },
      { type: 'list', items: ['Each lesson is 5–15 minutes long.', 'Lessons unlock in order, but you can revisit anything you completed.', 'Finishing a lesson grants points toward your streak.'] },
      { type: 'h', text: 'Tracks' },
      { type: 'list', items: ['Git fundamentals — branching, committing, rebasing.', 'Your first PR — forking, opening, describing changes.', 'Code review — reading diffs, giving kind feedback.'] },
    ],
  },
  {
    id: 'roadmap',
    title: 'Personalized roadmap',
    section: 'Modules',
    blocks: [
      { type: 'p', text: 'Your roadmap is a step-by-step path generated from your skills, interests and current contribution level.' },
      { type: 'h', text: 'Generating a roadmap' },
      { type: 'steps', items: ['Open Personalized Roadmap from the sidebar.', 'Pick the languages and project types you enjoy.', 'Select Generate — milestones appear from first PR to module maintainer.', 'Regenerate any time your interests change.'] },
      { type: 'p', text: 'Each milestone links to matching repositories in Explore so you can act on it immediately.' },
    ],
  },
  {
    id: 'explore',
    title: 'Explore repositories',
    section: 'Modules',
    blocks: [
      { type: 'p', text: 'Explore surfaces repositories that match your skill level, tuned for first-time contributors — like GitHub Explore, but filtered for good-first-issues.' },
      { type: 'h', text: 'Filtering' },
      { type: 'list', items: ['Search by repository name or topic.', 'Filter by language, license and issue difficulty.', 'Trending topics show what the community contributes to this week.'] },
      { type: 'note', text: 'Repositories marked "good first issue" have maintainers who actively label beginner tasks.' },
    ],
  },
  {
    id: 'forum-chatbot',
    title: 'Forum & chat assistant',
    section: 'Modules',
    blocks: [
      { type: 'h', text: 'Forum' },
      { type: 'p', text: 'The Forum is where contributors ask questions, share knowledge and discuss open source. Threads are organized by tags; top tags appear in the sidebar.' },
      { type: 'list', items: ['Use New post to start a thread.', 'Tag your question with a language or program name for faster answers.', 'Accepted answers float to the top automatically.'] },
      { type: 'h', text: 'Chat assistant' },
      { type: 'p', text: 'The assistant is the floating circle in the bottom-right corner of every dashboard page. Ask it about finding issues, writing PR descriptions or understanding git errors.' },
      { type: 'note', text: 'The assistant can search documentation for you — try "how do points work?"' },
    ],
  },
  {
    id: 'points',
    title: 'Earning points',
    section: 'Points & rewards',
    blocks: [
      { type: 'p', text: 'Points reward consistent, high-quality contribution. They are visible on your Profile & Overview page and spendable in Redeem.' },
      { type: 'h', text: 'How you earn' },
      { type: 'list', items: ['Merged pull request — base points, scaled by review depth.', 'Issue triaged or reproduced — small award.', 'Lesson completed in Learning.', 'Daily streak — keep contributing to keep the multiplier.'] },
      { type: 'h', text: 'How you keep them' },
      { type: 'p', text: 'Points never expire while your account is active. Streak multipliers reset after 14 days of inactivity; the underlying points do not.' },
    ],
  },
  {
    id: 'redeem',
    title: 'Redeeming rewards',
    section: 'Points & rewards',
    blocks: [
      { type: 'p', text: 'The Redeem module exchanges points for swag, program perks and community privileges.' },
      { type: 'steps', items: ['Open Redeem Points from the sidebar.', 'Browse the rewards grid — each card shows its cost.', 'Select Redeem on an affordable item and confirm.', 'Physical rewards ask for a shipping address; digital ones are granted instantly.'] },
      { type: 'note', text: 'Redemption history is kept under the rewards grid so you can track orders and codes.' },
    ],
  },
  {
    id: 'faq',
    title: 'FAQ',
    section: 'FAQ',
    blocks: [
      { type: 'h', text: 'Is OpenSource Assist free?' },
      { type: 'p', text: 'Yes. Every module — Learning, Roadmap, Explore, Forum, Events and Redeem — is free for contributors.' },
      { type: 'h', text: 'Do I need GitHub to participate?' },
      { type: 'p', text: 'You can browse and learn without one, but linking GitHub is required to earn points from merged pull requests.' },
      { type: 'h', text: 'Can I use my own repositories?' },
      { type: 'p', text: 'Points come from contributions to repositories in the Explore index. Open an issue on the platform to request adding a project.' },
      { type: 'h', text: 'Where do I report a bug in the platform?' },
      { type: 'p', text: 'Post in the Forum under the "platform" tag, or message the maintainers from the Contributors page.' },
    ],
  },
]

const SECTIONS = ['Getting started', 'Modules', 'Points & rewards', 'FAQ'] as const

/** Renders one documentation block. */
function Block({ block }: { block: DocBlock }) {
  switch (block.type) {
    case 'h':
      return <h2 className="mt-8 text-base font-bold tracking-tight first:mt-0">{block.text}</h2>
    case 'p':
      return <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{block.text}</p>
    case 'list':
      return (
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )
    case 'steps':
      return (
        <ol className="mt-3 space-y-2">
          {block.items.map((item, i) => (
            <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent/15 font-mono text-[10px] font-bold text-accent-text">
                {i + 1}
              </span>
              {item}
            </li>
          ))}
        </ol>
      )
    case 'code':
      return (
        <pre className="mt-3 overflow-x-auto rounded-md border border-border bg-background p-3 font-mono text-xs leading-relaxed">
          {block.text}
        </pre>
      )
    case 'note':
      return (
        <p className="mt-4 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-xs leading-relaxed text-foreground">
          {block.text}
        </p>
      )
  }
}

export function DocumentationSection() {
  const [activeId, setActiveId] = useState(DOC_PAGES[0].id)
  const [query, setQuery] = useState('')

  // Filter pages by search query (title + body text).
  const visiblePages = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return DOC_PAGES
    return DOC_PAGES.filter(
      (page) =>
        page.title.toLowerCase().includes(q) ||
        page.blocks.some((block) => {
          const texts =
            block.type === 'list' || block.type === 'steps' ? block.items.join(' ') : block.text
          return texts.toLowerCase().includes(q)
        }),
    )
  }, [query])

  const activePage = visiblePages.find((page) => page.id === activeId) ?? visiblePages[0]
  const activeIndex = activePage ? visiblePages.indexOf(activePage) : -1

  const goPrev = () => {
    if (activeIndex > 0) setActiveId(visiblePages[activeIndex - 1].id)
  }
  const goNext = () => {
    if (activeIndex >= 0 && activeIndex < visiblePages.length - 1) {
      setActiveId(visiblePages[activeIndex + 1].id)
    }
  }

  return (
    <div className="animate-fade-up space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Documentation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Guides for every module, earning points and getting the most out of the platform.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Sidebar: search + table of contents */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search docs…"
              aria-label="Search documentation"
              className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 hover:border-accent/50 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15"
            />
          </div>

          <nav aria-label="Documentation" className="mt-4 max-h-[60vh] space-y-5 overflow-y-auto pr-1">
            {visiblePages.length === 0 && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                No results for “{query}”. Try “points”, “GitHub” or “roadmap”.
              </p>
            )}
            {SECTIONS.map((section) => {
              const pages = visiblePages.filter((page) => page.section === section)
              if (pages.length === 0) return null
              return (
                <div key={section}>
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {section}
                  </p>
                  <ul className="mt-1.5 space-y-0.5">
                    {pages.map((page) => {
                      const active = activePage?.id === page.id
                      return (
                        <li key={page.id}>
                          <button
                            type="button"
                            onClick={() => setActiveId(page.id)}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                              'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors duration-150',
                              active
                                ? 'bg-accent/15 font-medium text-accent-text'
                                : 'text-muted-foreground hover:bg-surface hover:text-foreground',
                            )}
                          >
                            <FileText className="size-3.5 shrink-0" aria-hidden="true" />
                            {page.title}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
          </nav>
        </aside>

        {/* Article */}
        <article className="min-w-0">
          {activePage ? (
            <>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent-text">
                {activePage.section}
              </p>
              <h2 className="mt-1.5 text-xl font-bold tracking-tight">{activePage.title}</h2>
              <div className="mt-4">
                {activePage.blocks.map((block, i) => (
                  <Block key={i} block={block} />
                ))}
              </div>

              {/* Prev / next */}
              <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-5">
                <Button variant="secondary" size="sm" onClick={goPrev} disabled={activeIndex <= 0}>
                  <ChevronLeft className="size-4" aria-hidden="true" />
                  Previous
                </Button>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {activeIndex + 1} / {visiblePages.length}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={goNext}
                  disabled={activeIndex < 0 || activeIndex >= visiblePages.length - 1}
                >
                  Next
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
              Nothing found — clear the search to see all pages.
            </div>
          )}
        </article>
      </div>
    </div>
  )
}
