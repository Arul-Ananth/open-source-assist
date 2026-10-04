import type { EventInput, EventItem } from '@/types/events'

interface ApiEvent {
  id: number
  name?: string
  company_organization?: string
  organizer?: string
  event_type?: string
  type?: string
  description?: string
  mode?: string
  location?: string | null
  event_date?: string
  date?: string
  event_time?: string
  time?: string
  application_url?: string
  applicationUrl?: string
  created_at?: string
}

function toEvent(item: ApiEvent): EventItem {
  const modeRaw = item.mode || 'Online'
  const mode = modeRaw.toLowerCase() === 'offline' || modeRaw.toLowerCase() === 'in-person' ? 'Offline' : 'Online'
  const timeRaw = item.event_time || item.time || '10:00'

  return {
    id: item.id,
    name: item.name || item.description || 'Untitled Event',
    type: item.event_type || item.type || 'Meetup',
    date: item.event_date || item.date || new Date().toISOString().split('T')[0],
    time: timeRaw.slice(0, 5),
    mode,
    location: item.location ?? '',
    organizer: item.company_organization || item.organizer || 'Open Source Community',
    applicationUrl: item.application_url || item.applicationUrl || '',
  }
}

function toPayload(input: EventInput) {
  return {
    name: input.name.trim(),
    company_organization: input.organizer.trim(),
    organizer: input.organizer.trim(),
    event_type: input.type.trim(),
    type: input.type.trim(),
    description: input.name.trim(),
    mode: input.mode,
    location: input.mode === 'Offline' ? input.location.trim() : '',
    event_date: input.date,
    date: input.date,
    event_time: input.time,
    time: input.time,
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
  const response = await fetch(`/api/v1${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!response.ok) throw new Error(message(await response.json().catch(() => null), 'Event request failed'))
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T)
}

async function adminRequest<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1/admin${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (!response.ok) throw new Error(message(await response.json().catch(() => null), 'Administrator event request failed'))
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T)
}

export function eventStartsAt(event: Pick<EventItem, 'date' | 'time'>): number {
  return new Date(`${event.date}T${event.time?.slice(0, 5) || '00:00'}:00+05:30`).getTime()
}

export function isEventEnded(event: Pick<EventItem, 'date' | 'time'>, now = Date.now()): boolean {
  return eventStartsAt(event) < now
}

export async function listEvents(): Promise<EventItem[]> {
  const result = await request<ApiEvent[] | { events: ApiEvent[] }>('/events?limit=100')
  const list = Array.isArray(result) ? result : result?.events ?? []
  return list.map(toEvent)
}

export const getEvents = listEvents

export async function createEvent(token: string, input: EventInput): Promise<EventItem> {
  const result = await adminRequest<ApiEvent>(token, '/events', {
    method: 'POST',
    body: JSON.stringify(toPayload(input)),
  })
  return toEvent(result)
}

export async function updateEvent(token: string, id: number, input: EventInput): Promise<EventItem> {
  const result = await adminRequest<ApiEvent>(token, `/events/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(toPayload(input)),
  })
  return toEvent(result)
}

export async function deleteEvent(token: string, id: number): Promise<void> {
  await adminRequest<void>(token, `/events/${id}`, { method: 'DELETE' })
}

export async function deleteEndedEvents(token: string): Promise<{ deleted: number }> {
  return adminRequest<{ deleted: number }>(token, '/events/ended', { method: 'DELETE' })
}
