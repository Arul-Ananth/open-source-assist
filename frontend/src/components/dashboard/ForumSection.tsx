import { type FormEvent, useEffect, useState, useMemo } from 'react'
import {
  MessageSquare,
  RefreshCw,
  Send,
  Search,
  CheckCircle2,
  ThumbsUp,
  Edit3,
  Trash2,
  Tag,
  Clock,
  Check,
  HelpCircle,
  Code2,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui'
import { useAuthStore } from '@/lib/auth-store'
import {
  createForumThread,
  getForumThread,
  getForumThreads,
  replyToForumThread,
  updateForumThread,
  deleteForumThread,
  updateForumPost,
  deleteForumPost,
  upvoteForumPost,
  type ForumThread,
  type ForumThreadSummary,
} from '@/lib/forum-api'

const CATEGORIES = [
  { id: 'all', label: 'All Discussions', icon: MessageSquare },
  { id: 'q-and-a', label: 'Q&A & Help', icon: HelpCircle, color: 'text-amber-400 bg-amber-400/10 border-amber-400/30' },
  { id: 'good-first-issue', label: 'Good First Issues', icon: Code2, color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' },
  { id: 'architecture', label: 'Architecture & RFCs', icon: LayersIcon, color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
  { id: 'showcase', label: 'Showcase & PRs', icon: Sparkles, color: 'text-purple-400 bg-purple-400/10 border-purple-400/30' },
  { id: 'general', label: 'General', icon: MessageSquare, color: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/30' },
]

function LayersIcon(props: React.SVGProps<SVGSVGElement>) {
  return <Tag {...props} />
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000)
    if (diffSeconds < 60) return 'just now'
    const diffMinutes = Math.round(diffSeconds / 60)
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    const diffHours = Math.round(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.round(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date)
  } catch {
    return dateString
  }
}

/** Formats text by rendering backtick code blocks in monospace container */
function RenderFormattedContent({ content }: { content: string }) {
  const parts = useMemo(() => {
    const codeBlockRegex = /```([a-zA-Z0-9]*)\n?([\s\S]*?)```/g
    const result: Array<{ type: 'code' | 'text'; text: string; lang?: string }> = []
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        result.push({ type: 'text', text: content.substring(lastIndex, match.index) })
      }
      result.push({ type: 'code', text: match[2].trim(), lang: match[1] || 'code' })
      lastIndex = match.index + match[0].length
    }
    if (lastIndex < content.length) {
      result.push({ type: 'text', text: content.substring(lastIndex) })
    }
    return result
  }, [content])

  return (
    <div className="space-y-2 text-sm leading-6">
      {parts.map((p, idx) =>
        p.type === 'code' ? (
          <pre
            key={idx}
            className="my-2.5 overflow-x-auto rounded-md border border-border bg-background p-3 font-mono text-xs text-foreground"
          >
            <code>{p.text}</code>
          </pre>
        ) : (
          <p key={idx} className="whitespace-pre-wrap text-foreground">
            {p.text}
          </p>
        ),
      )}
    </div>
  )
}

export function ForumSection() {
  const currentUser = useAuthStore((state) => state.user)
  const token = useAuthStore((state) => state.token)

  const [threads, setThreads] = useState<ForumThreadSummary[]>([])
  const [totalThreads, setTotalThreads] = useState(0)
  const [selected, setSelected] = useState<ForumThread | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  // Filters & Search
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('activity')

  // Forms & Editing
  const [showCreate, setShowCreate] = useState(false)
  const [createTitle, setCreateTitle] = useState('')
  const [createCategory, setCreateCategory] = useState('general')
  const [createContent, setCreateContent] = useState('')
  const [replyContent, setReplyContent] = useState('')

  // Inline post editing
  const [editingPostId, setEditingPostId] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')

  // UI state
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadThreads = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getForumThreads({
        category: activeCategory,
        search: searchQuery.trim() || undefined,
        sort: sortBy,
      })
      setThreads(res.threads)
      setTotalThreads(res.total)
      if (res.threads.length > 0) {
        setSelectedId((current) => {
          if (current !== null && res.threads.some((t) => t.id === current)) {
            return current
          }
          return res.threads[0].id
        })
      } else {
        setSelected(null)
        setSelectedId(null)
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load forum discussions')
    } finally {
      setLoading(false)
    }
  }

  // Reload threads when category or sort changes
  useEffect(() => {
    void loadThreads()
  }, [activeCategory, sortBy])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      void loadThreads()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Load single thread when selectedId changes
  useEffect(() => {
    if (selectedId === null) {
      setSelected(null)
      return
    }
    let isCurrent = true
    void getForumThread(selectedId)
      .then((thread) => {
        if (isCurrent) setSelected(thread)
      })
      .catch((reason: unknown) => {
        if (isCurrent) {
          setSelected(null)
          // If the thread was deleted or does not exist, reset to the first available discussion
          setSelectedId((prev) => {
            const fallback = threads.find((t) => t.id !== prev)?.id ?? null
            return fallback
          })
          setError(reason instanceof Error ? reason.message : 'Could not load the discussion')
        }
      })
    return () => {
      isCurrent = false
    }
  }, [selectedId, threads])

  // Create new thread
  const handleCreateThread = async (e: FormEvent) => {
    e.preventDefault()
    if (!token || !createTitle.trim() || !createContent.trim()) return
    setIsSubmitting(true)
    try {
      const created = await createForumThread(token, createTitle.trim(), createContent.trim(), createCategory)
      setCreateTitle('')
      setCreateContent('')
      setShowCreate(false)
      await loadThreads()
      setSelectedId(created.id)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not create discussion')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Submit reply
  const handleSubmitReply = async (e: FormEvent) => {
    e.preventDefault()
    if (!token || !selected || !replyContent.trim()) return
    setIsSubmitting(true)
    try {
      await replyToForumThread(token, selected.id, replyContent.trim())
      setReplyContent('')
      const refreshed = await getForumThread(selected.id)
      setSelected(refreshed)
      await loadThreads()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not post reply')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Upvote post
  const handleUpvote = async (postId: number) => {
    if (!token || !selected) return
    try {
      const res = await upvoteForumPost(token, selected.id, postId)
      setSelected({
        ...selected,
        replies: selected.replies.map((p) => (p.id === postId ? { ...p, upvotes: res.upvotes } : p)),
      })
    } catch {
      /* ignore */
    }
  }

  // Toggle solved / mark answer
  const handleToggleSolved = async (acceptedPostId?: number) => {
    if (!token || !selected) return
    const isSolved = !selected.is_solved
    try {
      const updated = await updateForumThread(token, selected.id, {
        is_solved: isSolved,
        accepted_answer_id: isSolved ? acceptedPostId || selected.accepted_answer_id : null,
      })
      setSelected(updated)
      await loadThreads()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update solved status')
    }
  }

  // Edit reply
  const handleSaveEditPost = async (postId: number) => {
    if (!token || !selected || !editContent.trim()) return
    try {
      const updated = await updateForumPost(token, selected.id, postId, editContent.trim())
      setSelected({
        ...selected,
        replies: selected.replies.map((p) => (p.id === postId ? updated : p)),
      })
      setEditingPostId(null)
      setEditContent('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update post')
    }
  }

  // Delete reply
  const handleDeletePost = async (postId: number) => {
    if (!token || !selected) return
    if (!confirm('Are you sure you want to delete this reply?')) return
    try {
      await deleteForumPost(token, selected.id, postId)
      const refreshed = await getForumThread(selected.id)
      setSelected(refreshed)
      await loadThreads()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not delete post')
    }
  }

  // Delete entire thread
  const handleDeleteThread = async (threadId: number) => {
    if (!token) return
    if (!confirm('Are you sure you want to permanently delete this entire discussion?')) return
    try {
      await deleteForumThread(token, threadId)
      setSelected(null)
      setSelectedId(null)
      await loadThreads()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not delete discussion')
    }
  }

  const isThreadAuthor = currentUser && selected && currentUser.id === selected.author_id
  const isAdmin = currentUser?.role === 'admin'

  return (
    <section className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare size={18} className="text-accent" />
            <h1 className="text-base font-bold text-foreground">Community Discussions</h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Collaborate with contributors, debug build issues, and share open-source RFCs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void loadThreads()}
            disabled={loading}
            className="gap-1.5 text-xs"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => setShowCreate((v) => !v)}
            className="gap-1.5 text-xs font-semibold"
          >
            <MessageSquare size={14} />
            {showCreate ? 'Close Form' : 'New Discussion'}
          </Button>
        </div>
      </header>

      {/* Error alert banner */}
      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-950/20 p-3 text-xs text-red-300 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-xs hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* New Discussion Creation Panel */}
      {showCreate && (
        <form
          onSubmit={(e) => void handleCreateThread(e)}
          className="rounded-md border border-border bg-surface p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Start a New Discussion</h2>
            <span className="text-[11px] font-mono text-muted-foreground">Markdown code blocks supported</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Title
              </label>
              <input
                required
                minLength={3}
                maxLength={200}
                placeholder="e.g. How to resolve PostgreSQL SSL connection in Docker?"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Category
              </label>
              <select
                value={createCategory}
                onChange={(e) => setCreateCategory(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none"
              >
                <option value="general">General</option>
                <option value="q-and-a">Q&A & Help</option>
                <option value="good-first-issue">Good First Issues</option>
                <option value="architecture">Architecture & RFCs</option>
                <option value="showcase">Showcase & PRs</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Opening Post
            </label>
            <textarea
              required
              maxLength={5000}
              rows={4}
              placeholder="Describe your question or proposal. Use ```language ... ``` for code snippets."
              value={createContent}
              onChange={(e) => setCreateContent(e.target.value)}
              className="w-full rounded-md border border-border bg-background p-3 text-xs text-foreground focus:border-accent focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCreate(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="text-xs font-semibold">
              {isSubmitting ? 'Publishing...' : 'Publish Discussion'}
            </Button>
          </div>
        </form>
      )}

      {/* Category Pills & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            const isActive = activeCategory === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors shrink-0 ${
                  isActive
                    ? 'bg-accent text-accent-foreground font-semibold'
                    : 'border border-border bg-surface text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon size={12} />
                <span>{cat.label}</span>
              </button>
            )
          })}
        </div>

        {/* Search & Sort */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 rounded-md border border-border bg-surface pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none w-48 sm:w-56"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-8 rounded-md border border-border bg-surface px-2.5 text-xs text-foreground focus:border-accent focus:outline-none"
          >
            <option value="activity">Active</option>
            <option value="created">Newest</option>
            <option value="views">Views</option>
          </select>
        </div>
      </div>

      {/* Main Discussions Workspace */}
      <div className="grid min-h-[550px] overflow-hidden rounded-md border border-border bg-surface lg:grid-cols-[330px_minmax(0,1fr)]">
        {/* Left Sidebar: Threads List */}
        <aside className="border-b border-border lg:border-b-0 lg:border-r flex flex-col">
          <div className="border-b border-border px-4 py-2.5 flex items-center justify-between bg-surface font-mono text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
            <span>Discussions ({totalThreads})</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border/60 max-h-[600px]">
            {loading && threads.length === 0 ? (
              <p className="p-6 text-center text-xs text-muted-foreground">Loading discussions...</p>
            ) : threads.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <MessageSquare size={24} className="mx-auto text-muted-foreground/60" />
                <p className="text-xs text-muted-foreground">No discussions found in this view.</p>
              </div>
            ) : (
              threads.map((thread) => {
                const isSelected = thread.id === selectedId
                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => setSelectedId(thread.id)}
                    className={`w-full p-3.5 text-left transition-colors flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-accent/10 border-l-2 border-accent text-foreground'
                        : 'hover:bg-background/60 text-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {thread.is_solved && (
                        <span className="inline-flex items-center gap-0.5 rounded-sm bg-emerald-500/10 px-1 py-0.2 font-mono text-[10px] font-semibold text-emerald-400">
                          <Check size={10} /> Solved
                        </span>
                      )}
                      <span className="rounded-sm border border-border bg-background px-1.5 py-0.2 font-mono text-[10px] text-muted-foreground uppercase">
                        {thread.category || 'general'}
                      </span>
                    </div>

                    <h3 className={`text-xs font-semibold line-clamp-2 ${isSelected ? 'text-foreground' : 'text-foreground/90'}`}>
                      {thread.title}
                    </h3>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                      <span>@{thread.author_username || thread.author_email.split('@')[0]}</span>
                      <div className="flex items-center gap-2.5 font-mono">
                        <span className="flex items-center gap-1">
                          <MessageSquare size={11} /> {thread.reply_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> {formatRelativeTime(thread.last_activity_at || thread.created_at)}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        {/* Right Pane: Selected Discussion View */}
        <div className="flex min-w-0 flex-col bg-background">
          {selected ? (
            <>
              {/* Thread Header */}
              <header className="border-b border-border bg-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded-sm border border-border bg-background px-2 py-0.5 font-mono text-[10px] font-semibold text-accent uppercase">
                      {selected.category || 'general'}
                    </span>
                    {selected.is_solved && (
                      <span className="inline-flex items-center gap-1 rounded-sm bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-400">
                        <CheckCircle2 size={12} /> Solved Discussion
                      </span>
                    )}
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-foreground">
                    {selected.title}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Started by <span className="font-semibold text-foreground">@{selected.author_username || selected.author_email}</span> · {formatRelativeTime(selected.created_at)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {(isThreadAuthor || isAdmin) && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleToggleSolved()}
                        className="gap-1 text-xs"
                      >
                        <CheckCircle2 size={13} className={selected.is_solved ? 'text-emerald-400' : ''} />
                        {selected.is_solved ? 'Unmark Solved' : 'Mark Solved'}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleDeleteThread(selected.id)}
                        className="gap-1 text-xs text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={13} />
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </header>

              {/* Posts Timeline */}
              <div className="flex-1 space-y-4 overflow-y-auto p-4 max-h-[500px]">
                {selected.replies.map((post) => {
                  const isOpening = post.is_opening_post
                  const isAccepted = selected.accepted_answer_id === post.id
                  const isPostAuthor = currentUser && currentUser.id === post.author_id
                  const canManage = isPostAuthor || isAdmin

                  return (
                    <article
                      key={post.id}
                      className={`rounded-md border p-4 space-y-3 transition-colors ${
                        isAccepted
                          ? 'border-emerald-500/50 bg-emerald-950/10'
                          : isOpening
                          ? 'border-accent/30 bg-surface'
                          : 'border-border bg-surface/50'
                      }`}
                    >
                      {/* Post Author Bar */}
                      <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center font-mono text-[10px] font-bold text-accent">
                            {(post.author_username || post.author_email)[0].toUpperCase()}
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-foreground">
                              @{post.author_username || post.author_email.split('@')[0]}
                            </span>
                            {isOpening && (
                              <span className="ml-1.5 rounded-sm bg-accent/15 px-1 py-0.2 font-mono text-[9px] font-semibold text-accent">
                                Author
                              </span>
                            )}
                            {isAccepted && (
                              <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-sm bg-emerald-500/20 px-1.5 py-0.2 font-mono text-[9px] font-bold text-emerald-400">
                                <CheckCircle2 size={10} /> Accepted Solution
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                          <time>{formatRelativeTime(post.created_at)}</time>

                          {/* Post Controls */}
                          {canManage && !isOpening && (
                            <div className="flex items-center gap-1 ml-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPostId(post.id)
                                  setEditContent(post.content)
                                }}
                                className="p-1 hover:text-foreground text-muted-foreground"
                                title="Edit reply"
                              >
                                <Edit3 size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeletePost(post.id)}
                                className="p-1 hover:text-red-400 text-muted-foreground"
                                title="Delete reply"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Post Content */}
                      {editingPostId === post.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={3}
                            className="w-full rounded-md border border-border bg-background p-2 text-xs text-foreground focus:border-accent focus:outline-none"
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingPostId(null)}
                              className="text-xs"
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => void handleSaveEditPost(post.id)}
                              className="text-xs"
                            >
                              Save Edit
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <RenderFormattedContent content={post.content} />
                      )}

                      {/* Post Footer Actions: Upvote & Mark as Solution */}
                      <div className="flex items-center justify-between pt-2 border-t border-border/30 text-xs">
                        <button
                          type="button"
                          onClick={() => void handleUpvote(post.id)}
                          className="flex items-center gap-1.5 text-muted-foreground hover:text-accent font-mono text-xs transition-colors"
                        >
                          <ThumbsUp size={13} />
                          <span>{post.upvotes || 0}</span>
                        </button>

                        {/* Thread author can mark this reply as solution */}
                        {!isOpening && isThreadAuthor && (
                          <button
                            type="button"
                            onClick={() => void handleToggleSolved(post.id)}
                            className={`flex items-center gap-1 text-[11px] font-mono font-semibold transition-colors ${
                              isAccepted
                                ? 'text-emerald-400 hover:text-emerald-300'
                                : 'text-muted-foreground hover:text-emerald-400'
                            }`}
                          >
                            <CheckCircle2 size={12} />
                            <span>{isAccepted ? 'Remove Solution' : 'Accept Solution'}</span>
                          </button>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>

              {/* Reply Form */}
              <form onSubmit={(e) => void handleSubmitReply(e)} className="border-t border-border bg-surface p-3 space-y-2">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  maxLength={5000}
                  rows={2}
                  placeholder={token ? "Write a helpful reply... (use ``` for code blocks)" : "Please log in to post a reply."}
                  disabled={!token || isSubmitting}
                  className="w-full rounded-md border border-border bg-background p-2.5 text-xs text-foreground focus:border-accent focus:outline-none resize-none"
                />
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-muted-foreground font-mono">
                    Markdown & code blocks supported
                  </span>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!token || !replyContent.trim() || isSubmitting}
                    className="gap-1.5 text-xs font-semibold"
                  >
                    <Send size={13} />
                    {isSubmitting ? 'Posting...' : 'Post Reply'}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-12 text-center text-muted-foreground space-y-3">
              <MessageSquare size={36} className="text-muted-foreground/40" />
              <p className="text-xs font-semibold text-foreground">Select a discussion to join the conversation</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Or click &quot;New Discussion&quot; above to ask questions or share insights with the community.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}