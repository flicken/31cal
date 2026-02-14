import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from '../models/db';
import { Calendar, CalendarEvent } from '../models/types';
import { sortBy, countBy } from 'lodash-es';
import { filterForFilters, FilterValues } from './filters';
import { asArray } from '../utils';

export function useCalendars(): Calendar[] {
  return useLiveQuery(() => db.calendars.orderBy('summary').toArray()) ?? [];
}

export function useEvents(): CalendarEvent[] {
  return (
    useLiveQuery(() => db.events.orderBy('[start.ms+end.ms]').toArray()) ?? []
  );
}

export function useSelectedCalendarIds(): [
  string[],
  (ids: string[]) => void,
] {
  const ids =
    useLiveQuery(() =>
      db.settings.get('selectedCalendars').then((v) => (v ? v.value : [])),
    ) ?? [];

  const setIds = (newIds: string[]) => {
    db.settings.put({ id: 'selectedCalendars', value: newIds });
  };

  return [asArray(ids) as string[], setIds];
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

export function useSelectedCalendars(): Calendar[] {
  const calendars = useCalendars();
  const [selectedIds] = useSelectedCalendarIds();

  return useMemo(() => {
    const ids = Array.isArray(selectedIds) ? selectedIds : [selectedIds];
    return ids
      .map((id: string) => calendars.find((c) => c.id === id)!)
      .filter((c) => Boolean(c));
  }, [calendars, selectedIds]);
}

export function useCountsByCalendar(): Record<string, number> {
  const events = useEvents();
  return useMemo(
    () =>
      countBy(
        events.filter((e) => e.status != 'cancelled'),
        (e) => e.calendarId,
      ),
    [events],
  );
}

export function useDefaultCalendarValues() {
  const calendars = useCalendars();
  const defaultId = useLiveQuery(() =>
    db.settings.get('selectedCalendars').then((v) => {
      const val = v?.value;
      return Array.isArray(val) ? val[0] : val;
    }),
  );

  return useMemo(
    () => calendars.find((c) => c.id === defaultId),
    [calendars, defaultId],
  );
}

export function useFilteredEvents(filters: FilterValues): CalendarEvent[] {
  const events = useEvents();
  return useMemo(() => {
    const filter = filterForFilters(filters);
    return sortBy(events.filter(filter), (e) => [e.start.ms, e.end?.ms]);
  }, [events, filters]);
}
