import type { EventInput, EventItem } from '@/types/events'

interface ApiEvent {
  id: number
  name: string
  company_organization: string
  event_type: string
  description: string
  mode: string
  location: string | null
  event_date: string
  event_time: string
  application_url: string
  created_at: string
}

function toEvent(item: ApiEvent): EventItem {
  return {
    id: item.id,
    name: item.name || item.description || 'Untitled Event',
    type: item.event_type,
    date: item.event_date,
    time: item.event_time.slice(0, 5),
    mode: item.mode.toLowerCase() === 'offline' || item.mode.toLowerCase() === 'in-person' ? 'Offline' : 'Online',
    location: item.location ?? '',
    organizer: item.company_organization,
    applicationUrl: item.application_url,
  }
}

function toPayload(input: EventInput) {
  return {
    name: input.name.trim(),
    company_organization: input.organizer.trim(),
    event_type: input.type.trim(),
    description: input.name.trim(),
    mode: input.mode,
    location: input.mode === 'Offline' ? input.location.trim() : null,
    event_date: input.date,
    event_time: input.time,
    application_url: input.applicationUrl.trim(),
  }
}

function message(data: unknown, fallback: string) {
  if (typeof data === 'object' && data && 'detail' in data && typeof (data as { detail?: unknown }).detail === 'string') {
    return (data as { detail: string }).detail
  }
  return fallback
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } })
  if (!response.ok) throw new Error(message(await response.json().catch(() => null), 'Event request failed'))
  return response.status === 204 ? (undefined as T) : await response.json() as T
}

async function adminRequest<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1/admin${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) } })
  if (!response.ok) throw new Error(message(await response.json().catch(() => null), 'Administrator event request failed'))
  return response.status === 204 ? (undefined as T) : await response.json() as T
}

export async function listEvents(): Promise<EventItem[]> {
  const result = await request<ApiEvent[]>('/events?limit=100')
  return result.map(toEvent)
}

export async function createEvent(token: string, input: EventInput): Promise<EventItem> {
  const result = await adminRequest<ApiEvent>(token, '/events', { method: 'POST', body: JSON.stringify(toPayload(input)) })
  return toEvent(result)
}

export async function updateEvent(token: string, id: number, input: EventInput): Promise<EventItem> {
  const result = await adminRequest<ApiEvent>(token, `/events/${id}`, { method: 'PATCH', body: JSON.stringify(toPayload(input)) })
  return toEvent(result)
}

export async function deleteEvent(token: string, id: number): Promise<void> {
  await adminRequest<void>(token, `/events/${id}`, { method: 'DELETE' })
}
