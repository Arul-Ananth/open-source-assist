import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Ban, MessageSquare, RefreshCw, Trash2, UserRoundCheck } from 'lucide-react'
import { Button } from '@/components/ui'
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

const formatDate = (value: string) => new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

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
  const selected = useMemo(() => threads.find((thread) => thread.id === selectedId) ?? null, [threads, selectedId])

  const load = async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const [threadData, banData] = await Promise.all([getAdminForumThreads(token), getForumBans(token)])
      setThreads(threadData.threads)
      setBans(banData.bans)
      setSelectedId((current) => current ?? threadData.threads[0]?.id ?? null)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load forum data') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [token])

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault()
    if (!token) return
    try {
      const created = await createForumThread(token, title.trim(), content.trim())
      setTitle(''); setContent(''); setShowCreate(false)
      await load(); setSelectedId(created.id)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not create the thread') }
  }

  const submitReply = async (event: FormEvent) => {
    event.preventDefault()
    if (!token || !selected || !reply.trim()) return
    try {
      await replyToForumThread(token, selected.id, reply.trim())
      setReply(''); await load(); setSelectedId(selected.id)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not post the reply') }
  }

  const removeThread = async (thread: AdminForumThread) => {
    if (!token || !window.confirm(`Delete “${thread.title}” and all replies?`)) return
    try {
      await deleteAdminForumThread(token, thread.id)
      const remaining = threads.filter((item) => item.id !== thread.id)
      setThreads(remaining); setSelectedId(remaining[0]?.id ?? null)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not delete the thread') }
  }

  const toggleBan = async (userId: string, isBanned: boolean) => {
    if (!token) return
    try {
      if (isBanned) await unbanForumUser(token, userId)
      else await banForumUser(token, userId)
      await load()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update the forum ban') }
  }

  const bannedIds = new Set(bans.map((ban) => ban.user_id))

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="eyebrow">Admin / Forum</p><h2 className="section-h2">Forum moderation</h2><p className="section-body">Review discussions and apply forum-only bans.</p></div>
        <div className="flex gap-2"><Button variant="secondary" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? 'animate-spin' : ''} aria-hidden="true" /> Refresh</Button><Button onClick={() => setShowCreate((open) => !open)}><MessageSquare aria-hidden="true" /> New thread</Button></div>
      </header>
      {error && <p role="alert" className="border border-accent/40 bg-surface p-3 text-sm text-accent-text">{error}</p>}
      {showCreate && <form onSubmit={(event) => void submitCreate(event)} className="grid gap-3 rounded-lg border border-border bg-surface p-4"><label className="grid gap-1.5 text-xs text-muted-foreground">Title<input required minLength={3} maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} className="input-field" /></label><label className="grid gap-1.5 text-xs text-muted-foreground">Opening post<textarea required maxLength={5000} value={content} onChange={(event) => setContent(event.target.value)} className="input-field min-h-24" /></label><div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button><Button type="submit">Create</Button></div></form>}
      <div className="grid min-h-[520px] overflow-hidden rounded-lg border border-border bg-surface lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="border-b border-border lg:border-b-0 lg:border-r"><header className="flex items-center justify-between border-b border-border px-4 py-3"><h3 className="font-mono text-xs font-semibold uppercase tracking-wider">Threads</h3><span className="font-mono text-xs text-muted-foreground">{threads.length}</span></header><div className="max-h-[520px] overflow-y-auto">{loading ? <p className="p-5 text-sm text-muted-foreground">Loading…</p> : threads.map((thread) => <button key={thread.id} type="button" onClick={() => setSelectedId(thread.id)} className={`w-full border-b border-border px-4 py-3 text-left ${thread.id === selectedId ? 'bg-accent text-on-accent' : 'hover:bg-background'}`}><span className="block line-clamp-2 text-sm font-semibold">{thread.title}</span><span className="mt-1 block text-xs opacity-75">{thread.author_username || thread.author_email} · {Math.max(0, thread.replies.length - 1)} replies</span></button>)}{!loading && threads.length === 0 && <p className="p-5 text-sm text-muted-foreground">No threads yet.</p>}</div></aside>
        <div className="flex min-w-0 flex-col">{selected ? <>
          <header className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="font-semibold">{selected.title}</h3><p className="mt-1 text-xs text-muted-foreground">Started by {selected.author_username || selected.author_email} · {formatDate(selected.created_at)}</p></div><Button variant="outline" size="sm" onClick={() => void removeThread(selected)}><Trash2 aria-hidden="true" /> Delete</Button></header>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">{selected.replies.map((post) => { const banned = bannedIds.has(post.author_id) || post.banned; return <article key={post.id} className="rounded-md border border-border bg-background p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold">{post.author_username || post.author_email}</p><p className="mt-1 text-xs text-muted-foreground">{formatDate(post.created_at)}{banned ? ' · Forum-banned' : ''}</p></div><Button variant="secondary" size="sm" onClick={() => void toggleBan(post.author_id, banned)}>{banned ? <UserRoundCheck aria-hidden="true" /> : <Ban aria-hidden="true" />}{banned ? 'Unban' : 'Ban'}</Button></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{banned ? '[Content from a forum-banned user]' : post.content}</p></article>})}</div>
          <form onSubmit={(event) => void submitReply(event)} className="flex gap-2 border-t border-border p-3"><input value={reply} onChange={(event) => setReply(event.target.value)} maxLength={5000} placeholder="Reply as admin…" className="input-field min-w-0 flex-1" /><Button type="submit" disabled={!reply.trim()}>Reply</Button></form>
        </> : <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">Select a thread to moderate.</div>}</div>
      </div>
      <p className="flex items-center gap-2 text-xs text-muted-foreground"><Ban className="size-3.5 text-accent-text" aria-hidden="true" />{bans.length} active forum-only bans</p>
    </section>
  )
}