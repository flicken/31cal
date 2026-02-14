import React, { createContext, useContext, useState, Dispatch, SetStateAction } from 'react';
import { DateTime } from 'luxon';
import { CalendarEvent } from '../models/types';
import { FilterValues, FilterInputs } from './filters';

export type EventFilters = {
  rangeText: string;
  start: DateTime;
  end: DateTime;
  updatedSince?: DateTime;
  updatedSinceText?: string;
  showCancelled: boolean;
  calendarId?: string;
};

export type ModEventFilters = FilterValues & FilterInputs;

type FilterState = {
  eventFilters: EventFilters;
  setEventFilters: Dispatch<SetStateAction<EventFilters>>;
  modEventFilters: ModEventFilters;
  setModEventFilters: Dispatch<SetStateAction<ModEventFilters>>;
  modEventMods: Partial<CalendarEvent>;
  setModEventMods: Dispatch<SetStateAction<Partial<CalendarEvent>>>;
};

const FilterStateContext = createContext<FilterState | null>(null);

const defaultEventFilters: EventFilters = {
  rangeText: 'now to end of next month',
  start: DateTime.now(),
  end: DateTime.now().plus({ months: 1 }).endOf('month'),
  updatedSince: undefined,
  updatedSinceText: undefined,
  showCancelled: false,
  calendarId: undefined,
};

const defaultModEventFilters: ModEventFilters = {
  start: DateTime.now(),
  end: DateTime.now().plus({ months: 1 }).endOf('month'),
  showCancelled: false,
  calendarIds: [],
  rangeText: 'now to end of next month',
};

export function FilterStateProvider({ children }: { children: React.ReactNode }) {
  const [eventFilters, setEventFilters] = useState<EventFilters>(defaultEventFilters);
  const [modEventFilters, setModEventFilters] = useState<ModEventFilters>(defaultModEventFilters);
  const [modEventMods, setModEventMods] = useState<Partial<CalendarEvent>>({});

  return (
    <FilterStateContext.Provider
      value={{
        eventFilters,
        setEventFilters,
        modEventFilters,
        setModEventFilters,
        modEventMods,
        setModEventMods,
      }}
    >
      {children}
    </FilterStateContext.Provider>
  );
}

export function useFilterState() {
  const ctx = useContext(FilterStateContext);
  if (!ctx) throw new Error('useFilterState must be used within FilterStateProvider');
  return ctx;
}
