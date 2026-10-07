export interface ForumPost {
  id: number
  thread_id?: number
  author_id: string
  author_username: string | null
  author_email: string
  author_avatar_url?: string | null
  content: string
  is_opening_post?: boolean
  upvotes?: number
  created_at: string
  updated_at?: string | null
}

export interface ForumThread {
  id: number
  title: string
  author_id: string
  author_username: string | null
  author_email: string
  author_avatar_url?: string | null
  category: string
  reply_count: number
  views_count: number
  is_solved: boolean
  accepted_answer_id?: number | null
  last_activity_at?: string
  created_at: string
  replies: ForumPost[]
}

export interface ForumThreadSummary {
  id: number
  title: string
  author_id: string
  author_username: string | null
  author_email: string
  author_avatar_url?: string | null
  category: string
  reply_count: number
  views_count: number
  is_solved: boolean
  last_activity_at?: string
  created_at: string
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
  if (response.status === 204) {
    return null as T
  }
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(typeof data?.detail === 'string' ? data.detail : 'Forum request failed')
  }
  return data as T
}

export async function getForumThreads(params?: {
  category?: string
  search?: string
  sort?: string
  limit?: number
  offset?: number
}): Promise<{ threads: ForumThreadSummary[]; total: number }> {
  const searchParams = new URLSearchParams()
  if (params?.category && params.category !== 'all') searchParams.set('category', params.category)
  if (params?.search) searchParams.set('search', params.search)
  if (params?.sort) searchParams.set('sort', params.sort)
  if (params?.limit) searchParams.set('limit', String(params.limit))
  if (params?.offset) searchParams.set('offset', String(params.offset))

  const qs = searchParams.toString()
  const data = await request<{ threads: ForumThreadSummary[]; total: number }>(`/threads${qs ? `?${qs}` : ''}`)
  return data
}

export function getForumThread(threadId: number): Promise<ForumThread> {
  return request(`/threads/${threadId}`)
}

export function createForumThread(
  token: string,
  title: string,
  content: string,
  category: string = 'general',
): Promise<ForumThread> {
  return request('/threads', token, {
    method: 'POST',
    body: JSON.stringify({ title, content, category }),
  })
}

export function updateForumThread(
  token: string,
  threadId: number,
  data: {
    title?: string
    category?: string
    is_solved?: boolean
    accepted_answer_id?: number | null
  },
): Promise<ForumThread> {
  return request(`/threads/${threadId}`, token, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function deleteForumThread(token: string, threadId: number): Promise<void> {
  return request(`/threads/${threadId}`, token, { method: 'DELETE' })
}

export function replyToForumThread(
  token: string,
  threadId: number,
  content: string,
): Promise<ForumPost> {
  return request(`/threads/${threadId}/replies`, token, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
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

export function deleteForumPost(
  token: string,
  threadId: number,
  postId: number,
): Promise<void> {
  return request(`/threads/${threadId}/posts/${postId}`, token, {
    method: 'DELETE',
  })
}

export function upvoteForumPost(
  token: string,
  threadId: number,
  postId: number,
): Promise<{ upvotes: number }> {
  return request(`/threads/${threadId}/posts/${postId}/upvote`, token, {
    method: 'POST',
  })
}