import type { AccountStatus, UserRole } from '@/lib/auth-store'
import type { EventItem, EventDraft } from '@/types/events'

export interface AdminUser {
  id: string
  email: string
  username: string | null
  role: UserRole
  account_status: AccountStatus
  created_at: string
}

interface AdminUsersResponse {
  users: AdminUser[]
  total: number
  limit: number
  offset: number
}

export interface AdminForumPost {
  id: number
  author_id: string
  author_username: string | null
  author_email: string
  content: string
  created_at: string
  banned: boolean
}

export interface AdminForumThread {
  id: number
  title: string
  author_id: string
  author_username: string | null
  author_email: string
  created_at: string
  replies: AdminForumPost[]
  banned: boolean
}

interface AdminForumThreadsResponse {
  threads: AdminForumThread[]
}

export interface ForumBan {
  user_id: string
  username: string | null
  email: string
  created_at: string
}

interface ForumBansResponse {
  bans: ForumBan[]
}

export class AdminApiUnavailableError extends Error {}

function errorMessage(data: unknown, fallback: string) {
  if (typeof data === 'object' && data && 'detail' in data) {
    const detail = (data as { detail?: unknown }).detail
    if (typeof detail === 'string') return detail
  }
  return fallback
}

async function request<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1/admin${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  const body = await response.text()
  let data: unknown = null
  if (body) {
    try {
      data = JSON.parse(body)
    } catch {
      const html = response.headers.get('content-type')?.includes('text/html') || /^\s*<!doctype html/i.test(body)
      if (html) throw new AdminApiUnavailableError('Admin API is not connected')
      throw new Error('The admin API returned an invalid response')
    }
  }

  if (!response.ok) throw new Error(errorMessage(data, 'Administrator request failed'))
  if (response.status === 204) return undefined as T
  return data as T
}

export function getAdminUsers(token: string, search = '') {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''
  return request<AdminUsersResponse>(token, `/users${query}`)
}

export function updateAdminUser(token: string, userId: string, patch: { role?: UserRole; account_status?: AccountStatus }) {
  return request<AdminUser>(token, `/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export function deleteAdminUser(token: string, userId: string) {
  return request<void>(token, `/users/${encodeURIComponent(userId)}`, { method: 'DELETE' })
}

export function getAdminEvents(token: string) {
  return request<{ events: EventItem[] }>(token, '/events')
}

export function createAdminEvent(token: string, draft: EventDraft) {
  return request<EventItem>(token, '/events', { method: 'POST', body: JSON.stringify(draft) })
}

export function updateAdminEvent(token: string, eventId: number, draft: EventDraft) {
  return request<EventItem>(token, `/events/${eventId}`, { method: 'PATCH', body: JSON.stringify(draft) })
}

export function deleteAdminEvent(token: string, eventId: number) {
  return request<void>(token, `/events/${eventId}`, { method: 'DELETE' })
}

export function deleteEndedAdminEvents(token: string) {
  return request<{ deleted: number }>(token, '/events/ended', { method: 'DELETE' })
}

export function getAdminForumThreads(token: string) {
  return request<AdminForumThreadsResponse>(token, '/forum/threads')
}

export function deleteAdminForumThread(token: string, threadId: number) {
  return request<void>(token, `/forum/threads/${threadId}`, { method: 'DELETE' })
}

export function getForumBans(token: string) {
  return request<ForumBansResponse>(token, '/forum/bans')
}

export function banForumUser(token: string, userId: string) {
  return request<void>(token, `/forum/bans/${encodeURIComponent(userId)}`, { method: 'POST' })
}

export function unbanForumUser(token: string, userId: string) {
  return request<void>(token, `/forum/bans/${encodeURIComponent(userId)}`, { method: 'DELETE' })
}
