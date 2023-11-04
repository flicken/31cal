import { DateTime } from 'luxon';
import { CalendarEvent } from '../models/types';

export type FilterValues = {
  start: DateTime;
  end: DateTime;
  updatedSince?: DateTime;
  showCancelled: boolean;
  calendarIds: string[];
};

export type FilterInputs = {
  rangeText: string;
  updatedSinceText?: string;
  searchText?: string;
  replaceText?: string;
};

export function filterForFilters(filters: FilterValues) {
  const startMs = filters.start.toMillis();
  const endMs = filters.end.toMillis();
  const updatedSinceString = filters.updatedSince?.toUTC()?.toISO();
  const selectedCalendarIds = new Set(filters.calendarIds);

  return (e: CalendarEvent) => {
    return (
      (filters.showCancelled || e.status != 'cancelled') &&
      (!e.end?.ms || startMs < e.end?.ms) &&
      (!e.start?.ms || e.start?.ms <= endMs) &&
      (!filters.calendarIds || selectedCalendarIds.has(e.calendarId)) &&
      (!updatedSinceString || e.updated > updatedSinceString)
    );
  };
}
