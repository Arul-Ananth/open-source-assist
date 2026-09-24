import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Button } from '@/components/ui'
import { NAV_LINKS, type NavLink } from '@/data'

export type { NavLink } from '@/data'

export interface NavProps {
  onOpenAuth: (mode: 'login' | 'signup') => void
  links?: NavLink[]
}

export function Nav({ onOpenAuth, links = NAV_LINKS }: NavProps) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState<string | null>(null)

  // Solid blurred backdrop once the page scrolls
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Safe scroll-spy: only observes elements that actually exist on the current page
  useEffect(() => {
    const sections = links
      .map((link) => {
        const hashIdx = link.href.indexOf('#')
        if (hashIdx === -1) return null
        return document.getElementById(link.href.slice(hashIdx + 1))
      })
      .filter((el): el is HTMLElement => el !== null)

    if (sections.length === 0) return

    const visible = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id)
          else visible.delete(entry.target.id)
        }
        const current = links.find((link) => {
          const hashIdx = link.href.indexOf('#')
          return hashIdx !== -1 && visible.has(link.href.slice(hashIdx + 1))
        })
        if (current) setActive(current.href)
      },
      { rootMargin: '-30% 0px -55% 0px' },
    )
    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [links])

  // Close the mobile menu if the viewport grows past the breakpoint.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const onChange = (e: MediaQueryListEvent) => e.matches && setOpen(false)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const elevated = scrolled || open
  const bubble = scrolled && !open

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
        bubble
          ? 'bg-transparent'
          : elevated
            ? 'border-b border-border bg-background/85 backdrop-blur-md'
            : 'bg-transparent'
      }`}
    >
      <div
        className={`mx-auto flex max-w-[1240px] items-center justify-between transition-all duration-300 ${
          bubble
            ? 'nav-bubble mt-2 h-16 max-w-[min(1120px,calc(100vw-2rem))] rounded-[1.75rem] border border-border bg-background/85 px-4 shadow-soft-lg backdrop-blur-md sm:px-6'
            : `h-16 max-w-[1240px] px-5 sm:px-8 ${elevated ? 'h-14' : ''}`
        }`}
      >
        <a
          href="/"
          className="flex items-center gap-2.5"
          aria-label="OpenSource Assist home"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent shadow-accent-glow">
            <svg viewBox="0 0 24 24" className="size-5 text-on-accent" aria-hidden="true">
              <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="2.4" />
              <path d="M8.5 11.5 6 19l6-3 6 3-2.5-7.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="text-base font-bold tracking-tight">OpenSource Assist</span>
        </a>

        {/* Desktop links */}
        <nav
          aria-label="Primary"
          className="hidden items-center gap-1 rounded-full border border-border bg-surface px-2 py-1.5 shadow-soft md:flex"
        >
          {links.map((link) => (
            <a key={link.href} href={link.href} className="nav-link" data-active={active === link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenAuth('login')} className="hidden sm:inline-flex">
            Log in
          </Button>
          <Button size="sm" onClick={() => onOpenAuth('signup')}>
            Sign up
          </Button>
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground transition-all duration-200 hover:border-accent hover:text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:hidden"
          >
            <span className="relative block size-5">
              <Menu
                className={`absolute inset-0 size-5 transition-all duration-300 ${open ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`}
                aria-hidden="true"
              />
              <X
                className={`absolute inset-0 size-5 transition-all duration-300 ${open ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}`}
                aria-hidden="true"
              />
            </span>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        id="mobile-nav"
        className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out md:hidden ${
          open ? 'max-h-[420px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="mx-4 mb-3 mt-1 rounded-xl border border-border bg-surface p-3 shadow-soft-lg">
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                aria-current={active === link.href ? 'true' : undefined}
                className={`rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150 hover:bg-accent/10 hover:text-accent-text ${
                  active === link.href ? 'text-accent-text' : 'text-foreground'
                }`}
              >
                {link.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onOpenAuth('login')
              }}
              className="btn-secondary mt-2 w-full"
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onOpenAuth('signup')
              }}
              className="btn-primary w-full"
            >
              Sign up
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Nav
