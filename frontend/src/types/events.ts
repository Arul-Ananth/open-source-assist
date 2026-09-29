export type EventMode = 'Online' | 'Offline'

export interface EventItem {
  id: number
  name: string
  type: string
  date: string
  time: string
  mode: EventMode
  location: string
  organizer: string
}

export type EventDraft = Omit<EventItem, 'id'>

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
