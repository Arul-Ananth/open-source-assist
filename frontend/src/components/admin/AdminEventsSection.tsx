import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { CalendarDays, MapPin, Monitor, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { useAuthStore } from '@/lib/auth-store'
import {
  createAdminEvent,
  deleteAdminEvent,
  deleteEndedAdminEvents,
  getAdminEvents,
  updateAdminEvent,
} from '@/lib/admin-api'
import { eventStartsAt, isEventEnded } from '@/lib/events-api'
import { EVENT_TYPES, type EventDraft, type EventItem, type EventMode } from '@/types/events'

const emptyDraft = (): EventDraft => ({
  name: '', type: 'Meetup', date: '', time: '', mode: 'Online', location: '', organizer: '',
})

export default function AdminEventsSection() {
  const token = useAuthStore((state) => state.token)
  const [events, setEvents] = useState<EventItem[]>([])
  const [draft, setDraft] = useState<EventDraft>(emptyDraft)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try { setEvents((await getAdminEvents(token)).events) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load events') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [token])
  const sorted = useMemo(() => [...events].sort((a, b) => eventStartsAt(a) - eventStartsAt(b)), [events])
  const endedCount = sorted.filter((event) => isEventEnded(event)).length

  const startCreate = () => { setEditingId(null); setDraft(emptyDraft()); setShowForm(true) }
  const startEdit = (event: EventItem) => {
    setEditingId(event.id)
    setDraft({ name: event.name, type: event.type, date: event.date, time: event.time.slice(0, 5), mode: event.mode, location: event.location, organizer: event.organizer })
    setShowForm(true)
  }
  const cancel = () => { setEditingId(null); setDraft(emptyDraft()); setShowForm(false) }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!token) return
    setSaving(true)
    setError(null)
    const normalized = { ...draft, name: draft.name.trim(), organizer: draft.organizer.trim(), location: draft.mode === 'Offline' ? draft.location.trim() : '' }
    try {
      if (editingId === null) {
        const created = await createAdminEvent(token, normalized)
        setEvents((current) => [...current, created])
      } else {
        const updated = await updateAdminEvent(token, editingId, normalized)
        setEvents((current) => current.map((item) => item.id === updated.id ? updated : item))
      }
      cancel()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save the event') }
    finally { setSaving(false) }
  }

  const remove = async (event: EventItem) => {
    if (!token || !window.confirm(`Delete ${event.name}?`)) return
    try { await deleteAdminEvent(token, event.id); setEvents((current) => current.filter((item) => item.id !== event.id)) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not delete the event') }
  }

  const removeEnded = async () => {
    if (!token || !endedCount || !window.confirm(`Delete all ${endedCount} ended events?`)) return
    try { await deleteEndedAdminEvents(token); setEvents((current) => current.filter((event) => !isEventEnded(event))) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not delete ended events') }
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="eyebrow">Admin / Events</p><h2 className="section-h2">Events</h2><p className="section-body">Publish and manage events shown to contributors.</p></div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? 'animate-spin' : ''} aria-hidden="true" /> Refresh</Button>
          <Button variant="secondary" onClick={() => void removeEnded()} disabled={!endedCount}><Trash2 aria-hidden="true" /> Ended ({endedCount})</Button>
          <Button onClick={startCreate}><Plus aria-hidden="true" /> Add event</Button>
        </div>
      </header>
      {error && <p role="alert" className="border border-accent/40 bg-surface p-3 text-sm text-accent-text">{error}</p>}
      {showForm && <form onSubmit={(event) => void submit(event)} className="space-y-4 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 sm:col-span-2"><span className="text-xs font-mono text-muted-foreground">Event name</span><input required maxLength={200} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="input-field" /></label>
          <label className="grid gap-1.5"><span className="text-xs font-mono text-muted-foreground">Organizer</span><input required maxLength={150} value={draft.organizer} onChange={(event) => setDraft({ ...draft, organizer: event.target.value })} className="input-field" /></label>
          <label className="grid gap-1.5"><span className="text-xs font-mono text-muted-foreground">Type</span><select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })} className="input-field">{EVENT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
          <label className="grid gap-1.5"><span className="text-xs font-mono text-muted-foreground">Date</span><input type="date" required value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} className="input-field" /></label>
          <label className="grid gap-1.5"><span className="text-xs font-mono text-muted-foreground">Time (IST)</span><input type="time" required value={draft.time} onChange={(event) => setDraft({ ...draft, time: event.target.value })} className="input-field" /></label>
          <fieldset className="grid gap-1.5"><legend className="text-xs font-mono text-muted-foreground">Mode</legend><div className="flex gap-2">{(['Online', 'Offline'] as EventMode[]).map((mode) => <Button key={mode} type="button" size="sm" variant={draft.mode === mode ? 'default' : 'secondary'} onClick={() => setDraft({ ...draft, mode, location: mode === 'Online' ? '' : draft.location })}>{mode}</Button>)}</div></fieldset>
          {draft.mode === 'Offline' && <label className="grid gap-1.5 sm:col-span-2"><span className="text-xs font-mono text-muted-foreground">Location</span><input required maxLength={255} value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} className="input-field" /></label>}
        </div>
        <div className="flex justify-end gap-2 border-t border-border pt-4"><Button type="button" variant="secondary" onClick={cancel}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving…' : editingId === null ? 'Create event' : 'Save changes'}</Button></div>
      </form>}
      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex items-center justify-between border-b border-border px-4 py-3"><h3 className="font-mono text-xs font-semibold uppercase tracking-wider">Event list</h3><span className="font-mono text-xs text-muted-foreground">{events.length}</span></header>
        {loading ? <p className="p-8 text-center text-sm text-muted-foreground">Loading events…</p> : sorted.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No events yet.</p> : <div className="divide-y divide-border">{sorted.map((event) => <article key={event.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{event.name}</h3><span className="rounded border border-border px-2 py-0.5 font-mono text-[10px]">{event.type}</span>{isEventEnded(event) && <span className="text-xs text-accent-text">Ended</span>}</div><p className="mt-1 text-sm text-muted-foreground">{event.organizer}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" aria-hidden="true" />{event.date} · {event.time} IST</span><span className="inline-flex items-center gap-1.5">{event.mode === 'Online' ? <Monitor className="size-3.5" aria-hidden="true" /> : <MapPin className="size-3.5" aria-hidden="true" />}{event.mode === 'Online' ? 'Online' : event.location}</span></div></div>
          <div className="flex shrink-0 gap-2"><Button size="sm" variant="secondary" onClick={() => startEdit(event)}><Pencil aria-hidden="true" /> Edit</Button><Button size="sm" variant="outline" onClick={() => void remove(event)} aria-label={`Delete ${event.name}`}><Trash2 aria-hidden="true" /></Button></div>
        </article>)}</div>}
      </section>
    </section>
  )
}