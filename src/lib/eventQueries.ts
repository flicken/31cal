/**
 * Indexed event queries. Views ask for a calendar set and a date range rather
 * than loading the whole events table, so live queries only re-run when
 * events in that range change.
 */
import Dexie from 'dexie';
import { db } from '../models/db';
import { CalendarEvent } from '../models/types';

const LIVE = ['confirmed', 'tentative'];

/**
 * Always look back at least a week, so ordinary events are found even if a
 * write path ever skipped noteDurations().
 */
const MIN_LOOKBACK_MS = 7 * 24 * 3600 * 1000;

/** Record the longest event duration seen per calendar (never shrinks). */
export async function noteDurations(
  calendarId: string,
  events: CalendarEvent[],
) {
  let longest = 0;
  for (const e of events) {
    const d = (e.end?.ms ?? 0) - (e.start?.ms ?? 0);
    if (d > longest) longest = d;
  }
  const current = await db.calendarStats.get(calendarId);
  if (!current || longest > current.maxDurationMs) {
    await db.calendarStats.put({ calendarId, maxDurationMs: longest });
  }
}

/**
 * Events in the given calendars that overlap [startMs, endMs]: start <= endMs
 * and end > startMs. Uses the [calendarId+start.ms] index from
 * startMs - (longest event in that calendar) to endMs.
 */
export async function eventsInRange(
  calendarIds: string[],
  startMs: number,
  endMs: number,
): Promise<CalendarEvent[]> {
  const perCalendar = await Promise.all(
    [...new Set(calendarIds)].map(async (calendarId) => {
      const lookback = Math.max(
        (await db.calendarStats.get(calendarId))?.maxDurationMs ?? 0,
        MIN_LOOKBACK_MS,
      );
      return db.events
        .where('[calendarId+start.ms]')
        .between(
          [calendarId, startMs - lookback],
          [calendarId, endMs],
          true,
          true,
        )
        .filter((e) => e.end?.ms === undefined || e.end.ms > startMs)
        .toArray();
    }),
  );
  return perCalendar.flat();
}

/** Non-cancelled event counts per calendar. */
export async function countsByCalendar(calendarIds: string[]) {
  const counts = await Promise.all(
    calendarIds.map((id) =>
      db.events
        .where('[calendarId+status]')
        .anyOf(LIVE.map((s) => [id, s] as [string, string]))
        .count(),
    ),
  );
  return Object.fromEntries(calendarIds.map((id, i) => [id, counts[i]]));
}

/** Latest `updated` timestamp of a non-cancelled event, per calendar. */
export async function latestUpdateByCalendar(calendarIds: string[]) {
  const latest = await Promise.all(
    calendarIds.map((id) =>
      db.events
        .where('[calendarId+updated]')
        .between([id, Dexie.minKey], [id, Dexie.maxKey])
        .reverse()
        .filter((e) => e.status !== 'cancelled')
        .first(),
    ),
  );
  return Object.fromEntries(
    calendarIds.flatMap((id, i) =>
      latest[i] ? [[id, latest[i]!.updated]] : [],
    ),
  );
}
