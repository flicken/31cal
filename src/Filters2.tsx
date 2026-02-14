import { Dispatch, SetStateAction } from 'react';

import Calendars from './Calendars';
import DateTimeRangeInput, { DateTimeRange } from './DateTimeRangeInput';
import DateTimeInput from './DateTimeInput';

import { useCalendars } from './lib/hooks';
import { Calendar } from './models/types';
import { useRef, useState } from 'react';
import { notEmpty } from './utils';
import { FilterValues, FilterInputs } from './lib/filters';

function Filters2({
  filters,
  setFilters,
}: {
  filters: FilterValues & FilterInputs;
  setFilters: Dispatch<SetStateAction<FilterValues & FilterInputs>>;
}) {
  const searchRef = useRef<HTMLInputElement | null>(null);
  const calOptions = useCalendars();

  const onCalendarChange = (calendars: Calendar[]) => {
    setFilters((f) => ({
      ...f,
      calendarIds: calendars.filter((c) => c).map((c) => c?.id),
    }));
  };

  const setRange = (newRange: DateTimeRange) => {
    setFilters((f: any) => {
      if (newRange && newRange.start && newRange.end) {
        return {
          ...f,
          ...{
            start: newRange?.start,
            end: newRange?.end,
            rangeText: newRange.text,
          },
        };
      } else {
        return f;
      }
    });
  };

  const setUpdatedSince = (newUpdatedSince: any) => {
    setFilters((f: any) => {
      return {
        ...f,
        updatedSince: newUpdatedSince?.date,
        updatedSinceText: newUpdatedSince?.text,
      };
    });
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
      <DateTimeRangeInput
        value={{ ...filters, text: filters.rangeText }}
        onChange={setRange}
      />
      <br />
      Updated since{' '}
      <DateTimeInput
        value={{ text: filters.updatedSinceText, date: filters.updatedSince }}
        onChange={setUpdatedSince}
      />
      <input
        name="search"
        type="text"
        size={80}
        placeholder="Search"
        value={filters.searchText}
        onChange={(e) => {
          setFilters((f) => ({ ...f, searchText: e.target.value }));
        }}
      />
    </div>
  );
  {
    /* <Select
        menuIsOpen={true}
        closeMenuOnSelect={false}
        closeMenuOnScroll={false}
        blurInputOnSelect={false}
        components={{ Option, Menu }}
        isMulti={true}
        defaultValue={options[0]}
        options={options}
      /> */
  }
}

export default Filters2;
