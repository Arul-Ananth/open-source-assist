export type EventMode = 'Online' | 'Offline'
export type EventSort = 'date-asc' | 'date-desc' | 'online-first' | 'offline-first'

export interface EventItem {
  id: number
  name: string
  type: string
  date: string
  time: string
  mode: EventMode
  location: string
  organizer: string
  applicationUrl: string
}

export interface EventInput {
  name: string
  organizer: string
  type: string
  date: string
  time: string
  mode: EventMode
  location: string
  applicationUrl: string
}

export type EventDraft = EventInput

export const EVENT_TYPES = [
  'Hackathon',
  'Workshop',
  'Meetup',
  'Conference',
  'Webinar',
  'Coding Contest',
  'Open Source Program',
  'Other',
] as const
