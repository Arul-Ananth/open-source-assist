import { FormEvent, useMemo, useState } from 'react'
import { Ban, MessageSquare, Plus, Trash2, UserRoundCheck, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ForumReply {
  id: number
  author: string
  content: string
  createdAt: string
}

interface ForumThread {
  id: number
  title: string
  author: string
  createdAt: string
  replies: ForumReply[]
}

const THREADS_KEY = 'osa-admin-forum-threads'
const BANS_KEY = 'osa-admin-forum-bans'

const initialThreads: ForumThread[] = [
  {
    id: 1,
    title: 'How do I choose a good first issue?',
    author: 'arun_dev',
    createdAt: '2026-09-24T10:20:00Z',
    replies: [
      { id: 11, author: 'meera_codes', content: 'Start with labels such as good first issue and documentation.', createdAt: '2026-09-24T11:04:00Z' },
      { id: 12, author: 'arun_dev', content: 'That helps, thanks. I will also read the contributing guide first.', createdAt: '2026-09-24T11:20:00Z' },
    ],
  },
  {
    id: 2,
    title: 'Share useful open-source learning resources',
    author: 'dev_rahul',
    createdAt: '2026-09-23T15:30:00Z',
    replies: [
      { id: 21, author: 'foss_nila', content: 'The GitHub Skills courses are a practical starting point.', createdAt: '2026-09-23T16:10:00Z' },
    ],
  },
  {
    id: 3,
    title: 'Maintainer etiquette when opening PRs',
    author: 'open_source_learner',
    createdAt: '2026-09-22T09:45:00Z',
    replies: [],
  },
]

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function persist(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

export default function AdminForumSection() {
  const [threads, setThreads] = useState<ForumThread[]>(() => load(THREADS_KEY, initialThreads))
  const [bannedUsers, setBannedUsers] = useState<string[]>(() => load(BANS_KEY, []))
  const [selectedId, setSelectedId] = useState<number | null>(() => threads[0]?.id ?? null)
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [reply, setReply] = useState('')

  const selected = useMemo(() => threads.find((thread) => thread.id === selectedId) ?? null, [threads, selectedId])

  const saveThreads = (next: ForumThread[]) => {
    setThreads(next)
    persist(THREADS_KEY, next)
  }

  const createThread = (event: FormEvent) => {
    event.preventDefault()
    const cleanTitle = title.trim()
    const cleanMessage = message.trim()
    if (!cleanTitle || !cleanMessage) return
    const now = new Date().toISOString()
    const thread: ForumThread = {
      id: Date.now(),
      title: cleanTitle,
      author: 'admin',
      createdAt: now,
      replies: [{ id: Date.now() + 1, author: 'admin', content: cleanMessage, createdAt: now }],
    }
    const next = [thread, ...threads]
    saveThreads(next)
    setSelectedId(thread.id)
    setTitle('')
    setMessage('')
    setShowCreate(false)
  }

  const deleteThread = (thread: ForumThread) => {
    if (!window.confirm(`Delete “${thread.title}” and its replies?`)) return
    const next = threads.filter((item) => item.id !== thread.id)
    saveThreads(next)
    setSelectedId(next[0]?.id ?? null)
  }

  const submitReply = (event: FormEvent) => {
    event.preventDefault()
    if (!selected) return
    const clean = reply.trim()
    if (!clean) return
    const next = threads.map((thread) => (
      thread.id === selected.id
        ? { ...thread, replies: [...thread.replies, { id: Date.now(), author: 'admin', content: clean, createdAt: new Date().toISOString() }] }
        : thread
    ))
    saveThreads(next)
    setReply('')
  }

  const toggleBan = (username: string) => {
    if (username === 'admin') return
    const next = bannedUsers.includes(username)
      ? bannedUsers.filter((name) => name !== username)
      : [...bannedUsers, username]
    setBannedUsers(next)
    persist(BANS_KEY, next)
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent-text">Admin / Forum</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Forum moderation</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Threads and bans are stored in browser memory for this first admin build. The backend forum can replace this storage later without changing the moderator workflow.
          </p>
        </div>
        <button type="button" onClick={() => setShowCreate(true)} className="inline-flex h-9 items-center gap-2 border border-accent bg-accent px-3 text-xs font-semibold text-on-accent shadow-none hover:bg-accent-hover hover:shadow-[3px_3px_0px_0px_var(--color-border)]">
          <Plus className="size-3.5" /> Create thread
        </button>
      </div>

      {showCreate && (
        <form onSubmit={createThread} className="border border-border bg-surface p-5 shadow-none">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <p className="font-mono text-xs font-semibold uppercase tracking-wider">Create thread</p>
            <button type="button" onClick={() => setShowCreate(false)} aria-label="Close form" className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
          </div>
          <div className="mt-4 grid gap-4">
            <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Thread title" className="input-field shadow-none" />
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} required placeholder="Opening message" rows={5} className="input-field h-auto py-3 shadow-none" />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setShowCreate(false)} className="h-9 border border-border bg-background px-4 text-xs font-semibold shadow-none hover:border-accent">Cancel</button>
            <button type="submit" className="h-9 border border-accent bg-accent px-4 text-xs font-semibold text-on-accent shadow-none hover:bg-accent-hover hover:shadow-[3px_3px_0px_0px_var(--color-border)]">Create</button>
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
                  className={cn('w-full border-b border-border px-4 py-4 text-left transition-colors', active ? 'bg-accent text-on-accent' : 'hover:bg-background')}
                >
                  <p className="line-clamp-2 text-sm font-semibold">{thread.title}</p>
                  <p className={cn('mt-1 text-[11px]', active ? 'text-on-accent/80' : 'text-muted-foreground')}>
                    {thread.author} · {thread.replies.length} replies
                  </p>
                </button>
              )
            })}
            {threads.length === 0 && <div className="p-6 text-sm text-muted-foreground">No threads yet.</div>}
          </div>
        </aside>

        <div className="flex min-w-0 flex-col">
          {selected ? (
            <>
              <header className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold">{selected.title}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Started by {selected.author} · {formatDate(selected.createdAt)}</p>
                </div>
                <button type="button" onClick={() => deleteThread(selected)} className="inline-flex h-8 shrink-0 items-center gap-1.5 border border-accent bg-surface px-2.5 text-xs font-semibold text-accent-text shadow-none hover:bg-accent hover:text-on-accent hover:shadow-[3px_3px_0px_0px_var(--color-border)]"><Trash2 className="size-3.5" /> Delete</button>
              </header>

              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                <ForumMessage author={selected.author} content={selected.replies.length ? 'Thread started.' : ''} createdAt={selected.createdAt} banned={bannedUsers.includes(selected.author)} onToggleBan={() => toggleBan(selected.author)} />
                {selected.replies.map((item) => (
                  <ForumMessage key={item.id} author={item.author} content={item.content} createdAt={item.createdAt} banned={bannedUsers.includes(item.author)} onToggleBan={() => toggleBan(item.author)} />
                ))}
              </div>

              <form onSubmit={submitReply} className="border-t border-border p-4">
                <div className="flex gap-2">
                  <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply as admin…" className="input-field flex-1 shadow-none" />
                  <button type="submit" disabled={!reply.trim()} className="inline-flex h-10 items-center gap-2 border border-accent bg-accent px-4 text-xs font-semibold text-on-accent shadow-none hover:bg-accent-hover hover:shadow-[3px_3px_0px_0px_var(--color-border)] disabled:cursor-not-allowed disabled:opacity-40"><MessageSquare className="size-3.5" /> Reply</button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">Select a thread to moderate.</div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 border border-border bg-background px-4 py-3 text-xs text-muted-foreground shadow-none">
        <Ban className="size-3.5 text-accent-text" />
        {bannedUsers.length} forum ban{bannedUsers.length === 1 ? '' : 's'} stored locally
        {bannedUsers.length > 0 && <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground"><UserRoundCheck className="size-3" /> Click a banned user again to unban</span>}
      </div>
    </section>
  )
}

function ForumMessage({ author, content, createdAt, banned, onToggleBan }: { author: string; content: string; createdAt: string; banned: boolean; onToggleBan: () => void }) {
  return (
    <article className={cn('border border-border bg-background p-4 shadow-none', banned && 'border-accent')}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">{author}</p>
            {banned && <span className="border border-accent bg-accent px-2 py-0.5 font-mono text-[10px] font-semibold text-on-accent">BANNED</span>}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{formatDate(createdAt)}</p>
        </div>
        {author !== 'admin' && (
          <button type="button" onClick={onToggleBan} className="inline-flex h-8 shrink-0 items-center gap-1.5 border border-border bg-surface px-2.5 text-[11px] font-semibold shadow-none hover:border-accent hover:text-accent-text hover:shadow-[3px_3px_0px_0px_var(--color-border)]">
            {banned ? <UserRoundCheck className="size-3.5" /> : <Ban className="size-3.5" />}
            {banned ? 'Unban' : 'Ban'}
          </button>
        )}
      </div>
      {content && <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-foreground">{banned ? '[Content from a banned forum user]' : content}</p>}
    </article>
  )
}
