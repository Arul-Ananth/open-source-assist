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

export interface ForumThreadSummary {
  id: number
  title: string
  author_id: string
  author_username: string | null
  author_email: string
  created_at: string
  reply_count: number
}

async function request<T>(path: string, token?: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1/forum${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(typeof data?.detail === 'string' ? data.detail : 'Forum request failed')
  }
  return data as T
}

export async function getForumThreads(): Promise<ForumThreadSummary[]> {
  const data = await request<{ threads: ForumThreadSummary[] }>('/threads')
  return data.threads
}

export function getForumThread(threadId: number): Promise<ForumThread> {
  return request(`/threads/${threadId}`)
}

export function createForumThread(token: string, title: string, content: string): Promise<ForumThread> {
  return request('/threads', token, { method: 'POST', body: JSON.stringify({ title, content }) })
}

export function updateForumThread(token: string, threadId: number, title: string): Promise<ForumThread> {
  return request(`/threads/${threadId}`, token, { method: 'PATCH', body: JSON.stringify({ title }) })
}

export function deleteForumThread(token: string, threadId: number): Promise<void> {
  return request(`/threads/${threadId}`, token, { method: 'DELETE' })
}

export function replyToForumThread(token: string, threadId: number, content: string): Promise<ForumPost> {
  return request(`/threads/${threadId}/replies`, token, { method: 'POST', body: JSON.stringify({ content }) })
}

export function updateForumPost(
  token: string,
  threadId: number,
  postId: number,
  content: string,
): Promise<ForumPost> {
  return request(`/threads/${threadId}/posts/${postId}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ content }),
  })
}

export function deleteForumPost(token: string, threadId: number, postId: number): Promise<void> {
  return request(`/threads/${threadId}/posts/${postId}`, token, { method: 'DELETE' })
}