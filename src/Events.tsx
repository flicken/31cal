import React, { useState } from 'react';

import { useRecoilValue, useRecoilState } from 'recoil';
import { filteredEvents, eventFilters } from './lib/store';
import { useLiveQuery } from 'dexie-react-hooks';

import useDefaultCalendar from './lib/useDefaultCalendar';
import EventList from './EventList';
import DateTimeRangeInput, { DateTimeRange } from './DateTimeRangeInput';
import DateTimeInput from './DateTimeInput';

import { DateTime } from 'luxon';

function Events() {
  console.log('Showing events');
  const [filters_, setFilters] = useRecoilState(eventFilters);
  const eventList = useRecoilValue(filteredEvents);

  const setRange = (newRange: DateTimeRange) => {
    setFilters((f: any) => {
      console.log('newRange', newRange);
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
    <div>
      <DateTimeRangeInput
        value={{ ...filters_, text: filters_.rangeText }}
        onChange={setRange}
      />
      Updated since{' '}
      <DateTimeInput
        value={{ text: filters_.updatedSinceText, date: filters_.updatedSince }}
        onChange={setUpdatedSince}
      />
      <br />
      {JSON.stringify(filters_)}
      <EventList events={eventList.filter((e) => e.status !== 'cancelled')} />
    </div>
  );
}

export default Events;
