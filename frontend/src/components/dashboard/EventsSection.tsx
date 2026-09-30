import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ExternalLink, MapPin, Monitor } from 'lucide-react'
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState } from '@/components/ui'
import { listEvents } from '@/lib/events-api'
import type { EventItem } from '@/types/events'

export const formatDate = (date: string) => {
  if (!date) return 'Date TBD'
  const parsed = new Date(`${date}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? date : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(parsed)
}

export function eventStartsAt(event: Pick<EventItem, 'date' | 'time'>) {
  return new Date(`${event.date}T${event.time || '00:00'}:00+05:30`).getTime()
}

export function isEventEnded(event: Pick<EventItem, 'date' | 'time'>, now = Date.now()) {
  return eventStartsAt(event) < now
}

export default function EventsSection() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    void listEvents().then((items) => {
      if (mounted) setEvents(items)
    }).catch((err) => {
      if (mounted) setError(err instanceof Error ? err.message : 'Could not load events')
    }).finally(() => {
      if (mounted) setLoading(false)
    })
    return () => { mounted = false }
  }, [])

  const upcoming = useMemo(() => [...events].sort((a, b) => eventStartsAt(a) - eventStartsAt(b)).filter((event) => !isEventEnded(event)), [events])

  return (
    <section className="space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent-text">Community / Events</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Events</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Upcoming open-source events published by the platform administrators.</p>
      </div>

      {error && <div role="alert" className="border border-accent bg-surface p-3 text-sm text-accent-text">{error}</div>}

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><CalendarDays className="size-4 text-accent-text" /> Upcoming events</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <div className="py-10 text-center text-sm text-muted-foreground">Loading events…</div> : upcoming.length === 0 ? <EmptyState icon={CalendarDays} title="No upcoming events" description="Administrators can publish events from the admin panel." /> : (
            <div className="space-y-3">
              {upcoming.map((event) => (
                <article key={event.id} className="border border-border bg-background p-4 shadow-none transition-colors hover:border-accent">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold">{event.name}</h2>
                        <Badge variant="outline">{event.type}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{event.organizer}</p>
                    </div>
                    <div className="grid gap-2 text-xs text-muted-foreground lg:text-right">
                      <span className="inline-flex items-center gap-2 lg:justify-end"><CalendarDays className="size-3.5 text-accent-text" />{formatDate(event.date)} · {event.time} IST</span>
                      <span className="inline-flex items-center gap-2 lg:justify-end">{event.mode === 'Online' ? <Monitor className="size-3.5 text-accent-text" /> : <MapPin className="size-3.5 text-accent-text" />}{event.mode === 'Online' ? 'Online' : event.location}</span>
                    </div>
                    {event.applicationUrl && <a href={event.applicationUrl} target="_blank" rel="noreferrer" className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 border border-border bg-surface px-3 text-xs font-semibold shadow-none hover:border-accent hover:text-accent-text"><ExternalLink className="size-3.5" /> Apply</a>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
