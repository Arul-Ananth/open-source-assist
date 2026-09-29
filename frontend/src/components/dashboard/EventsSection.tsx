import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, MapPin, Monitor, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getEvents, isEventEnded } from '@/lib/events-api'
import type { EventItem } from '@/types/events'

const formatDate = (date: string) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00`))

export default function EventsSection() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      setEvents(await getEvents())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load events')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const upcoming = useMemo(() => events.filter((event) => !isEventEnded(event)).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)), [events])
  const ended = useMemo(() => events.filter((event) => isEventEnded(event)).sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`)), [events])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="font-mono text-xs uppercase tracking-[0.18em] text-accent-text">Community</p><h1 className="mt-2 text-2xl font-bold tracking-tight">Events</h1><p className="mt-1 text-sm text-muted-foreground">Open-source events published by OpenSource Assist administrators.</p></div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-9 items-center gap-2 self-start border border-border bg-surface px-3 text-xs font-semibold shadow-none hover:border-accent hover:shadow-[3px_3px_0px_0px_var(--color-border)] disabled:opacity-50"><RefreshCw className={cn('size-3.5', loading && 'animate-spin')} /> Refresh</button>
      </div>

      {error && <div className="border border-accent bg-surface p-3 text-sm text-accent-text shadow-none">{error}</div>}
      {loading ? <div className="border border-dashed border-border bg-background p-8 text-center text-sm text-muted-foreground shadow-none">Loading events…</div> : <><EventList title="Upcoming events" events={upcoming} /><EventList title="Past events" events={ended} muted /></>}
    </div>
  )
}

function EventList({ title, events, muted = false }: { title: string; events: EventItem[]; muted?: boolean }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between"><h2 className="font-mono text-sm font-semibold uppercase tracking-wider">{title}</h2><span className="font-mono text-[11px] text-muted-foreground">{events.length}</span></div>
      {events.length === 0 ? <div className="border border-dashed border-border bg-background p-8 text-center text-sm text-muted-foreground shadow-none">No {muted ? 'past' : 'upcoming'} events yet.</div> : <div className="space-y-3">{events.map((event) => <article key={event.id} className={cn('border border-border bg-surface p-4 shadow-none transition-all duration-150 hover:border-accent/60 hover:shadow-[4px_4px_0px_0px_var(--color-border)]', muted && 'opacity-75')}><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-semibold">{event.name}</h3><span className="border border-border bg-background px-2 py-0.5 font-mono text-[10px] text-muted-foreground">{event.type}</span></div><p className="mt-2 text-sm text-muted-foreground">Organized by {event.organizer}</p></div><div className="grid shrink-0 gap-2 text-xs text-muted-foreground sm:text-right"><span className="inline-flex items-center gap-2 sm:justify-end"><CalendarDays className="size-3.5 text-accent-text" />{formatDate(event.date)} · {event.time.slice(0, 5)} IST</span><span className="inline-flex items-center gap-2 sm:justify-end">{event.mode === 'Online' ? <Monitor className="size-3.5 text-accent-text" /> : <MapPin className="size-3.5 text-accent-text" />}{event.mode === 'Online' ? 'Online' : event.location}</span></div></div></article>)}</div>}
    </section>
  )
}
