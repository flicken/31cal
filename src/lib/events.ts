import { DateTime } from 'luxon';
import { CalendarEvent } from '../models/types';
import { days } from './utils';

export function keyFor(event: Pick<CalendarEvent, 'calendarId' | 'id'>) {
  return `${event.calendarId}/${event.id}`;
}

/**
 * The local dates (YYYY-MM-DD) an event occupies. All-day events use their
 * own date strings, so they land on the right days whatever the browser's or
 * calendar's time zone; timed events use the browser's zone.
 */
export function eventDays(
  event: Pick<CalendarEvent, 'start' | 'end'>,
): string[] {
  const start = event.start as { date?: string; ms?: number };
  const end = event.end as { date?: string; ms?: number } | undefined;
  if (start?.date) {
    const first = DateTime.fromISO(start.date);
    const last = end?.date
      ? DateTime.fromISO(end.date)
      : first.plus({ days: 1 });
    const result: string[] = [];
    for (
      let d = first;
      d < last || result.length === 0;
      d = d.plus({ days: 1 })
    ) {
      result.push(d.toISODate()!);
      if (result.length > 3660) break;
    }
    return result;
  }
  if (start?.ms === undefined) return [];
  const s = DateTime.fromMillis(start.ms);
  const e = DateTime.fromMillis(end?.ms ?? start.ms);
  const result = Array.from(days(s, e));
  return result.length ? result : [s.toISODate()!];
}

/** ISO weekday as JS getDay() index (0 = Sunday), without UTC parsing pitfalls. */
export function dayOfWeek(isoDate: string): number {
  return DateTime.fromISO(isoDate).weekday % 7;
}

/** True for an occurrence of a repeating event (any instance of a series). */
export function isRecurring(
  event: Pick<CalendarEvent, 'recurringEventId'>,
): boolean {
  return !!event.recurringEventId;
}

/**
 * A plain warning when some of the events repeat: bulk actions change only
 * the selected occurrences, never the rest of the series.
 */
export function repeatingNote(
  events: Pick<CalendarEvent, 'recurringEventId'>[],
  { copying = false }: { copying?: boolean } = {},
): string | undefined {
  const n = events.filter(isRecurring).length;
  if (n === 0) return undefined;
  const which =
    n === events.length
      ? n === 1
        ? 'This event repeats'
        : `All ${n} events repeat`
      : `${n} of these ${events.length} events repeat`;
  return copying
    ? `${which}. Only the selected occurrences are copied, each as a single event, not the series.`
    : `${which}. Only the selected occurrences change; the other occurrences in each series stay as they are.`;
}
