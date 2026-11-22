import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from '../models/db';
import { Calendar, CalendarEvent } from '../models/types';
import { sortBy } from './utils';
import {
  countsByCalendar,
  eventsInRange,
  latestUpdateByCalendar,
} from './eventQueries';
import { filterForFilters, FilterValues } from './filters';
import { asArray } from './utils';

export async function calendarsQuery(): Promise<Calendar[]> {
  return db.calendars.orderBy('summary').toArray();
}

export function useCalendars(): Calendar[] | undefined {
  return useLiveQuery(calendarsQuery);
}

/** Total number of cached events (cheap; no rows are loaded). */
export function useEventCount(): number | undefined {
  return useLiveQuery(() => db.events.count());
}

/**
 * Earliest start and latest end among cached events (two index reads), for
 * the "Everything" / "All upcoming" date presets. Undefined until loaded or
 * when nothing is cached.
 */
export function useEventBounds():
  { first?: number; last?: number } | undefined {
  return useLiveQuery(async () => {
    const [first, last] = await Promise.all([
      db.events.orderBy('[start.ms+end.ms]').first(),
      db.events.orderBy('[start.ms+end.ms]').last(),
    ]);
    return { first: first?.start.ms, last: last?.end.ms ?? last?.start.ms };
  });
}

const NO_IDS: string[] = [];

/** [selected ids, setter, loaded]; ids are [] until the setting has loaded. */
export function useSelectedCalendarIds(): [
  string[],
  (ids: string[]) => void,
  boolean,
] {
  const ids = useLiveQuery(() =>
    db.settings
      .get('selectedCalendars')
      .then((v) => asArray(v ? v.value : []) as string[]),
  );

  const setIds = (newIds: string[]) => {
    db.settings.put({ id: 'selectedCalendars', value: newIds });
  };

  return [ids ?? NO_IDS, setIds, ids !== undefined];
}

export function autoSelectCalendarIds(calendars: Calendar[]): string[] {
  const primary = calendars.find((c) => c.primary);
  const rest = calendars.filter((c) => c.selected && !c.primary);
  return [primary, ...rest].filter(Boolean).map((c) => c!.id);
}

export function usePaperColumns(): [string[], (cols: string[]) => void] {
  const cols =
    useLiveQuery(() =>
      db.settings
        .get('paperColumns')
        .then((obj) => (obj?.value as string[]) ?? []),
    ) ?? [];

  const setCols = (newCols: string[]) => {
    db.settings.put({ id: 'paperColumns', value: newCols });
  };

  return [cols, setCols];
}

export function useSelectedCalendars(): Calendar[] | undefined {
  const calendars = useCalendars();
  const [selectedIds] = useSelectedCalendarIds();

  return useMemo(() => {
    if (!calendars) return undefined;
    const ids = Array.isArray(selectedIds) ? selectedIds : [selectedIds];
    return ids
      .map((id: string) => calendars.find((c) => c.id === id)!)
      .filter((c) => Boolean(c));
  }, [calendars, selectedIds]);
}

export function useCountsByCalendar(): Record<string, number> | undefined {
  const calendars = useCalendars();
  const ids = calendars?.map((c) => c.id).join(',');
  return useLiveQuery(
    () =>
      ids === undefined
        ? undefined
        : countsByCalendar(ids ? ids.split(',') : []),
    [ids],
  );
}

export function useLatestUpdateByCalendar():
  Record<string, string> | undefined {
  const calendars = useCalendars();
  const ids = calendars?.map((c) => c.id).join(',');
  return useLiveQuery(
    () =>
      ids === undefined
        ? undefined
        : latestUpdateByCalendar(ids ? ids.split(',') : []),
    [ids],
  );
}

export function useDefaultCalendar() {
  const calendars = useCalendars();
  const defaultId = useLiveQuery(() =>
    db.settings.get('selectedCalendars').then((v) => {
      const val = v?.value;
      return Array.isArray(val) ? val[0] : val;
    }),
  );

  return useMemo(
    () => calendars?.find((c) => c.id === defaultId),
    [calendars, defaultId],
  );
}

/**
 * Events matching the filters, sorted by start. Only the selected calendars
 * and date range are read from IndexedDB (see eventQueries.ts).
 */
export function useFilteredEvents(
  filters: FilterValues,
): CalendarEvent[] | undefined {
  const startMs = filters.start.toMillis();
  const endMs = filters.end.toMillis();
  const ids = filters.calendarIds.join(',');
  const inRange = useLiveQuery(
    () => eventsInRange(ids ? ids.split(',') : [], startMs, endMs),
    [ids, startMs, endMs],
  );
  return useMemo(() => {
    if (!inRange) return undefined;
    const filter = filterForFilters(filters);
    return sortBy(inRange.filter(filter), (e) => [e.start.ms, e.end?.ms]);
  }, [inRange, filters]);
}
