import { GitBranch } from 'lucide-react'

interface FooterLink {
  label: string
  href: string
  external?: boolean
}

const columns: { heading: string; links: FooterLink[] }[] = [
  {
    heading: 'Modules',
    links: [
      { label: 'Explore', href: '#finder' },
      { label: 'AI Roadmap', href: '#modules' },
      { label: 'Quests & Rewards', href: '#modules' },
      { label: 'Events', href: '#modules' },
    ],
  },
  {
    heading: 'Community',
    links: [
      { label: 'Forum', href: '#modules' },
      { label: 'GitHub', href: 'https://github.com', external: true },
      { label: 'Discord', href: 'https://discord.com', external: true },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Profile overview', href: '#modules' },
      { label: 'AI chatbot', href: '#modules' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-[1240px] px-5 py-14 sm:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div>
            <a href="#top" className="flex items-center gap-2.5" aria-label="OpenSource Assist home">
              <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
                <rect width="32" height="32" rx="4" fill="#ff8c00" />
                <circle cx="16" cy="14" r="6.5" fill="none" stroke="#0d1117" strokeWidth="3.5" />
                <rect x="13" y="20" width="6" height="6" rx="1" fill="#0d1117" />
              </svg>
              <span className="text-[15px] font-semibold tracking-tight">OpenSource Assist</span>
            </a>
            <p className="mt-4 max-w-[38ch] text-sm leading-relaxed text-muted-foreground">
              Free and open source. Built by people who still remember how
              intimidating their first issue looked.
            </p>
          </div>

          {columns.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                {column.heading}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target={link.external ? '_blank' : undefined}
                      rel={link.external ? 'noreferrer' : undefined}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">Made slowly, with care, by the open source community.</p>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <GitBranch className="size-4" aria-hidden="true" />
              Star on GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
