import { useState } from 'react'
import { ArrowLeft, CalendarDays, LogOut, Menu, MessageSquare, Shield, Users, X } from 'lucide-react'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { useAuthStore } from '@/lib/auth-store'
import { cn } from '@/lib/utils'
import AdminUsersSection from '@/components/admin/AdminUsersSection'
import AdminForumSection from '@/components/admin/AdminForumSection'
import AdminEventsSection from '@/components/admin/AdminEventsSection'

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
  const user = useAuthStore((s) => s.user)
  const [section, setSection] = useState<AdminSection>('users')
  const [mobileOpen, setMobileOpen] = useState(false)

  if (user?.role !== 'admin') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-6 text-foreground">
        <div className="w-full max-w-md border border-border bg-surface p-6 text-center shadow-none">
          <Shield className="mx-auto size-8 text-accent-text" />
          <h1 className="mt-4 text-xl font-bold">Administrator access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your account is not marked as an administrator.</p>
          <a href="/" className="mt-5 inline-flex h-9 items-center gap-2 border border-border bg-background px-4 text-xs font-semibold shadow-none hover:border-accent hover:shadow-[3px_3px_0px_0px_var(--color-border)]"><ArrowLeft className="size-3.5" /> Back to app</a>
        </div>
      </div>
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
                'flex w-full items-center gap-3 border px-3 py-2.5 text-sm font-semibold shadow-none transition-all',
                active ? 'border-accent bg-accent text-on-accent' : 'border-transparent text-muted-foreground hover:border-border hover:bg-background hover:text-foreground hover:shadow-[3px_3px_0px_0px_var(--color-border)]',
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </button>
          )
        })}
      </nav>
      <div className="border-t border-border p-3">
        <a href="/" className="flex h-9 items-center gap-2 border border-border bg-background px-3 text-xs font-semibold shadow-none hover:border-accent hover:shadow-[3px_3px_0px_0px_var(--color-border)]">
          <ArrowLeft className="size-3.5" /> Back to app
        </a>
        <button type="button" onClick={onLogout} className="mt-2 flex h-9 w-full items-center gap-2 border border-border bg-surface px-3 text-xs font-semibold text-muted-foreground shadow-none hover:border-accent hover:text-foreground hover:shadow-[3px_3px_0px_0px_var(--color-border)]">
          <LogOut className="size-3.5" /> Log out
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-dvh bg-background font-sans text-foreground">
      <div className="flex min-h-dvh">
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-border md:block">{sidebar}</aside>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-black/60" />
            <aside className="absolute inset-y-0 left-0 w-72 border-r border-border bg-surface">{sidebar}</aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-border bg-background">
            <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
              <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open menu" className="inline-flex h-9 w-9 items-center justify-center border border-border bg-surface md:hidden">
                <Menu className="size-4" />
              </button>
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent-text">Administration</p>
                <h1 className="truncate text-sm font-bold">Platform controls</h1>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="hidden border border-border bg-surface px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">{user.username || user.email}</span>
                <ThemeToggle />
              </div>
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
