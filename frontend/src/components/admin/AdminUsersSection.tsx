import { useEffect, useState } from 'react'
import { RefreshCw, Search, Shield, UserMinus, UserPlus, UserRoundX } from 'lucide-react'
import { Button } from '@/components/ui'
import { useAuthStore, type AccountStatus, type UserRole } from '@/lib/auth-store'
import {
  AdminApiUnavailableError,
  deleteAdminUser,
  getAdminUsers,
  updateAdminUser,
  type AdminUser,
} from '@/lib/admin-api'

const statusLabels: Record<AccountStatus, string> = {
  active: 'Active',
  suspended: 'Suspended',
  banned: 'Banned',
}

export default function AdminUsersSection() {
  const token = useAuthStore((state) => state.token)
  const currentUserId = useAuthStore((state) => state.user?.id)
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
      const result = await getAdminUsers(token, search)
      setUsers(result.users)
      setTotal(result.total)
    } catch (reason) {
      setError(reason instanceof AdminApiUnavailableError
        ? 'The administrator API is unavailable. Start the backend and check the frontend proxy.'
        : reason instanceof Error ? reason.message : 'Could not load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadUsers() }, [token])

  const update = async (user: AdminUser, patch: { role?: UserRole; account_status?: AccountStatus }) => {
    if (!token) return
    setBusyId(user.id)
    setError(null)
    try {
      const updated = await updateAdminUser(token, user.id, patch)
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update the account')
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (user: AdminUser) => {
    if (!token || !window.confirm(`Permanently delete ${user.username || user.email}?`)) return
    setBusyId(user.id)
    setError(null)
    try {
      await deleteAdminUser(token, user.id)
      setUsers((current) => current.filter((item) => item.id !== user.id))
      setTotal((current) => Math.max(0, current - 1))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not delete the account')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Admin / Users</p>
          <h2 className="section-h2">Users</h2>
          <p className="section-body">Manage persisted roles and account access.</p>
        </div>
        <Button variant="secondary" onClick={() => void loadUsers()} disabled={loading}>
          <RefreshCw className={loading ? 'animate-spin' : ''} aria-hidden="true" /> Refresh
        </Button>
      </header>

      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); void loadUsers() }}>
        <label className="relative flex-1">
          <span className="sr-only">Search by username or email</span>
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search username or email" className="input-field pl-9" />
        </label>
        <Button type="submit">Search</Button>
      </form>

      {error && <p role="alert" className="border border-accent/40 bg-surface p-3 text-sm text-accent-text">{error}</p>}

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="font-mono text-xs font-semibold uppercase tracking-wider">User list</h3>
          <span className="font-mono text-xs text-muted-foreground">{total} total</span>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead><tr className="border-b border-border bg-background text-[11px] uppercase text-muted-foreground">
              <th className="px-4 py-3">Account</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Created</th><th className="px-4 py-3 text-right">Actions</th>
            </tr></thead>
            <tbody>
              {users.map((user) => {
                const busy = busyId === user.id
                const self = user.id === currentUserId
                return <tr key={user.id} className="border-b border-border last:border-0 hover:bg-background">
                  <td className="px-4 py-3"><p className="font-semibold">{user.username || 'Unnamed user'}</p><p className="text-xs text-muted-foreground">{user.email}</p></td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 rounded border border-border px-2 py-1 text-xs"><Shield className="size-3.5 text-accent-text" aria-hidden="true" />{user.role}</span></td>
                  <td className="px-4 py-3 text-xs">{statusLabels[user.account_status]}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(user.created_at))}</td>
                  <td className="px-4 py-3"><div className="flex justify-end gap-1.5">
                    {user.role === 'user' && <Button variant="secondary" size="sm" disabled={busy || self} onClick={() => void update(user, { role: 'admin' })}><UserPlus aria-hidden="true" /> Promote</Button>}
                    {user.role === 'admin' && <Button variant="secondary" size="sm" disabled={busy || self} onClick={() => void update(user, { role: 'user' })}><Shield aria-hidden="true" /> Demote</Button>}
                    {user.account_status === 'active' ? <>
                      <Button variant="outline" size="sm" disabled={busy || self} onClick={() => void update(user, { account_status: 'suspended' })}>Suspend</Button>
                      <Button variant="outline" size="sm" disabled={busy || self} onClick={() => void update(user, { account_status: 'banned' })}><UserMinus aria-hidden="true" /> Ban</Button>
                    </> : <Button variant="secondary" size="sm" disabled={busy || self} onClick={() => void update(user, { account_status: 'active' })}>Restore</Button>}
                    <Button variant="outline" size="sm" disabled={busy || self} onClick={() => void remove(user)} aria-label={`Delete ${user.email}`}><UserRoundX aria-hidden="true" /></Button>
                  </div></td>
                </tr>
              })}
            </tbody>
          </table>
        </div>
        {loading && <p className="p-8 text-center text-sm text-muted-foreground">Loading users…</p>}
        {!loading && !error && users.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No matching users.</p>}
      </section>
    </section>
  )
}