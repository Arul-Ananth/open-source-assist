import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react'
import { CalendarDays, MapPin, Monitor, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/auth-store'
import { createAdminEvent, deleteAdminEvent, deleteEndedAdminEvents, getAdminEvents, updateAdminEvent } from '@/lib/admin-api'
import { EVENT_TYPES, type EventDraft, type EventItem, type EventMode } from '@/types/events'
import { eventStartsAt, isEventEnded } from '@/lib/events-api'

const emptyDraft = (): EventDraft => ({
  name: '',
  type: 'Meetup',
  date: '',
  time: '',
  mode: 'Online',
  location: '',
  organizer: '',
})

const formatDate = (date: string) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00`))

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
    try {
      const data = await getAdminEvents(token)
      setEvents(data.events)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load events')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [token])

  const sorted = useMemo(() => [...events].sort((a, b) => eventStartsAt(a) - eventStartsAt(b)), [events])
  const endedCount = sorted.filter((event) => isEventEnded(event)).length

  const startCreate = () => {
    setEditingId(null)
    setDraft(emptyDraft())
    setShowForm(true)
  }

  const startEdit = (event: EventItem) => {
    setEditingId(event.id)
    setDraft({ name: event.name, type: event.type, date: event.date, time: event.time.slice(0, 5), mode: event.mode, location: event.location, organizer: event.organizer })
    setShowForm(true)
  }

  const cancel = () => {
    setEditingId(null)
    setDraft(emptyDraft())
    setShowForm(false)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!token || !draft.name.trim() || !draft.organizer.trim() || !draft.date || !draft.time) return
    setSaving(true)
    setError(null)
    try {
      const normalized = { ...draft, name: draft.name.trim(), organizer: draft.organizer.trim(), location: draft.mode === 'Offline' ? draft.location.trim() : '' }
      if (editingId === null) {
        const created = await createAdminEvent(token, normalized)
        setEvents((current) => [...current, created])
      } else {
        const updated = await updateAdminEvent(token, editingId, normalized)
        setEvents((current) => current.map((item) => item.id === updated.id ? updated : item))
      }
      cancel()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the event')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: number) => {
    if (!token) return
    const event = events.find((item) => item.id === id)
    if (!event || !window.confirm(`Delete “${event.name}”?`)) return
    setError(null)
    try {
      await deleteAdminEvent(token, id)
      setEvents((current) => current.filter((item) => item.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the event')
    }
  }

  const removeEnded = async () => {
    if (!token || endedCount === 0) return
    if (!window.confirm(`Delete all ${endedCount} ended events?`)) return
    setError(null)
    try {
      await deleteEndedAdminEvents(token)
      setEvents((current) => current.filter((event) => !isEventEnded(event)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete ended events')
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent-text">Admin / Events</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Events</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Create and manage the same event format shown to contributors.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-9 items-center gap-2 border border-border bg-surface px-3 text-xs font-semibold shadow-none hover:border-accent hover:shadow-[3px_3px_0px_0px_var(--color-border)]"><RefreshCw className={cn('size-3.5', loading && 'animate-spin')} /> Refresh</button>
          <button type="button" onClick={() => void removeEnded()} disabled={endedCount === 0} className="inline-flex h-9 items-center gap-2 border border-border bg-surface px-3 text-xs font-semibold shadow-none hover:border-accent hover:shadow-[3px_3px_0px_0px_var(--color-border)] disabled:opacity-40"><Trash2 className="size-3.5" /> Delete ended ({endedCount})</button>
          <button type="button" onClick={startCreate} className="inline-flex h-9 items-center gap-2 border border-accent bg-accent px-3 text-xs font-semibold text-on-accent shadow-none hover:bg-accent-hover hover:shadow-[3px_3px_0px_0px_var(--color-border)]"><Plus className="size-3.5" /> Add event</button>
        </div>
      </div>

      {error && <div className="border border-accent bg-surface p-3 text-sm text-accent-text shadow-none">{error}</div>}

      {showForm && (
        <form onSubmit={(event) => void submit(event)} className="border border-border bg-surface p-5 shadow-none">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div><p className="font-mono text-xs font-semibold uppercase tracking-wider">{editingId === null ? 'Create event' : 'Edit event'}</p><p className="mt-1 text-xs text-muted-foreground">Time is stored and displayed in IST.</p></div>
            <button type="button" onClick={cancel} aria-label="Close form" className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Event name" className="md:col-span-2"><input required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="input-field shadow-none" placeholder="Open Source Sprint 2026" /></Field>
            <Field label="Organization"><input required value={draft.organizer} onChange={(e) => setDraft({ ...draft, organizer: e.target.value })} className="input-field shadow-none" placeholder="Open Source India" /></Field>
            <Field label="Event type"><select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} className="input-field shadow-none">{EVENT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></Field>
            <Field label="Date"><input required type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="input-field shadow-none" /></Field>
            <Field label="Time (IST)"><input required type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} className="input-field shadow-none" /></Field>
            <Field label="Event mode"><div className="grid grid-cols-2 gap-2">{(['Online', 'Offline'] as EventMode[]).map((mode) => <button key={mode} type="button" onClick={() => setDraft({ ...draft, mode, location: mode === 'Online' ? '' : draft.location })} className={cn('h-10 border px-3 text-sm font-semibold shadow-none', draft.mode === mode ? 'border-accent bg-accent text-on-accent' : 'border-border bg-background text-muted-foreground hover:border-accent hover:text-accent-text')}>{mode}</button>)}</div></Field>
            {draft.mode === 'Offline' && <Field label="Location" className="md:col-span-2"><input required value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} className="input-field shadow-none" placeholder="Bengaluru Tech Hub" /></Field>}
          </div>
          <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4"><button type="button" onClick={cancel} className="h-9 border border-border bg-background px-4 text-xs font-semibold shadow-none hover:border-accent">Cancel</button><button disabled={saving} type="submit" className="h-9 border border-accent bg-accent px-4 text-xs font-semibold text-on-accent shadow-none hover:bg-accent-hover hover:shadow-[3px_3px_0px_0px_var(--color-border)] disabled:opacity-50">{saving ? 'Saving…' : editingId === null ? 'Create event' : 'Save changes'}</button></div>
        </form>
      )}

      <div className="border border-border bg-surface shadow-none">
        <div className="flex items-center justify-between border-b border-border px-4 py-3"><p className="font-mono text-xs font-semibold uppercase tracking-wider">Event list</p><span className="font-mono text-[11px] text-muted-foreground">{events.length}</span></div>
        {loading ? <div className="p-10 text-center text-sm text-muted-foreground">Loading events…</div> : <div className="divide-y divide-border">{sorted.map((event) => { const ended = isEventEnded(event); return <article key={event.id} className="p-4 transition-colors hover:bg-background"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-semibold">{event.name}</h2><span className="border border-border bg-background px-2 py-0.5 font-mono text-[10px] text-muted-foreground">{event.type}</span>{ended && <span className="border border-accent bg-surface px-2 py-0.5 font-mono text-[10px] font-semibold text-accent-text">Ended</span>}</div><p className="mt-2 text-sm text-muted-foreground">{event.organizer}</p></div><div className="grid gap-2 text-xs text-muted-foreground lg:text-right"><span className="inline-flex items-center gap-2 lg:justify-end"><CalendarDays className="size-3.5 text-accent-text" />{formatDate(event.date)} · {event.time.slice(0, 5)} IST</span><span className="inline-flex items-center gap-2 lg:justify-end">{event.mode === 'Online' ? <Monitor className="size-3.5 text-accent-text" /> : <MapPin className="size-3.5 text-accent-text" />}{event.mode === 'Online' ? 'Online' : event.location}</span></div><div className="flex shrink-0 gap-2 lg:pt-0.5"><button type="button" onClick={() => startEdit(event)} className="inline-flex h-8 items-center gap-1.5 border border-border bg-background px-2.5 text-xs font-semibold shadow-none hover:border-accent hover:text-accent-text hover:shadow-[3px_3px_0px_0px_var(--color-border)]"><Pencil className="size-3.5" /> Edit</button><button type="button" onClick={() => void remove(event.id)} className="inline-flex h-8 items-center gap-1.5 border border-accent bg-surface px-2.5 text-xs font-semibold text-accent-text shadow-none hover:bg-accent hover:text-on-accent hover:shadow-[3px_3px_0px_0px_var(--color-border)]"><Trash2 className="size-3.5" /> Delete</button></div></div></article> })}{events.length === 0 && <div className="p-10 text-center text-sm text-muted-foreground">No events have been created yet.</div>}</div>}
      </div>
    </section>
  )
}

function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return <label className={cn('grid gap-2', className)}><span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>{children}</label>
}
