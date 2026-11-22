import { useCallback, useMemo, useState } from 'react';
import { CalendarEvent } from '../models/types';
import { FilterInputs, FilterValues, filterForFilters } from './filters';
import { safeRegExp } from './regex';
import { sortBy } from './utils';
import { keyFor } from './events';

/**
 * Events matching the bulk-edit filters, with the search text as a
 * case-insensitive pattern and the optional replacement applied to summaries
 * for preview. Invalid patterns fall back to literal text.
 */
export function useMatchingEvents(
  allEvents: CalendarEvent[],
  filters: FilterValues & FilterInputs,
) {
  return useMemo(() => {
    const filter = filterForFilters(filters);
    const { regex, error } = safeRegExp(filters.searchText ?? '');
    const matches = filters.searchText
      ? (e: CalendarEvent) => regex.test(e.summary ?? '')
      : () => true;
    const replace = filters.replaceText
      ? (e: CalendarEvent) => ({
          ...e,
          summary: e.summary?.replace(regex, filters.replaceText!),
        })
      : (e: CalendarEvent) => e;
    const events = sortBy(
      allEvents.filter(filter).filter(matches).map(replace),
      (e) => [e.start.ms, e.end?.ms],
    );
    return { events, regexError: error };
  }, [allEvents, filters]);
}

/** A set of checked events keyed by calendar/id. */
export function useEventSelection(events: CalendarEvent[]) {
  const [checked, setCheckedKeys] = useState<Set<string>>(new Set());

  const isChecked = useCallback(
    (e: CalendarEvent) => checked.has(keyFor(e)),
    [checked],
  );
  const setChecked = useCallback((e: CalendarEvent, on: boolean) => {
    setCheckedKeys((old) => {
      const next = new Set(old);
      if (on) next.add(keyFor(e));
      else next.delete(keyFor(e));
      return next;
    });
  }, []);
  const toggleAll = useCallback(() => {
    setCheckedKeys((old) =>
      events.length > 0 && events.every((e) => old.has(keyFor(e)))
        ? new Set()
        : new Set(events.map(keyFor)),
    );
  }, [events]);
  const selected = useMemo(() => events.filter(isChecked), [events, isChecked]);
  const replace = useCallback(
    (es: CalendarEvent[]) => setCheckedKeys(new Set(es.map(keyFor))),
    [],
  );

  return { isChecked, setChecked, toggleAll, selected, replace };
}
