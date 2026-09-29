import { useState } from 'react'
import {
  ArrowLeft,
  CalendarDays,
  LogOut,
  Menu,
  MessageSquare,
  Shield,
  Users,
  X,
} from 'lucide-react'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import AdminEventsSection from '@/components/admin/AdminEventsSection'
import AdminForumSection from '@/components/admin/AdminForumSection'
import AdminUsersSection from '@/components/admin/AdminUsersSection'
import { useAuthStore } from '@/lib/auth-store'
import { cn } from '@/lib/utils'

interface AdminPageProps {
  onLogout: () => void
}

type AdminSection = 'users' | 'forum' | 'events'

const navItems = [
  { id: 'users' as const, label: 'Users', icon: Users },
  { id: 'forum' as const, label: 'Forum', icon: MessageSquare },
  { id: 'events' as const, label: 'Events', icon: CalendarDays },
]

export default function AdminPage({ onLogout }: AdminPageProps) {
  const user = useAuthStore((state) => state.user)
  const [section, setSection] = useState<AdminSection>('users')
  const [mobileOpen, setMobileOpen] = useState(false)

  if (user?.role !== 'admin') {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background p-6 text-foreground">
        <section className="w-full max-w-md border border-border bg-surface p-6 text-center shadow-soft">
          <Shield className="mx-auto size-8 text-accent-text" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-bold">Administrator access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with an administrator account to access this area.
          </p>
          <a href="/" className="btn-secondary mt-5 inline-flex">
            <ArrowLeft className="size-4" aria-hidden="true" /> Back to app
          </a>
        </section>
      </main>
    )
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex h-16 items-center gap-3 border-b border-border px-5">
        <img src="/cat-logo.png" alt="OpenSource Assist" className="size-8 rounded-md object-cover" />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">OpenSource Assist</p>
          <p className="font-mono text-[10px] uppercase tracking-wider text-accent-text">Admin panel</p>
        </div>
      </div>
      <nav aria-label="Administration" className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const active = item.id === section
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => { setSection(item.id); setMobileOpen(false) }}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors',
                active ? 'bg-accent text-on-accent' : 'text-muted-foreground hover:bg-background hover:text-foreground',
              )}
            >
              <item.icon className="size-4" aria-hidden="true" />
              {item.label}
            </button>
          )
        })}
      </nav>
      <div className="border-t border-border p-3">
        <a href="/" className="btn-secondary h-9 w-full justify-start px-3 text-xs">
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to app
        </a>
        <button type="button" onClick={onLogout} className="btn-secondary mt-2 h-9 w-full justify-start px-3 text-xs">
          <LogOut className="size-4" aria-hidden="true" /> Log out
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-dvh bg-background font-sans text-foreground">
      <div className="flex min-h-dvh">
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 border-r border-border md:block">{sidebar}</aside>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-black/60" />
            <aside className="absolute inset-y-0 left-0 w-72 border-r border-border bg-surface">{sidebar}</aside>
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-border bg-background">
            <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
              <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open menu" className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-surface md:hidden">
                <Menu className="size-4" aria-hidden="true" />
              </button>
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent-text">Administration</p>
                <h1 className="truncate text-sm font-bold">Platform controls</h1>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="hidden max-w-56 truncate rounded-md border border-border bg-surface px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">
                  {user.username || user.email}
                </span>
                <ThemeToggle />
              </div>
              {mobileOpen && <button type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)} className="md:hidden"><X className="size-4" /></button>}
            </div>
          </header>
          <main className="mx-auto w-full max-w-[1280px] flex-1 p-4 sm:p-6 lg:p-8">
            {section === 'users' ? <AdminUsersSection /> : section === 'forum' ? <AdminForumSection /> : <AdminEventsSection />}
          </main>
        </div>
      </div>
    </div>
  )
}