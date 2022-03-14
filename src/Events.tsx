import React, { useState } from 'react';

import { db } from './models/db';
import { useLiveQuery } from 'dexie-react-hooks';

import useDefaultCalendar from './lib/useDefaultCalendar';
import EventList from './EventList';
import DateTimeRangeInput, { DateTimeRange } from './DateTimeRangeInput';

import { DateTime } from 'luxon';

function Events() {
  const defaultCalendar = useDefaultCalendar();

  const [now, setNow] = useState(DateTime.now());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setNow(DateTime.now());
    }, 60 * 1000);
    return () => {
      clearInterval(timer);
    };
  }, [setNow]);

  const defaultStart = now.startOf('day');
  const [range, onRangeChange] = useState<DateTimeRange>({
    start: defaultStart,
    end: defaultStart.plus({ months: 1 }).endOf('month'),
  });

  const start = range.start || defaultStart;
  const end = range.end || start.plus({ months: 1 }).endOf('month');

  const eventList = useLiveQuery(() => {
    let query = db.events;
    if (defaultCalendar) {
      return query
        .where(['calendarId', 'start.ms'])
        .between(
          [defaultCalendar.id, start.toMillis()],
          [defaultCalendar.id, end.toMillis()],
          true,
          true,
        )
        .toArray();
    } else {
      return query.where('id').notEqual('').toArray();
    }
  }, [defaultCalendar, range, start, end]);

  if (!defaultCalendar || !eventList) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <DateTimeRangeInput value={range} onChange={onRangeChange} />
      <br />
      {JSON.stringify(range)}
      <EventList events={eventList.filter((e) => e.status !== 'cancelled')} />
    </div>
  );
}

export default Events;
