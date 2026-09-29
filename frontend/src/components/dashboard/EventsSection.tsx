import { useEffect, useState } from 'react'
import { CalendarDays, MapPin, Monitor, RefreshCw } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState } from '@/components/ui'
import { getEvents } from '@/lib/events-api'
import type { EventItem, EventSort } from '@/types/events'

export const formatDate = (date: string) => {
  if (!date || !date.trim()) return 'Date TBD'
  const parsed = new Date(`${date}T00:00:00`)
  return isNaN(parsed.getTime())
    ? date
    : new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(parsed)
}

export function EventsSection() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<EventSort>('date-asc')

  const loadEvents = async () => {
    setLoading(true)
    setError(null)
    try {
      setEvents(await getEvents())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load events')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadEvents() }, [])

  const sortedEvents = [...events].sort((first, second) => {
    if (sortOrder === 'online-first' && first.mode !== second.mode) {
      return first.mode === 'Online' ? -1 : 1
    }
    if (sortOrder === 'offline-first' && first.mode !== second.mode) {
      return first.mode === 'Offline' ? -1 : 1
    }
    return sortOrder === 'date-desc'
      ? second.date.localeCompare(first.date)
      : first.date.localeCompare(second.date)
  })

  return (
    <div className="animate-fade-up space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Community / Events</p>
          <h1 className="section-h2">Events</h1>
          <div className="section-underline" aria-hidden="true" />
          <p className="section-body">
            Review and discover open-source community events published for contributors.
          </p>
        </div>
        <Button type="button" variant="secondary" className="self-start gap-2 sm:self-auto" onClick={() => void loadEvents()} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Refresh
        </Button>
      </div>

      {error && <div role="alert" className="border border-accent/40 bg-surface p-3 text-sm text-accent-text">{error}</div>}
      <Card className="rounded-xl">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>EVENT LIST</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {events.length} {events.length === 1 ? 'event' : 'events'} currently published.
              </p>
            </div>
            <CalendarDays className="size-5 text-accent-text" aria-hidden="true" />
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label htmlFor="events-sort" className="font-mono text-xs text-muted-foreground">
              Sort events
            </label>
            <select
              id="events-sort"
              className="input-field h-9 text-xs sm:max-w-xs"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value as EventSort)}
            >
              <option value="date-asc">Date: earliest first</option>
              <option value="date-desc">Date: latest first</option>
              <option value="online-first">Online first</option>
              <option value="offline-first">Offline first</option>
            </select>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading events…</div>
          ) : events.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title={error ? 'Events unavailable' : 'No events available'}
              description={error ? 'The event service could not be reached.' : 'Published community events will appear here once scheduled.'}
            />
          ) : (
            sortedEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-lg border border-border bg-background p-4 sm:p-5 transition-all hover:border-accent/40"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold">{event.name}</h2>
                        <Badge variant="secondary" className="text-[10px]">
                          {event.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Organized by {event.organizer}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <CalendarDays className="size-3.5" aria-hidden="true" />
                          {formatDate(event.date)} at {event.time} IST
                        </span>
                        <span className="flex items-center gap-1.5">
                          {event.mode === 'Online' ? (
                            <Monitor className="size-3.5 text-accent" aria-hidden="true" />
                          ) : (
                            <MapPin className="size-3.5 text-accent" aria-hidden="true" />
                          )}
                          {event.mode === 'Online' ? 'Online' : event.location}
                        </span>
                      </div>
                    </div>

                  </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default EventsSection
