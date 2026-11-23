import React from 'react';
import { CalendarEvent } from './models/types';
import ViewEvent from './ViewEvent';
import { keyFor } from './lib/events';
import RowList from './RowList';

const keyOf = (e: Partial<CalendarEvent>, i: number) =>
  e.id && e.calendarId ? keyFor({ id: e.id, calendarId: e.calendarId }) : i;

function EventList({ events }: { events: Partial<CalendarEvent>[] }) {
  return (
    <div>
      <RowList
        items={events}
        getKey={keyOf}
        renderItem={(e) => <ViewEvent event={e} />}
      />
    </div>
  );
}

export default EventList;
