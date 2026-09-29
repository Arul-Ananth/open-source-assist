import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Ban, MessageSquare, RefreshCw, Trash2, UserRoundCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/auth-store'
import { createForumThread, replyToForumThread } from '@/lib/forum-api'
import { banForumUser, deleteAdminForumThread, getAdminForumThreads, getForumBans, unbanForumUser, type AdminForumThread, type ForumBan } from '@/lib/admin-api'

const formatDate = (value: string) => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load forum data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [token])

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault()
    if (!token || !title.trim() || !content.trim()) return
    setError(null)
    try {
      const created = await createForumThread(token, title.trim(), content.trim())
      setTitle('')
      setContent('')
      setShowCreate(false)
      await load()
      setSelectedId(created.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the thread')
    }
  }

  const submitReply = async (event: FormEvent) => {
    event.preventDefault()
    if (!token || !selected || !reply.trim()) return
    setError(null)
    try {
      await replyToForumThread(token, selected.id, reply.trim())
      setReply('')
      await load()
      setSelectedId(selected.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post the reply')
    }
  }

  const removeThread = async (thread: AdminForumThread) => {
    if (!token || !window.confirm(`Delete “${thread.title}” and all replies?`)) return
    try {
      await deleteAdminForumThread(token, thread.id)
      const next = threads.filter((item) => item.id !== thread.id)
      setThreads(next)
      setSelectedId(next[0]?.id ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the thread')
    }
  }

  const toggleBan = async (userId: string, isBanned: boolean) => {
    if (!token) return
    try {
      if (isBanned) await unbanForumUser(token, userId)
      else await banForumUser(token, userId)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the forum ban')
    }
  }

  const bannedIds = new Set(bans.map((ban) => ban.user_id))

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="font-mono text-xs uppercase tracking-[0.18em] text-accent-text">Admin / Forum</p><h1 className="mt-2 text-2xl font-bold tracking-tight">Forum moderation</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Threads and moderation state are stored in PostgreSQL.</p></div>
        <div className="flex gap-2"><button type="button" onClick={() => void load()} className="inline-flex h-9 items-center gap-2 border border-border bg-surface px-3 text-xs font-semibold shadow-none hover:border-accent hover:shadow-[3px_3px_0px_0px_var(--color-border)]"><RefreshCw className="size-3.5" /> Refresh</button><button type="button" onClick={() => setShowCreate((open) => !open)} className="inline-flex h-9 items-center gap-2 border border-accent bg-accent px-3 text-xs font-semibold text-on-accent shadow-none hover:bg-accent-hover hover:shadow-[3px_3px_0px_0px_var(--color-border)]"><MessageSquare className="size-3.5" /> Create thread</button></div>
      </div>

      {error && <div className="border border-accent bg-surface p-3 text-sm text-accent-text shadow-none">{error}</div>}

      {showCreate && <form onSubmit={(event) => void submitCreate(event)} className="border border-border bg-surface p-5 shadow-none"><div className="grid gap-4"><label className="grid gap-2"><span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Title</span><input required value={title} onChange={(event) => setTitle(event.target.value)} className="input-field shadow-none" placeholder="Start a forum discussion" /></label><label className="grid gap-2"><span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Opening message</span><textarea required value={content} onChange={(event) => setContent(event.target.value)} className="min-h-28 w-full border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-accent" placeholder="Write the first message…" /></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowCreate(false)} className="h-9 border border-border bg-background px-4 text-xs font-semibold shadow-none hover:border-accent">Cancel</button><button type="submit" className="h-9 border border-accent bg-accent px-4 text-xs font-semibold text-on-accent shadow-none hover:bg-accent-hover">Create</button></div></div></form>}

      <div className="grid min-h-[620px] overflow-hidden border border-border bg-surface shadow-none lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="border-b border-border lg:border-b-0 lg:border-r"><div className="flex items-center justify-between border-b border-border px-4 py-3"><p className="font-mono text-xs font-semibold uppercase tracking-wider">Threads</p><span className="font-mono text-[10px] text-muted-foreground">{threads.length}</span></div><div className="max-h-[560px] overflow-y-auto">{loading ? <div className="p-6 text-sm text-muted-foreground">Loading…</div> : threads.map((thread) => <button key={thread.id} type="button" onClick={() => setSelectedId(thread.id)} className={cn('w-full border-b border-border px-4 py-4 text-left transition-colors', thread.id === selectedId ? 'bg-accent text-on-accent' : 'hover:bg-background')}><p className="line-clamp-2 text-sm font-semibold">{thread.title}</p><p className={cn('mt-1 text-[11px]', thread.id === selectedId ? 'text-on-accent/80' : 'text-muted-foreground')}>{thread.author_username || thread.author_email} · {Math.max(0, thread.replies.length - 1)} replies</p></button>)}{!loading && threads.length === 0 && <div className="p-6 text-sm text-muted-foreground">No threads yet.</div>}</div></aside>

        <div className="flex min-w-0 flex-col">{selected ? <><header className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><h2 className="text-base font-semibold">{selected.title}</h2><p className="mt-1 text-xs text-muted-foreground">Started by {selected.author_username || selected.author_email} · {formatDate(selected.created_at)}</p></div><button type="button" onClick={() => void removeThread(selected)} className="inline-flex h-8 items-center gap-1.5 border border-accent bg-surface px-2.5 text-xs font-semibold text-accent-text shadow-none hover:bg-accent hover:text-on-accent hover:shadow-[3px_3px_0px_0px_var(--color-border)]"><Trash2 className="size-3.5" /> Delete</button></header><div className="flex-1 space-y-4 overflow-y-auto p-5">{selected.replies.map((item) => <ForumMessage key={item.id} author={item.author_username || item.author_email} content={item.content} createdAt={item.created_at} banned={bannedIds.has(item.author_id) || item.banned} onToggleBan={() => void toggleBan(item.author_id, bannedIds.has(item.author_id) || item.banned)} />)}</div><form onSubmit={(event) => void submitReply(event)} className="border-t border-border p-4"><div className="flex gap-2"><input value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Reply as admin…" className="input-field flex-1 shadow-none" /><button type="submit" disabled={!reply.trim()} className="inline-flex h-10 items-center gap-2 border border-accent bg-accent px-4 text-xs font-semibold text-on-accent shadow-none hover:bg-accent-hover"><MessageSquare className="size-3.5" /> Reply</button></div></form></> : <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">Select a thread to moderate.</div>}</div>
      </div>

      <div className="flex items-center gap-2 border border-border bg-background px-4 py-3 text-xs text-muted-foreground shadow-none"><Ban className="size-3.5 text-accent-text" />{bans.length} forum ban{bans.length === 1 ? '' : 's'} stored in PostgreSQL</div>
    </section>
  )
}

function ForumMessage({ author, content, createdAt, banned, onToggleBan }: { author: string; content: string; createdAt: string; banned: boolean; onToggleBan: () => void }) {
  return <article className={cn('border border-border bg-background p-4 shadow-none', banned && 'border-accent')}><div className="flex items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{author}</p>{banned && <span className="border border-accent bg-accent px-2 py-0.5 font-mono text-[10px] font-semibold text-on-accent">BANNED</span>}</div><p className="mt-1 text-[11px] text-muted-foreground">{formatDate(createdAt)}</p></div><button type="button" onClick={onToggleBan} className="inline-flex h-8 shrink-0 items-center gap-1.5 border border-border bg-surface px-2.5 text-[11px] font-semibold shadow-none hover:border-accent hover:text-accent-text hover:shadow-[3px_3px_0px_0px_var(--color-border)]">{banned ? <UserRoundCheck className="size-3.5" /> : <Ban className="size-3.5" />}{banned ? 'Unban' : 'Ban'}</button></div><p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-foreground">{banned ? '[Content from a banned forum user]' : content}</p></article>
}
