import type { AccountStatus, UserRole } from '@/lib/auth-store'

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

function errorMessage(data: unknown, fallback: string) {
  if (typeof data === 'object' && data && 'detail' in data && typeof (data as { detail?: unknown }).detail === 'string') return (data as { detail: string }).detail
  return fallback
}

async function request<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1/admin${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) } })
  if (!response.ok) throw new Error(errorMessage(await response.json().catch(() => null), 'Administrator request failed'))
  return response.status === 204 ? (undefined as T) : await response.json() as T
}

export function getAdminUsers(token: string, search = '') {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''
  return request<AdminUsersResponse>(token, `/users${query}`)
}

export function updateAdminUser(token: string, userId: string, patch: { role?: UserRole; account_status?: AccountStatus }) {
  return request<AdminUser>(token, `/users/${encodeURIComponent(userId)}`, { method: 'PATCH', body: JSON.stringify(patch) })
}

export function deleteAdminUser(token: string, userId: string) {
  return request<void>(token, `/users/${encodeURIComponent(userId)}`, { method: 'DELETE' })
}
