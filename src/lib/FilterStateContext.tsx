import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  Dispatch,
  SetStateAction,
} from 'react';
import { DateTime } from 'luxon';
import { FilterValues, FilterInputs } from './filters';
import { parseSearchText } from './searchTextParser';

export type EventFilters = {
  rangeText: string;
  start: DateTime;
  end: DateTime;
  updatedSince?: DateTime;
  showCancelled: boolean;
  calendarId?: string;
};

export type ModEventFilters = FilterValues & FilterInputs;

type FilterState = {
  eventFilters: EventFilters;
  setEventFilters: Dispatch<SetStateAction<EventFilters>>;
  modEventFilters: ModEventFilters;
  setModEventFilters: Dispatch<SetStateAction<ModEventFilters>>;
};

const FilterStateContext = createContext<FilterState | null>(null);

export const DEFAULT_RANGE = 'now to end of next month';

export const defaultEventFilters = (): EventFilters => ({
  rangeText: DEFAULT_RANGE,
  start: DateTime.now(),
  end: DateTime.now().plus({ months: 1 }).endOf('month'),
  updatedSince: undefined,
  showCancelled: false,
  calendarId: undefined,
});

const defaultModEventFilters = (): ModEventFilters => ({
  start: DateTime.now(),
  end: DateTime.now().plus({ months: 1 }).endOf('month'),
  showCancelled: false,
  calendarIds: [],
  rangeText: DEFAULT_RANGE,
});

/**
 * Relative ranges ("now to end of next month") go stale in a tab left open
 * for days: re-evaluate the range text when the date changes.
 */
function useRefreshOnNewDay(
  setEventFilters: Dispatch<SetStateAction<EventFilters>>,
) {
  useEffect(() => {
    let computedOn = DateTime.now().toISODate();
    const refresh = () => {
      const today = DateTime.now().toISODate();
      if (today === computedOn) return;
      computedOn = today;
      setEventFilters((f) => {
        const { start, end } = parseSearchText(f.rangeText);
        return start && end ? { ...f, start, end } : f;
      });
    };
    const timer = setInterval(refresh, 10 * 60 * 1000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [setEventFilters]);
}

export function FilterStateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [eventFilters, setEventFilters] =
    useState<EventFilters>(defaultEventFilters);
  const [modEventFilters, setModEventFilters] = useState<ModEventFilters>(
    defaultModEventFilters,
  );
  useRefreshOnNewDay(setEventFilters);

  const value = useMemo(
    () => ({
      eventFilters,
      setEventFilters,
      modEventFilters,
      setModEventFilters,
    }),
    [eventFilters, modEventFilters],
  );

  return (
    <FilterStateContext.Provider value={value}>
      {children}
    </FilterStateContext.Provider>
  );
}

export function useFilterState() {
  const ctx = useContext(FilterStateContext);
  if (!ctx)
    throw new Error('useFilterState must be used within FilterStateProvider');
  return ctx;
}

/**
 * Seed the bulk-edit filters (ModMany, CopyFrom) from the global filters once
 * per page visit, after the calendar selection has loaded.
 */
export function useSeedModFilters(selectedCalendarIds: string[] | undefined) {
  const { eventFilters, setModEventFilters } = useFilterState();
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || !selectedCalendarIds) return;
    seeded.current = true;
    setModEventFilters((f) => ({
      ...f,
      ...eventFilters,
      calendarIds: selectedCalendarIds,
    }));
  }, [selectedCalendarIds, eventFilters, setModEventFilters]);
}
