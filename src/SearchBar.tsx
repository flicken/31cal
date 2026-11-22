import React, { useCallback } from 'react';
import { DEFAULT_RANGE, useFilterState } from './lib/FilterStateContext';
import { SEARCH_EXAMPLES } from './lib/syntaxExamples';
import DateRangeField, { DateRangeValue } from './DateRangeField';

/** The top bar's date range, shared by every view. */
export default function SearchBar() {
  const { eventFilters: filters, setEventFilters: setFilters } =
    useFilterState();

  const onChange = useCallback(
    (v: DateRangeValue) =>
      setFilters((f) => ({
        ...f,
        rangeText: v.text,
        start: v.start,
        end: v.end,
        updatedSince: v.updatedSince,
      })),
    [setFilters],
  );

  return (
    <DateRangeField
      label="Date range"
      value={{
        text: filters.rangeText,
        start: filters.start,
        end: filters.end,
        updatedSince: filters.updatedSince,
      }}
      onChange={onChange}
      defaultText={DEFAULT_RANGE}
      examples={SEARCH_EXAMPLES}
    />
  );
}
