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
