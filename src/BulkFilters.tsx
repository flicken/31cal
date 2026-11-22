import { Dispatch, SetStateAction } from 'react';

import Calendars from './Calendars';
import DateRangeField from './DateRangeField';

import { useCalendars } from './lib/hooks';
import { Calendar } from './models/types';
import { notEmpty } from './lib/utils';
import { FilterValues, FilterInputs } from './lib/filters';

function BulkFilters({
  filters,
  setFilters,
}: {
  filters: FilterValues & FilterInputs;
  setFilters: Dispatch<SetStateAction<FilterValues & FilterInputs>>;
}) {
  const calOptions = useCalendars() ?? [];

  const onCalendarChange = (calendars: Calendar[]) => {
    setFilters((f) => ({
      ...f,
      calendarIds: calendars.filter((c) => c).map((c) => c?.id),
    }));
  };

  return (
    <div
      style={{
        boxShadow:
          '0 0 0 1px rgba(136, 152, 170, 0.1), 0 15px 35px 0 rgba(49, 49, 93, 0.1), 0 5px 15px 0 rgba(0, 0, 0, 0.08)',
        background: '#fff',
      }}
    >
      <Calendars
        options={calOptions}
        value={filters.calendarIds
          .map((id) => calOptions.find((c) => c.id === id))
          .filter(notEmpty)}
        onChange={onCalendarChange}
      />
      <DateRangeField
        label="Dates to edit"
        value={{
          text: filters.rangeText,
          start: filters.start,
          end: filters.end,
          updatedSince: filters.updatedSince,
        }}
        onChange={(v) =>
          setFilters((f) => ({
            ...f,
            rangeText: v.text,
            start: v.start,
            end: v.end,
            updatedSince: v.updatedSince,
          }))
        }
      />
      <input
        name="search"
        type="text"
        size={80}
        placeholder="Search"
        value={filters.searchText ?? ''}
        onChange={(e) => {
          setFilters((f) => ({ ...f, searchText: e.target.value }));
        }}
      />
    </div>
  );
}

export default BulkFilters;
