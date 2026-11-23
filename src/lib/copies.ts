import { CalendarEvent } from '../models/types';

/** Private extended properties recording where a copy came from (values must be strings). */
export const COPIED_FROM_ID = '31cal.copiedFromId';
export const COPIED_FROM_CALENDAR = '31cal.copiedFromCalendarId';

export const sourceKey = (calendarId: string, id: string) =>
  `${calendarId}/${id}`;

/** Sources already copied (and not deleted) among `events`, as calendar/id keys. */
export function copiedSources(events: Iterable<CalendarEvent>): Set<string> {
  const set = new Set<string>();
  for (const e of events) {
    const p = e.extendedProperties?.private;
    if (
      e.status !== 'cancelled' &&
      p?.[COPIED_FROM_ID] &&
      p[COPIED_FROM_CALENDAR]
    ) {
      set.add(sourceKey(p[COPIED_FROM_CALENDAR], p[COPIED_FROM_ID]));
    }
  }
  return set;
}
