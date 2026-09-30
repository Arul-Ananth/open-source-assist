import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Ban, MessageSquare, Plus, RefreshCw, Trash2, UserRoundCheck, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/auth-store'
import { createForumThread, replyToForumThread } from '@/lib/forum-api'
import {
  banForumUser,
  deleteAdminForumThread,
  getAdminForumThreads,
  getForumBans,
  unbanForumUser,
  type AdminForumThread,
  type ForumBan,
} from '@/lib/admin-api'

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

export default function AdminForumSection() {
  const token = useAuthStore((state) => state.token)
  const [threads, setThreads] = useState<AdminForumThread[]>([])
  const [bans, setBans] = useState<ForumBan[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [reply, setReply] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const selected = useMemo(
    () => threads.find((thread) => thread.id === selectedId) ?? null,
    [threads, selectedId],
  )

  const load = async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const [threadData, banData] = await Promise.all([
        getAdminForumThreads(token),
        getForumBans(token),
      ])
      setThreads(threadData.threads)
      setBans(banData.bans)
      setSelectedId((current) => current ?? threadData.threads[0]?.id ?? null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load forum data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [token])

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault()
    if (!token) return
    const cleanTitle = title.trim()
    const cleanContent = content.trim()
    if (!cleanTitle || !cleanContent) return

    try {
      const created = await createForumThread(token, cleanTitle, cleanContent)
      setTitle('')
      setContent('')
      setShowCreate(false)
      await load()
      setSelectedId(created.id)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not create the thread')
    }
  }

  const submitReply = async (event: FormEvent) => {
    event.preventDefault()
    if (!token || !selected || !reply.trim()) return
    try {
      await replyToForumThread(token, selected.id, reply.trim())
      setReply('')
      await load()
      setSelectedId(selected.id)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not post the reply')
    }
  }

  const removeThread = async (thread: AdminForumThread) => {
    if (!token || !window.confirm(`Delete “${thread.title}” and all replies?`)) return
    try {
      await deleteAdminForumThread(token, thread.id)
      const remaining = threads.filter((item) => item.id !== thread.id)
      setThreads(remaining)
      setSelectedId(remaining[0]?.id ?? null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not delete the thread')
    }
  }

  const toggleBan = async (userId: string, isBanned: boolean) => {
    if (!token) return
    try {
      if (isBanned) await unbanForumUser(token, userId)
      else await banForumUser(token, userId)
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update the forum ban')
    }
  }

  const bannedIds = new Set(bans.map((ban) => ban.user_id))

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent-text">Admin / Forum</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Forum moderation</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Review discussions, remove inappropriate topics, and apply forum-only bans.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex h-9 items-center justify-center gap-2 border border-border bg-surface px-3 text-xs font-semibold text-foreground shadow-none transition-all hover:border-accent hover:shadow-[3px_3px_0px_0px_var(--color-border)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowCreate((open) => !open)}
            className="inline-flex h-9 items-center gap-2 border border-accent bg-accent px-3 text-xs font-semibold text-on-accent shadow-none hover:bg-accent-hover hover:shadow-[3px_3px_0px_0px_var(--color-border)]"
          >
            <Plus className="size-3.5" /> New thread
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="border border-accent bg-surface p-3 text-sm text-accent-text shadow-none">
          {error}
        </div>
      )}

      {showCreate && (
        <form onSubmit={(e) => void submitCreate(e)} className="border border-border bg-surface p-5 shadow-none">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <p className="font-mono text-xs font-semibold uppercase tracking-wider">Create thread</p>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              aria-label="Close form"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-1.5 text-xs text-muted-foreground">
              Thread title
              <input
                required
                minLength={3}
                maxLength={200}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Enter thread title"
                className="input-field shadow-none"
              />
            </label>
            <label className="grid gap-1.5 text-xs text-muted-foreground">
              Opening post
              <textarea
                required
                maxLength={5000}
                rows={5}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Write your discussion prompt or announcement"
                className="input-field h-auto py-3 shadow-none"
              />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="h-9 border border-border bg-background px-4 text-xs font-semibold shadow-none hover:border-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-9 border border-accent bg-accent px-4 text-xs font-semibold text-on-accent shadow-none hover:bg-accent-hover hover:shadow-[3px_3px_0px_0px_var(--color-border)]"
            >
              Create
            </button>
          </div>
        </form>
      )}

      <div className="grid min-h-[620px] overflow-hidden border border-border bg-surface shadow-none lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="border-b border-border lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="font-mono text-xs font-semibold uppercase tracking-wider">Threads</p>
            <span className="font-mono text-[10px] text-muted-foreground">{threads.length}</span>
          </div>
          <div className="max-h-[560px] overflow-y-auto">
            {threads.map((thread) => {
              const active = thread.id === selectedId
              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => setSelectedId(thread.id)}
                  className={cn(
                    'w-full border-b border-border px-4 py-4 text-left transition-colors',
                    active ? 'bg-accent text-on-accent' : 'hover:bg-background',
                  )}
                >
                  <p className="line-clamp-2 text-sm font-semibold">{thread.title}</p>
                  <p className={cn('mt-1 text-[11px]', active ? 'text-on-accent/80' : 'text-muted-foreground')}>
                    {thread.author_username || thread.author_email} · {Math.max(0, thread.replies.length - 1)} replies
                  </p>
                </button>
              )
            })}
            {threads.length === 0 && !loading && (
              <div className="p-6 text-sm text-muted-foreground">No threads yet.</div>
            )}
            {loading && <div className="p-6 text-sm text-muted-foreground">Loading threads…</div>}
          </div>
        </aside>

        <div className="flex min-w-0 flex-col">
          {selected ? (
            <>
              <header className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold">{selected.title}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Started by {selected.author_username || selected.author_email} · {formatDate(selected.created_at)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void removeThread(selected)}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 border border-accent bg-surface px-2.5 text-xs font-semibold text-accent-text shadow-none hover:bg-accent hover:text-on-accent hover:shadow-[3px_3px_0px_0px_var(--color-border)]"
                >
                  <Trash2 className="size-3.5" /> Delete
                </button>
              </header>

              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                {selected.replies.map((post) => {
                  const isBanned = bannedIds.has(post.author_id) || post.banned
                  return (
                    <article
                      key={post.id}
                      className={cn('border border-border bg-background p-4 shadow-none', isBanned && 'border-accent')}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold">{post.author_username || post.author_email}</p>
                            {isBanned && (
                              <span className="border border-accent bg-accent px-2 py-0.5 font-mono text-[10px] font-semibold text-on-accent">
                                BANNED
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">{formatDate(post.created_at)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void toggleBan(post.author_id, isBanned)}
                          className="inline-flex h-8 shrink-0 items-center gap-1.5 border border-border bg-surface px-2.5 text-[11px] font-semibold shadow-none hover:border-accent hover:text-accent-text hover:shadow-[3px_3px_0px_0px_var(--color-border)]"
                        >
                          {isBanned ? <UserRoundCheck className="size-3.5" /> : <Ban className="size-3.5" />}
                          {isBanned ? 'Unban' : 'Ban'}
                        </button>
                      </div>
                      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-foreground">
                        {isBanned ? '[Content from a forum-banned user]' : post.content}
                      </p>
                    </article>
                  )
                })}
              </div>

              <form onSubmit={(e) => void submitReply(e)} className="border-t border-border p-4">
                <div className="flex gap-2">
                  <input
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    maxLength={5000}
                    placeholder="Reply as admin…"
                    className="input-field flex-1 shadow-none"
                  />
                  <button
                    type="submit"
                    disabled={!reply.trim()}
                    className="inline-flex h-10 items-center gap-2 border border-accent bg-accent px-4 text-xs font-semibold text-on-accent shadow-none hover:bg-accent-hover hover:shadow-[3px_3px_0px_0px_var(--color-border)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <MessageSquare className="size-3.5" /> Reply
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
              Select a thread to moderate.
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 border border-border bg-background px-4 py-3 text-xs text-muted-foreground shadow-none">
        <Ban className="size-3.5 text-accent-text" />
        {bans.length} active forum-only ban{bans.length === 1 ? '' : 's'}
        {bans.length > 0 && (
          <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
            <UserRoundCheck className="size-3" /> Click unban on any message to restore access
          </span>
        )}
      </div>
    </section>
  )
}
