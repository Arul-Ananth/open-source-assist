import { useEffect, useState } from 'react'
import { RefreshCw, Search, Shield, ShieldOff, UserMinus, UserPlus, UserRoundX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore, type UserRole, type AccountStatus } from '@/lib/auth-store'
import { deleteAdminUser, getAdminUsers, updateAdminUser, type AdminUser } from '@/lib/admin-api'

const statusCopy: Record<AccountStatus, string> = {
  active: 'Active',
  suspended: 'Suspended',
  banned: 'Banned',
}

export default function AdminUsersSection() {
  const token = useAuthStore((s) => s.token)
  const currentUserId = useAuthStore((s) => s.user?.id)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadUsers = async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const data = await getAdminUsers(token, search)
      setUsers(data.users)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadUsers()
  }, [])

  const update = async (user: AdminUser, patch: { role?: UserRole; account_status?: AccountStatus }) => {
    if (!token) return
    setBusyId(user.id)
    setError(null)
    try {
      const updated = await updateAdminUser(token, user.id, patch)
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the user')
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (user: AdminUser) => {
    if (!token) return
    const confirmed = window.confirm(
      `Remove ${user.username || user.email}? This permanently deletes the account and cannot be undone.`,
    )
    if (!confirmed) return

    setBusyId(user.id)
    setError(null)
    try {
      await deleteAdminUser(token, user.id)
      setUsers((current) => current.filter((item) => item.id !== user.id))
      setTotal((value) => Math.max(0, value - 1))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove the user')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent-text">Admin / Users</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Users</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Control account roles and moderation status. Removal is permanent.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadUsers()}
          disabled={loading}
          className="inline-flex h-9 items-center justify-center gap-2 border border-border bg-surface px-3 text-xs font-semibold text-foreground shadow-none transition-all hover:border-accent hover:shadow-[3px_3px_0px_0px_var(--color-border)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void loadUsers()
            }}
            placeholder="Search username or email"
            className="input-field pl-9 shadow-none"
          />
        </div>
        <button
          type="button"
          onClick={() => void loadUsers()}
          className="h-10 border border-border bg-accent px-5 text-sm font-semibold text-on-accent shadow-none transition-all hover:bg-accent-hover hover:shadow-[3px_3px_0px_0px_var(--color-border)]"
        >
          Search
        </button>
      </div>

      {error && (
        <div role="alert" className="border border-accent bg-surface p-3 text-sm text-accent-text shadow-none">
          {error}
        </div>
      )}

      <div className="border border-border bg-surface shadow-none">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-mono text-xs font-semibold uppercase tracking-wider">User list</p>
          <span className="font-mono text-[11px] text-muted-foreground">{total} total</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-background text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const busy = busyId === user.id
                const isSelf = currentUserId === user.id
                return (
                  <tr key={user.id} className="border-b border-border last:border-0 hover:bg-background">
                    <td className="px-4 py-4 align-top">
                      <div className="min-w-0">
                        <p className="font-semibold">{user.username || 'Unnamed user'}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <span className={cn(
                        'inline-flex items-center gap-1 border px-2 py-1 font-mono text-[10px] font-semibold',
                        user.role === 'admin' ? 'border-accent bg-accent text-on-accent' : 'border-border bg-background text-muted-foreground',
                      )}>
                        {user.role === 'admin' ? <Shield className="size-3" /> : <UserRoundX className="size-3" />}
                        {user.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <span className={cn(
                        'inline-flex border px-2 py-1 font-mono text-[10px] font-semibold',
                        user.account_status === 'active' && 'border-border bg-background text-foreground',
                        user.account_status === 'suspended' && 'border-accent bg-surface text-accent-text',
                        user.account_status === 'banned' && 'border-accent bg-accent text-on-accent',
                      )}>
                        {statusCopy[user.account_status]}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-top text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(user.created_at))}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex flex-wrap justify-end gap-2">
                        {user.role !== 'admin' && (
                          <ActionButton
                            label="Promote"
                            icon={UserPlus}
                            disabled={busy || isSelf}
                            onClick={() => void update(user, { role: 'admin' })}
                          />
                        )}
                        {user.account_status === 'active' ? (
                          <>
                            <ActionButton
                              label="Suspend"
                              icon={ShieldOff}
                              disabled={busy || isSelf}
                              onClick={() => void update(user, { account_status: 'suspended' })}
                            />
                            <ActionButton
                              label="Ban"
                              icon={UserMinus}
                              disabled={busy || isSelf}
                              onClick={() => void update(user, { account_status: 'banned' })}
                            />
                          </>
                        ) : (
                          <ActionButton
                            label="Restore"
                            icon={Shield}
                            disabled={busy || isSelf}
                            onClick={() => void update(user, { account_status: 'active' })}
                          />
                        )}
                        <ActionButton
                          label="Remove"
                          icon={UserRoundX}
                          danger
                          disabled={busy || isSelf}
                          onClick={() => void remove(user)}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {!loading && users.length === 0 && (
          <div className="p-10 text-center text-sm text-muted-foreground">No users matched this search.</div>
        )}
        {loading && <div className="p-10 text-center text-sm text-muted-foreground">Loading users…</div>}
      </div>
    </section>
  )
}

function ActionButton({ label, icon: Icon, danger = false, disabled, onClick }: {
  label: string
  icon: typeof UserPlus
  danger?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 border px-2.5 text-[11px] font-semibold shadow-none transition-all disabled:cursor-not-allowed disabled:opacity-40',
        danger
          ? 'border-accent bg-surface text-accent-text hover:bg-accent hover:text-on-accent hover:shadow-[3px_3px_0px_0px_var(--color-border)]'
          : 'border-border bg-background text-foreground hover:border-accent hover:text-accent-text hover:shadow-[3px_3px_0px_0px_var(--color-border)]',
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  )
}
