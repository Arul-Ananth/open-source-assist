export interface ForumPost {
  id: number
  author_id: string
  author_username: string | null
  author_email: string
  content: string
  created_at: string
}

export interface ForumThread {
  id: number
  title: string
  author_id: string
  author_username: string | null
  author_email: string
  created_at: string
  replies: ForumPost[]
}

export async function getForumThreads(): Promise<{ id: number; title: string; author_id: string; author_username: string | null; author_email: string; created_at: string; reply_count: number }[]> {
  const response = await fetch('/api/v1/forum/threads')
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(typeof data?.detail === 'string' ? data.detail : 'Could not load forum threads')
  return data.threads ?? []
}

export async function getForumThread(threadId: number): Promise<ForumThread> {
  const response = await fetch(`/api/v1/forum/threads/${threadId}`)
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(typeof data?.detail === 'string' ? data.detail : 'Could not load the thread')
  return data
}

export async function createForumThread(token: string, title: string, content: string): Promise<ForumThread> {
  const response = await fetch('/api/v1/forum/threads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title, content }),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(typeof data?.detail === 'string' ? data.detail : 'Could not create the thread')
  return data
}

export async function replyToForumThread(token: string, threadId: number, content: string): Promise<ForumPost> {
  const response = await fetch(`/api/v1/forum/threads/${threadId}/replies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ content }),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(typeof data?.detail === 'string' ? data.detail : 'Could not post the reply')
  return data
}
