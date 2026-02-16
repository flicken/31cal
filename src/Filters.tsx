import React from 'react';

import { useCalendars, useSelectedCalendarIds, useSelectedCalendars } from './lib/hooks';
import { useFilterState } from './lib/FilterStateContext';

import Calendars from './Calendars';
import DateTimeRangeInput, { DateTimeRange } from './DateTimeRangeInput';
import DateTimeInput from './DateTimeInput';

import { Calendar } from './models/types';
import { db } from './models/db';

function Filters() {
  const { eventFilters: filters_, setEventFilters: setFilters } = useFilterState();

  const calOptions = useCalendars() ?? [];
  const calValue = useSelectedCalendars();
  const [, setSelectedCalendarIds] = useSelectedCalendarIds();

  const onCalendarChange = (calendars: Calendar[]) => {
    if (calendars.length > 0 && calendars[0]) {
      db.settings.put({ id: 'calendarDefault', value: calendars[0].id });
    }
    setSelectedCalendarIds(calendars.filter((c) => c).map((c) => c?.id));
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
        value={calValue}
        onChange={onCalendarChange}
      />
      <DateTimeRangeInput
        value={{ ...filters_, text: filters_.rangeText }}
        onChange={setRange}
      />
      <br />
      Updated since{' '}
      <DateTimeInput
        value={{ text: filters_.updatedSinceText, date: filters_.updatedSince }}
        onChange={setUpdatedSince}
      />
      <br />
      {JSON.stringify(filters_)}
    </div>
  );
}

export default Filters;
