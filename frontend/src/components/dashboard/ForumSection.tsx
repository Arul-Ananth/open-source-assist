import { type FormEvent, useEffect, useState } from 'react'
import { MessageSquare, Pencil, RefreshCw, Send, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { useAuthStore } from '@/lib/auth-store'
import {
  createForumThread,
  deleteForumPost,
  deleteForumThread,
  getForumThread,
  getForumThreads,
  replyToForumThread,
  updateForumPost,
  updateForumThread,
  type ForumThread,
  type ForumThreadSummary,
} from '@/lib/forum-api'

const formatDate = (value: string) => new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

export function ForumSection() {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.role === 'admin'
  const [threads, setThreads] = useState<ForumThreadSummary[]>([])
  const [selected, setSelected] = useState<ForumThread | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [openingPost, setOpeningPost] = useState('')
  const [reply, setReply] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [editingPostId, setEditingPostId] = useState<number | null>(null)
  const [postDraft, setPostDraft] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadThreads = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getForumThreads()
      setThreads(result)
      setSelectedId((current) => current ?? result[0]?.id ?? null)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load forum threads') }
    finally { setLoading(false) }
  }

  useEffect(() => { void loadThreads() }, [])

  useEffect(() => {
    if (selectedId === null) { setSelected(null); return }
    setEditingTitle(false)
    setEditingPostId(null)
    let current = true
    void getForumThread(selectedId)
      .then((thread) => { if (current) setSelected(thread) })
      .catch((reason: unknown) => { if (current) setError(reason instanceof Error ? reason.message : 'Could not load the thread') })
    return () => { current = false }
  }, [selectedId])

  const submitThread = async (event: FormEvent) => {
    event.preventDefault()
    if (!token) return
    try {
      const created = await createForumThread(token, title.trim(), openingPost.trim())
      setTitle(''); setOpeningPost(''); setShowCreate(false)
      await loadThreads(); setSelectedId(created.id)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not create the thread') }
  }

  const submitReply = async (event: FormEvent) => {
    event.preventDefault()
    if (!token || !selected || !reply.trim()) return
    try {
      await replyToForumThread(token, selected.id, reply.trim())
      setReply('')
      const refreshed = await getForumThread(selected.id)
      setSelected(refreshed)
      await loadThreads()
      setSelectedId(refreshed.id)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not post the reply') }
  }

  const submitTitleEdit = async (event: FormEvent) => {
    event.preventDefault()
    if (!token || !selected || !titleDraft.trim()) return
    try {
      const updated = await updateForumThread(token, selected.id, titleDraft.trim())
      setSelected(updated)
      setThreads((items) => items.map((thread) =>
        thread.id === updated.id ? { ...thread, title: updated.title } : thread,
      ))
      setEditingTitle(false)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update the thread') }
  }

  const removeThread = async () => {
    if (!token || !selected || !window.confirm('Delete this thread and all its posts?')) return
    try {
      await deleteForumThread(token, selected.id)
      const remaining = threads.filter((thread) => thread.id !== selected.id)
      setThreads(remaining)
      setSelected(null)
      setSelectedId(remaining[0]?.id ?? null)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not delete the thread') }
  }

  const submitPostEdit = async (event: FormEvent, postId: number) => {
    event.preventDefault()
    if (!token || !selected || !postDraft.trim()) return
    try {
      const updated = await updateForumPost(token, selected.id, postId, postDraft.trim())
      setSelected((thread) => thread
        ? { ...thread, replies: thread.replies.map((post) => post.id === updated.id ? updated : post) }
        : thread,
      )
      setEditingPostId(null)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update the post') }
  }

  const removePost = async (postId: number) => {
    if (!token || !selected || !window.confirm('Delete this post?')) return
    try {
      await deleteForumPost(token, selected.id, postId)
      const refreshed = await getForumThread(selected.id)
      setSelected(refreshed)
      await loadThreads()
      setSelectedId(refreshed.id)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not delete the post') }
  }

  return (
    <section className="animate-fade-up space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="eyebrow">Community / Forum</p><h1 className="section-h2">Forum</h1><p className="section-body">Share questions and ideas with the contributor community.</p></div>
        <div className="flex gap-2"><Button variant="secondary" onClick={() => void loadThreads()} disabled={loading}><RefreshCw className={loading ? 'animate-spin' : ''} aria-hidden="true" /> Refresh</Button><Button onClick={() => setShowCreate((open) => !open)}><MessageSquare aria-hidden="true" /> New thread</Button></div>
      </header>
      {error && <p role="alert" className="border border-accent/40 bg-surface p-3 text-sm text-accent-text">{error}</p>}
      {showCreate && <form onSubmit={(event) => void submitThread(event)} className="grid gap-3 rounded-lg border border-border bg-surface p-4"><label className="grid gap-1.5 text-xs text-muted-foreground">Title<input required minLength={3} maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} className="input-field" /></label><label className="grid gap-1.5 text-xs text-muted-foreground">Opening post<textarea required maxLength={5000} value={openingPost} onChange={(event) => setOpeningPost(event.target.value)} className="input-field min-h-24" /></label><div className="flex justify-end"><Button type="submit">Publish thread</Button></div></form>}
      <div className="grid min-h-[480px] overflow-hidden rounded-lg border border-border bg-surface lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="border-b border-border lg:border-b-0 lg:border-r"><div className="border-b border-border px-4 py-3 font-mono text-xs font-semibold uppercase tracking-wider">Discussions</div><div className="max-h-[520px] overflow-y-auto">{loading ? <p className="p-5 text-sm text-muted-foreground">Loading…</p> : threads.map((thread) => <button key={thread.id} type="button" onClick={() => setSelectedId(thread.id)} className={`w-full border-b border-border px-4 py-3 text-left ${thread.id === selectedId ? 'bg-accent text-on-accent' : 'hover:bg-background'}`}><span className="block line-clamp-2 text-sm font-semibold">{thread.title}</span><span className="mt-1 block text-xs opacity-75">{thread.author_username || thread.author_email} · {thread.reply_count} replies</span></button>)}{!loading && !threads.length && <p className="p-5 text-sm text-muted-foreground">No discussions yet.</p>}</div></aside>
        <div className="flex min-w-0 flex-col">{selected ? <><header className="flex items-start justify-between gap-3 border-b border-border p-4"><div className="min-w-0 flex-1">{editingTitle ? <form onSubmit={(event) => void submitTitleEdit(event)} className="flex gap-2"><input required minLength={3} maxLength={200} value={titleDraft} onChange={(event) => setTitleDraft(event.target.value)} className="input-field min-w-0 flex-1" aria-label="Edit thread title" /><Button type="submit" aria-label="Save thread title"><Send aria-hidden="true" /></Button><Button type="button" variant="secondary" onClick={() => setEditingTitle(false)} aria-label="Cancel title edit"><X aria-hidden="true" /></Button></form> : <><h2 className="font-semibold">{selected.title}</h2><p className="mt-1 text-xs text-muted-foreground">Started by {selected.author_username || selected.author_email} · {formatDate(selected.created_at)}</p></>}</div>{(isAdmin || user?.id === selected.author_id) && !editingTitle && <div className="flex shrink-0 gap-1"><Button type="button" variant="secondary" onClick={() => { setTitleDraft(selected.title); setEditingTitle(true) }} aria-label="Edit thread title"><Pencil aria-hidden="true" /></Button><Button type="button" variant="secondary" onClick={() => void removeThread()} aria-label="Delete thread"><Trash2 aria-hidden="true" /></Button></div>}</header><div className="flex-1 space-y-3 overflow-y-auto p-4">{selected.replies.map((post, index) => <article key={post.id} className="rounded-md border border-border bg-background p-4"><div className="flex flex-wrap justify-between gap-2"><div><p className="text-sm font-semibold">{post.author_username || post.author_email}</p><time className="text-xs text-muted-foreground">{formatDate(post.created_at)}</time></div>{(isAdmin || user?.id === post.author_id) && <div className="flex gap-1"><Button type="button" variant="secondary" onClick={() => { setEditingPostId(post.id); setPostDraft(post.content) }} aria-label="Edit post"><Pencil aria-hidden="true" /></Button>{(index > 0 || isAdmin) && <Button type="button" variant="secondary" onClick={() => void removePost(post.id)} aria-label="Delete post"><Trash2 aria-hidden="true" /></Button>}</div>}</div>{editingPostId === post.id ? <form onSubmit={(event) => void submitPostEdit(event, post.id)} className="mt-3 grid gap-2"><textarea required maxLength={5000} value={postDraft} onChange={(event) => setPostDraft(event.target.value)} className="input-field min-h-24" aria-label="Edit post content" /><div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setEditingPostId(null)}><X aria-hidden="true" /> Cancel</Button><Button type="submit"><Send aria-hidden="true" /> Save</Button></div></form> : <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{post.content}</p>}</article>)}</div><form onSubmit={(event) => void submitReply(event)} className="flex gap-2 border-t border-border p-3"><input value={reply} onChange={(event) => setReply(event.target.value)} maxLength={5000} placeholder="Write a reply…" className="input-field min-w-0 flex-1" /><Button type="submit" disabled={!reply.trim()} aria-label="Send reply"><Send aria-hidden="true" /></Button></form></> : <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">{loading ? 'Loading discussion…' : 'Select a discussion or start a new thread.'}</div>}</div>
      </div>
    </section>
  )
}