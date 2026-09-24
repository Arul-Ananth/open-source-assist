import * as React from 'react'
import { GitBranch } from 'lucide-react'
import { FOOTER_COLUMNS, type FooterColumn } from '@/data'
import { cn } from '@/lib/utils'

export type { FooterColumn, FooterLink } from '@/data'

export interface SocialLink {
  label: string
  href: string
  icon?: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>
}

export interface FooterProps {
  /**
   * Layout variant:
   * - 'full': Complete multi-column footer with brand description, navigation links, and copyright.
   * - 'compact': Minimal horizontal footer suitable for focused flows, dashboards, or sub-pages.
   */
  variant?: 'full' | 'compact'
  columns?: FooterColumn[]
  brandName?: string
  brandHref?: string
  description?: string
  copyright?: string
  socialLink?: SocialLink | false
  className?: string
}

export function Footer({
  variant = 'full',
  columns = FOOTER_COLUMNS,
  brandName = 'OpenSource Assist',
  brandHref = '/',
  description = 'Free and open source. Built by people who still remember how intimidating their first issue looked.',
  copyright = 'Made slowly, with care, by the open source community.',
  socialLink = {
    label: 'Star on GitHub',
    href: 'https://github.com',
    icon: GitBranch,
  },
  className,
}: FooterProps) {
  const SocialIcon = socialLink && socialLink.icon ? socialLink.icon : GitBranch

  if (variant === 'compact') {
    return (
      <footer className={cn('border-t border-border bg-surface', className)}>
        <div className="mx-auto flex max-w-[1240px] flex-col items-center justify-between gap-4 px-5 py-6 sm:flex-row sm:px-8">
          <a href={brandHref} className="flex items-center gap-2.5" aria-label={`${brandName} home`}>
            <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true">
              <rect width="32" height="32" rx="4" fill="#ff8c00" />
              <circle cx="16" cy="14" r="6.5" fill="none" stroke="#0d1117" strokeWidth="3.5" />
              <rect x="13" y="20" width="6" height="6" rx="1" fill="#0d1117" />
            </svg>
            <span className="text-sm font-semibold tracking-tight">{brandName}</span>
          </a>
          <p className="text-xs text-muted-foreground">{copyright}</p>
          {socialLink && (
            <a
              href={socialLink.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <SocialIcon className="size-4" aria-hidden="true" />
              {socialLink.label}
            </a>
          )}
        </div>
      </footer>
    )
  }

  return (
    <footer className={cn('border-t border-border bg-surface', className)}>
      <div className="mx-auto max-w-[1240px] px-5 py-14 sm:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div>
            <a href={brandHref} className="flex items-center gap-2.5" aria-label={`${brandName} home`}>
              <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
                <rect width="32" height="32" rx="4" fill="#ff8c00" />
                <circle cx="16" cy="14" r="6.5" fill="none" stroke="#0d1117" strokeWidth="3.5" />
                <rect x="13" y="20" width="6" height="6" rx="1" fill="#0d1117" />
              </svg>
              <span className="text-[15px] font-semibold tracking-tight">{brandName}</span>
            </a>
            {description && (
              <p className="mt-4 max-w-[38ch] text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            )}
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
          <p className="text-xs text-muted-foreground">{copyright}</p>
          {socialLink && (
            <div className="flex items-center gap-3">
              <a
                href={socialLink.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <SocialIcon className="size-4" aria-hidden="true" />
                {socialLink.label}
              </a>
            </div>
          )}
        </div>
      </div>
    </footer>
  )
}

export default Footer
