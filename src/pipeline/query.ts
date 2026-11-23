/**
 * Pipeline data: the indexed range query narrows by calendar and date, then
 * the compiled conditions do the rest.
 */
import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../models/db';
import { CalendarEvent } from '../models/types';
import { eventsInRange } from '../lib/eventQueries';
import { copiedSources } from '../lib/copies';
import { sortBy } from '../lib/utils';
import {
  calendarIdsOf,
  compile,
  Condition,
  dateRangeOf,
  MatchContext,
} from './filters';

/** Widest range the index accepts: "all time". */
const ALL_TIME: [number, number] = [-8.64e15, 8.64e15];

/** Calendars a filter searches: the ones it names, else the selected ones. */
export function searchedCalendars(
  conditions: Condition[],
  selectedCalendarIds: string[],
): string[] {
  return calendarIdsOf(conditions) ?? selectedCalendarIds;
}

export function msRange(conditions: Condition[]): [number, number] {
  const range = dateRangeOf(conditions);
  return range ? [range.start.toMillis(), range.end.toMillis()] : ALL_TIME;
}

export async function queryPipelineEvents(
  conditions: Condition[],
  selectedCalendarIds: string[],
  ctx: MatchContext = {},
): Promise<CalendarEvent[]> {
  const [start, end] = msRange(conditions);
  const rows = await eventsInRange(
    searchedCalendars(conditions, selectedCalendarIds),
    start,
    end,
  );
  const match = compile(conditions, ctx);
  return sortBy(rows.filter(match), (e) => [e.start.ms, e.end?.ms, e.summary]);
}

/** Live list of events matching the conditions (undefined while loading). */
export function usePipelineEvents(
  conditions: Condition[],
  selectedCalendarIds: string[] | undefined,
  ctx: MatchContext,
): CalendarEvent[] | undefined {
  const key = JSON.stringify(conditions);
  const ids = selectedCalendarIds?.join(',');
  const [start, end] = useMemo(() => msRange(conditions), [conditions]);
  return useLiveQuery(
    () =>
      ids === undefined
        ? undefined
        : queryPipelineEvents(conditions, ids ? ids.split(',') : [], ctx),
    // start/end change daily for relative ranges ("next week").
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, ids, start, end, ctx.userEmail],
  );
}

/** Sources already copied into `calendarId` (for Copy's duplicate check). */
export function useCopiedInto(calendarId: string | undefined) {
  return useLiveQuery(
    async () =>
      calendarId
        ? copiedSources(
            await db.events.where('calendarId').equals(calendarId).toArray(),
          )
        : new Set<string>(),
    [calendarId],
  );
}
