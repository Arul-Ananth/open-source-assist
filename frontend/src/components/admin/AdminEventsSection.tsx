import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CalendarDays, MapPin, Monitor, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/auth-store'
import { createEvent, deleteEvent, listEvents, updateEvent } from '@/lib/events-api'
import { eventStartsAt, formatDate, isEventEnded } from '@/components/dashboard/EventsSection'
import type { EventInput, EventItem, EventMode } from '@/types/events'

const EVENT_TYPES = ['Hackathon', 'Workshop', 'Meetup', 'Conference', 'Webinar', 'Coding Contest', 'Open Source Program', 'Other']

const blank = (): EventInput => ({ name: '', organizer: '', type: 'Meetup', date: '', time: '', mode: 'Online', location: '', applicationUrl: '' })

export default function AdminEventsSection() {
  const token = useAuthStore((s) => s.token)
  const [events, setEvents] = useState<EventItem[]>([])
  const [draft, setDraft] = useState<EventInput | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true); setError(null)
    try { setEvents(await listEvents()) } catch (err) { setError(err instanceof Error ? err.message : 'Could not load events') } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  const sorted = useMemo(() => [...events].sort((a, b) => eventStartsAt(a) - eventStartsAt(b)), [events])
  const ended = sorted.filter((event) => isEventEnded(event))

  const startCreate = () => { setEditingId(null); setDraft(blank()); setError(null) }
  const startEdit = (event: EventItem) => { setEditingId(event.id); setDraft({ name: event.name, organizer: event.organizer, type: event.type, date: event.date, time: event.time, mode: event.mode, location: event.location, applicationUrl: event.applicationUrl }); setError(null) }
  const cancel = () => { setDraft(null); setEditingId(null) }

  const submit = async (formEvent: FormEvent) => {
    formEvent.preventDefault(); if (!draft || !token) return
    if (!draft.name.trim() || !draft.organizer.trim() || !draft.date || !draft.time || !draft.applicationUrl.trim() || (draft.mode === 'Offline' && !draft.location.trim())) return
    setBusy(true); setError(null)
    try {
      const saved = editingId === null ? await createEvent(token, draft) : await updateEvent(token, editingId, draft)
      setEvents((current) => editingId === null ? [...current, saved] : current.map((item) => item.id === saved.id ? saved : item))
      cancel()
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save event') } finally { setBusy(false) }
  }

  const remove = async (event: EventItem) => {
    if (!token || !window.confirm(`Delete “${event.name}”?`)) return
    setBusy(true); setError(null)
    try { await deleteEvent(token, event.id); setEvents((current) => current.filter((item) => item.id !== event.id)); if (editingId === event.id) cancel() }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not delete event') }
    finally { setBusy(false) }
  }

  const removeEnded = async () => {
    if (!token || ended.length === 0 || !window.confirm(`Delete all ${ended.length} ended events?`)) return
    setBusy(true); setError(null)
    try { for (const event of ended) await deleteEvent(token, event.id); setEvents((current) => current.filter((item) => !isEventEnded(item))) }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not delete ended events') }
    finally { setBusy(false) }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="font-mono text-xs uppercase tracking-[0.18em] text-accent-text">Admin / Events</p><h1 className="mt-2 text-2xl font-bold tracking-tight">Events</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Manage the events shown in the public Events section. Changes are stored in the backend database.</p></div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void removeEnded()} disabled={ended.length === 0 || busy} className="inline-flex h-9 items-center gap-2 border border-border bg-surface px-3 text-xs font-semibold shadow-none hover:border-accent disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="size-3.5" /> Delete ended ({ended.length})</button>
          <button type="button" onClick={startCreate} className="inline-flex h-9 items-center gap-2 border border-accent bg-accent px-3 text-xs font-semibold text-on-accent shadow-none hover:bg-accent-hover"><Plus className="size-3.5" /> Add event</button>
          <button type="button" onClick={() => void load()} disabled={loading || busy} className="inline-flex h-9 items-center gap-2 border border-border bg-surface px-3 text-xs font-semibold shadow-none hover:border-accent disabled:opacity-40"><RefreshCw className={cn('size-3.5', loading && 'animate-spin')} /> Refresh</button>
        </div>
      </div>

      {error && <div role="alert" className="border border-accent bg-surface p-3 text-sm text-accent-text">{error}</div>}

      {draft && <form onSubmit={submit} className="border border-border bg-surface p-5 shadow-none">
        <div className="flex items-center justify-between gap-3 border-b border-border pb-4"><div><p className="font-mono text-xs font-semibold uppercase tracking-wider">{editingId === null ? 'Create event' : 'Edit event'}</p><p className="mt-1 text-xs text-muted-foreground">All times are stored as local event time and displayed as IST.</p></div><button type="button" onClick={cancel}><X className="size-4" /></button></div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Event name" className="md:col-span-2"><input required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="input-field shadow-none" /></Field>
          <Field label="Organization"><input required value={draft.organizer} onChange={(e) => setDraft({ ...draft, organizer: e.target.value })} className="input-field shadow-none" /></Field>
          <Field label="Event type"><select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} className="input-field shadow-none">{EVENT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></Field>
          <Field label="Date"><input required type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="input-field shadow-none" /></Field>
          <Field label="Time (IST)"><input required type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} className="input-field shadow-none" /></Field>
          <Field label="Mode"><div className="grid grid-cols-2 gap-2">{(['Online', 'Offline'] as EventMode[]).map((mode) => <button key={mode} type="button" onClick={() => setDraft({ ...draft, mode, location: mode === 'Online' ? '' : draft.location })} className={cn('h-10 border px-3 text-sm font-semibold shadow-none', draft.mode === mode ? 'border-accent bg-accent text-on-accent' : 'border-border bg-background hover:border-accent')}>{mode === 'Online' ? <Monitor className="mr-1 inline size-3.5" /> : <MapPin className="mr-1 inline size-3.5" />}{mode}</button>)}</div></Field>
          <Field label="Registration URL" className="md:col-span-2"><input required type="url" value={draft.applicationUrl} onChange={(e) => setDraft({ ...draft, applicationUrl: e.target.value })} className="input-field shadow-none" placeholder="https://example.com/register" /></Field>
          {draft.mode === 'Offline' && <Field label="Location" className="md:col-span-2"><input required value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} className="input-field shadow-none" /></Field>}
        </div>
        <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4"><button type="button" onClick={cancel} className="h-9 border border-border bg-background px-4 text-xs font-semibold shadow-none">Cancel</button><button disabled={busy} type="submit" className="h-9 border border-accent bg-accent px-4 text-xs font-semibold text-on-accent shadow-none disabled:opacity-50">{busy ? 'Saving…' : editingId === null ? 'Create event' : 'Save changes'}</button></div>
      </form>}

      <div className="border border-border bg-surface shadow-none">
        <div className="flex items-center justify-between border-b border-border px-4 py-3"><p className="font-mono text-xs font-semibold uppercase tracking-wider">Event list</p><span className="font-mono text-[11px] text-muted-foreground">{events.length}</span></div>
        <div className="divide-y divide-border">
          {loading ? <div className="p-10 text-center text-sm text-muted-foreground">Loading events…</div> : sorted.map((event) => <article key={event.id} className="p-4 hover:bg-background"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-semibold">{event.name}</h2><span className="border border-border bg-background px-2 py-0.5 font-mono text-[10px] text-muted-foreground">{event.type}</span>{isEventEnded(event) && <span className="border border-accent bg-surface px-2 py-0.5 font-mono text-[10px] font-semibold text-accent-text">Ended</span>}</div><p className="mt-2 text-sm text-muted-foreground">{event.organizer}</p></div><div className="grid gap-2 text-xs text-muted-foreground lg:text-right"><span className="inline-flex items-center gap-2 lg:justify-end"><CalendarDays className="size-3.5 text-accent-text" />{formatDate(event.date)} · {event.time} IST</span><span className="inline-flex items-center gap-2 lg:justify-end">{event.mode === 'Online' ? <Monitor className="size-3.5 text-accent-text" /> : <MapPin className="size-3.5 text-accent-text" />}{event.mode === 'Online' ? 'Online' : event.location}</span></div><div className="flex shrink-0 gap-2"><button type="button" disabled={busy} onClick={() => startEdit(event)} className="inline-flex h-8 items-center gap-1.5 border border-border bg-background px-2.5 text-xs font-semibold shadow-none hover:border-accent disabled:opacity-40"><Pencil className="size-3.5" /> Edit</button><button type="button" disabled={busy} onClick={() => void remove(event)} className="inline-flex h-8 items-center gap-1.5 border border-accent bg-surface px-2.5 text-xs font-semibold text-accent-text shadow-none hover:bg-accent hover:text-on-accent disabled:opacity-40"><Trash2 className="size-3.5" /> Delete</button></div></div></article>)}
          {!loading && events.length === 0 && <div className="p-10 text-center text-sm text-muted-foreground">No events have been created yet.</div>}
        </div>
      </div>
    </section>
  )
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return <label className={cn('grid gap-2', className)}><span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>{children}</label>
}
