import React, { useState } from 'react';

import { useRecoilValue, useRecoilState } from 'recoil';
import { filteredEvents, allEventFilters, eventFilters } from './lib/store';
import { useLiveQuery } from 'dexie-react-hooks';

import useDefaultCalendar from './lib/useDefaultCalendar';
import EventList from './EventList';
import DateTimeRangeInput, { DateTimeRange } from './DateTimeRangeInput';

import { DateTime } from 'luxon';

function Events() {
  const [range, _] = useRecoilState(allEventFilters);
  const [_ignored, setFilters] = useRecoilState(eventFilters);
  const eventList = useRecoilValue(filteredEvents);

  const setRange = (newRange) => {
    setFilters((f: any) => {
      return { ...f, ...newRange };
    });
  };

  return (
    <div>
      <DateTimeRangeInput value={range} onChange={setRange} />
      <br />
      {JSON.stringify(range)}
      <EventList events={eventList.filter((e) => e.status !== 'cancelled')} />
    </div>
  );
}

export default Events;
