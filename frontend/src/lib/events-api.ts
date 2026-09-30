import type { EventItem } from '@/types/events'

export async function getEvents(): Promise<EventItem[]> {
  const response = await fetch('/api/v1/events')
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(typeof data?.detail === 'string' ? data.detail : 'Could not load events')
  }
  return (data?.events ?? []) as EventItem[]
}

export function eventStartsAt(event: EventItem): number {
  return new Date(`${event.date}T${event.time.slice(0, 5)}:00+05:30`).getTime()
}

export function isEventEnded(event: EventItem, now = Date.now()): boolean {
  return eventStartsAt(event) < now
}