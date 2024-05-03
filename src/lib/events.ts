import { CalendarEvent } from '../models/types';

export function keyFor(event: CalendarEvent) {
  return `${event.calendarId}/${event.id}`;
}
