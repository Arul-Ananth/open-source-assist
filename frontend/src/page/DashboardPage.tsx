import {
  Bell,
  BookOpen,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  MessagesSquare,
  Search,
  Users,
  Compass,
  Gift,
  CalendarDays,
  X,
  Send,
  Bot,
  Minus,
  BookMarked,
  Heart,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState } from '@/components/ui'
import { useAuthStore } from '@/lib/auth-store'
import { cn } from '@/lib/utils'
import { RoadmapPage } from '@/components/roadmap/RoadmapPage'
import { ExploreSection } from '@/components/dashboard/ExploreSection'

interface DashboardPageProps {
  onLogout: () => void
}

/** Modules ordered by priority: the core contribution loop first, reference material last. */
const navItems = [
  { id: 'overview', label: 'Profile & Overview', icon: LayoutDashboard },
  { id: 'learning', label: 'Learning', icon: BookOpen },
  { id: 'roadmap', label: 'Personalized Roadmap', icon: Map },
  { id: 'explore', label: 'Explore', icon: Compass },
  { id: 'events', label: 'Events', icon: CalendarDays },
  { id: 'forum', label: 'Forum', icon: MessagesSquare },
  { id: 'contributors', label: 'Contributors', icon: Users },
  { id: 'redeem', label: 'Redeem Points', icon: Gift },
  { id: 'docs', label: 'Documentation', icon: BookMarked },
] as const

type SectionId = (typeof navItems)[number]['id']

/** Dashed placeholder box where a real component will be dropped in. */
function Slot({ label, className }: { label: string; className?: string }) {
  return (
    <div
      className={cn(
        'flex min-h-[140px] items-center justify-center rounded-lg border border-dashed border-border bg-background/40 text-xs font-mono text-muted-foreground',
        className,
      )}
    >
      {label}
    </div>
  )
}

/** Blank state for modules that aren't built yet (uses the shared EmptyState). */
function BlankModule({ id }: { id: SectionId }) {
  const section = navItems.find((item) => item.id === id)
  const Icon = section?.icon ?? LayoutDashboard

  return (
    <div className="animate-fade-up space-y-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{section?.label}</h1>
        <p className="mt-1 text-sm text-muted-foreground">This module is coming soon.</p>
      </div>
      <EmptyState
        icon={Icon}
        title={section?.label ?? 'Module'}
        description={`Nothing here yet — this section is reserved for the ${(section?.label ?? 'module').toLowerCase()} module.`}
      />
    </div>
  )
}

/** Stat tiles — layout only, values are wired up later. */
function PointsStats() {
  const stats = [
    { label: 'Total points', icon: '✦' },
    { label: 'Streak', icon: '🔥' },
    { label: 'Merged PRs', icon: '⇄' },
    { label: 'Rank', icon: '#' },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-5 pt-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
              <span className="text-sm text-accent-text" aria-hidden="true">
                {stat.icon}
              </span>
            </div>
            <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-muted-foreground/60">—</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function OverviewSection() {
  const user = useAuthStore((s) => s.user)
  const displayName = user?.username ?? 'contributor'

  return (
    <div className="animate-fade-up space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome back, {displayName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your profile and contribution overview.
        </p>
      </div>

      {/* Profile header card */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-5 pt-5">
          <span className="flex size-14 items-center justify-center rounded-xl bg-gradient-program font-mono text-xl font-bold text-white">
            {displayName.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-bold">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </CardContent>
      </Card>

      {/* Points / stats row — empty values, wire up later */}
      <PointsStats />

      {/* Contribution heatmap (GitHub-style) + badges — structure only, no data */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Activity</CardTitle>
            <CardDescription>
              <span className="flex items-center gap-4">
                <span>Contributions in the last year</span>
                <span className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">Less</span>
                  {[0, 1, 2, 3, 4].map((level) => (
                    <span
                      key={level}
                      className="size-2.5 rounded-[2px] border border-border/60 bg-accent"
                      style={{ opacity: 0.12 + level * 0.22 }}
                      aria-hidden="true"
                    />
                  ))}
                  <span className="text-[10px] text-muted-foreground">More</span>
                </span>
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Empty heatmap: month labels + 7×N grid of unfilled cells */}
            <div className="overflow-x-auto pb-1">
              <div className="min-w-[640px]">
                <div className="mb-1.5 flex gap-[3px] pl-7 font-mono text-[10px] text-muted-foreground">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(
                    (month) => (
                      <span key={month} className="w-[calc(13px*4.4)]">
                        {month}
                      </span>
                    ),
                  )}
                </div>
                <div className="flex gap-[3px]">
                  {/* Day-of-week column (Mon/Wed/Fri labels like GitHub) */}
                  <div className="flex w-7 flex-col gap-[3px] font-mono text-[10px] text-muted-foreground">
                    {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((day, i) => (
                      <span key={i} className="h-[13px] leading-[13px]">
                        {day}
                      </span>
                    ))}
                  </div>
                  {/* Weeks: 53 columns × 7 rows of empty cells */}
                  {Array.from({ length: 53 }, (_, week) => (
                    <div key={week} className="flex flex-col gap-[3px]">
                      {Array.from({ length: 7 }, (_, day) => (
                        <span
                          key={day}
                          className="size-[13px] rounded-[2px] border border-border/60 bg-accent/5"
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Your badges</CardTitle>
            <CardDescription>Recent achievements.</CardDescription>
          </CardHeader>
          <CardContent>
            <Slot label="<Badges />" className="min-h-[240px]" />
          </CardContent>
        </Card>
      </div>

      {/* Other overview sections — layout only */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Recent activity</CardTitle>
            <CardDescription>Your latest PRs, issues and reviews.</CardDescription>
          </CardHeader>
          <CardContent>
            <Slot label="<RecentActivity />" className="min-h-[160px]" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Quick actions</CardTitle>
            <CardDescription>Shortcuts to get contributing fast.</CardDescription>
          </CardHeader>
          <CardContent>
            <Slot label="<QuickActions />" className="min-h-[160px]" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function DashboardPage({ onLogout }: DashboardPageProps) {
  const user = useAuthStore((s) => s.user)
  const [section, setSection] = useState<SectionId>('overview')
  const [mobileOpen, setMobileOpen] = useState(false)

  const displayName = user?.username ?? 'contributor'
  const initial = displayName.charAt(0).toUpperCase()

  const navigate = (id: SectionId) => {
    setSection(id)
    setMobileOpen(false)
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent shadow-accent-glow">
          <svg viewBox="0 0 24 24" className="size-5 text-on-accent" aria-hidden="true">
            <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="2.4" />
            <path
              d="M8.5 11.5 6 19l6-3 6 3-2.5-7.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="text-sm font-bold tracking-tight">OpenSource Assist</span>
      </div>

      {/* Nav */}
      <nav aria-label="Dashboard" className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const active = section === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.id)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150',
                active
                  ? 'bg-accent/15 text-accent-text'
                  : 'text-muted-foreground hover:bg-surface hover:text-foreground',
              )}
            >
              <item.icon className="size-4 shrink-0" aria-hidden="true" />
              {item.label}
              {active && <ChevronRight className="ml-auto size-4" aria-hidden="true" />}
            </button>
          )
        })}
      </nav>

      {/* Footer: logout */}
      <div className="border-t border-border p-3">
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={onLogout}>
          <LogOut className="size-4" aria-hidden="true" />
          Log out
        </Button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-dvh bg-background font-sans text-foreground">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 border-r border-border bg-surface/50 md:block">
        {sidebar}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/60 animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-border bg-surface shadow-soft-lg">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:border-accent md:hidden"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>

            <SearchBar />

            <div className="ml-auto flex items-center gap-2">
              <NotificationsMenu />
              <ThemeToggle />
              <div className="flex items-center gap-2 rounded-lg border border-border bg-surface py-1 pl-1 pr-2.5">
                <span className="flex size-7 items-center justify-center rounded-md bg-gradient-program font-mono text-xs font-bold text-white">
                  {initial}
                </span>
                <span className="hidden text-xs font-semibold sm:block">{displayName}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="mx-auto w-full max-w-[1200px] flex-1 p-4 sm:p-6">
          {section === 'overview' ? (
            <OverviewSection />
          ) : section === 'roadmap' ? (
            <RoadmapPage embedded />
          ) : section === 'explore' ? (
            <ExploreSection />
          ) : (
            <BlankModule id={section} />
          )}
        </main>

        {/* Footer — slim transparent bottom bar: ©, policy links, made-with note */}
        <footer className="border-t border-border bg-transparent">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-2.5 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-[11px] text-muted-foreground">
              © {new Date().getFullYear()} OpenSource Assist
            </p>
            <nav aria-label="Legal" className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigate('docs')}
                className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                Docs
              </button>
              <a
                href="#"
                className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                Terms
              </a>
              <a
                href="#"
                className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                Privacy
              </a>
            </nav>
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              Made with <Heart className="size-3 fill-accent text-accent" aria-hidden="true" /> by the open source community
            </p>
          </div>
        </footer>
      </div>

      {/* Floating chatbot */}
      <ChatbotWidget />
    </div>
  )
}

/** Topbar search: controlled input with Escape to clear + "/" to focus. */
function SearchBar() {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // "/" focuses search (like GitHub), unless the user is typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        const tag = (document.activeElement?.tagName ?? '').toLowerCase()
        if (tag !== 'input' && tag !== 'textarea') {
          e.preventDefault()
          inputRef.current?.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="relative hidden max-w-sm flex-1 sm:block">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        type="text"
        role="searchbox"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setQuery('')
            inputRef.current?.blur()
          }
        }}
        placeholder="Search repositories, PRs, people…"
        aria-label="Search"
        className="input-field search-input pl-9 pr-9"
      />
      {query ? (
        <button
          type="button"
          onClick={() => {
            setQuery('')
            inputRef.current?.focus()
          }}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      ) : (
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground md:block">
          /
        </kbd>
      )}
    </div>
  )
}

/** Bell button with a frosted-glass notifications popup. Empty — no mock data. */
function NotificationsMenu() {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={wrapRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className={cn(open && 'bg-surface text-foreground')}
      >
        <Bell className="size-4" aria-hidden="true" />
      </Button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="animate-pop-in absolute right-0 top-11 z-50 w-[min(92vw,340px)] overflow-hidden rounded-xl border border-border bg-surface shadow-soft-lg"
        >
          {/* Popup header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close notifications"
              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          {/* Empty body — notifications will be listed here */}
          <div className="flex min-h-[180px] items-center justify-center px-6 py-8">
            <p className="max-w-[28ch] text-center text-xs leading-relaxed text-muted-foreground">
              No notifications yet. PR reviews, mentions and event reminders will appear here.
            </p>
          </div>

          {/* Footer */}
          <div className="border-t border-border px-4 py-2.5 text-center">
            <span className="font-mono text-[10px] text-muted-foreground">you're all caught up</span>
          </div>
        </div>
      )}
    </div>
  )
}

/** Floating circular assistant button with an expandable chat popup. */
function ChatbotWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<{ from: 'user' | 'bot'; text: string }[]>([
    { from: 'bot', text: "Hi! I'm your open-source assistant. Ask me anything." },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const replyTimer = useRef<number>(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, isTyping, open])

  // Clear any pending reply when the widget unmounts.
  useEffect(() => {
    return () => window.clearTimeout(replyTimer.current)
  }, [])

  const send = async () => {
    const text = input.trim()
    if (!text || isTyping) return
    setMessages((m) => [...m, { from: 'user', text }])
    setInput('')
    setIsTyping(true)

    try {
      const res = await fetch('/api/v1/chatbot/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: text,
          skill_profile: {
            skill_level: 'beginner',
            tech_stack: ['Python', 'TypeScript', 'React'],
          },
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Service unavailable' }))
        throw new Error(err.detail || 'Service response error')
      }

      const data = await res.json()
      setMessages((m) => [...m, { from: 'bot', text: data.answer }])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Chatbot service unavailable.'
      setMessages((m) => [...m, { from: 'bot', text: `⚠️ ${message}` }])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <>
      {open && (
        <div className="animate-pop-in fixed bottom-24 right-5 z-50 flex h-[440px] w-[min(92vw,360px)] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-soft-lg">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface">
              <img
                src="/chatbot-logo.png"
                alt="OpenTrack Bot"
                className="size-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
              <Bot className="size-4 text-accent-text" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">OpenTrack Bot</p>
              <p className="text-[11px] leading-tight text-muted-foreground">Skill-aware developer assistant</p>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Minimize chat"
                className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              >
                <Minus className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((msg, i) => (
              <div key={i} className={cn('flex', msg.from === 'user' ? 'justify-end' : 'justify-start')}>
                <p
                  className={cn(
                    'max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed',
                    msg.from === 'user'
                      ? 'bg-accent text-on-accent'
                      : 'border border-border bg-background text-foreground',
                  )}
                >
                  {msg.text}
                </p>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start animate-fade-in">
                <div
                  role="status"
                  aria-label="Assistant is typing"
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2.5"
                >
                  {[0, 1, 2].map((dot) => (
                    <span
                      key={dot}
                      className="animate-typing-dot size-1.5 rounded-full bg-muted-foreground"
                      style={{ animationDelay: `${dot * 0.18}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              send()
            }}
            className="flex items-center gap-2 border-t border-border p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a technical question…"
              aria-label="Message"
              className="input-field flex-1"
            />
            <Button type="submit" size="icon" aria-label="Send message" disabled={!input.trim()}>
              <Send className="size-4" aria-hidden="true" />
            </Button>
          </form>
        </div>
      )}

      {/* Floating circle button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close assistant' : 'Open assistant'}
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-50 flex size-14 items-center justify-center overflow-hidden rounded-full border border-border bg-surface p-1 shadow-soft-lg transition-all duration-200 hover:-translate-y-1 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {open ? (
          <X className="size-6 text-foreground" aria-hidden="true" />
        ) : (
          <img
            src="/chatbot-logo.png"
            alt="OpenTrack Chatbot"
            className="size-full rounded-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        )}
      </button>
    </>
  )
}
