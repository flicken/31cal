import React from 'react';
import { CalendarEvent } from './models/types';
import ViewEvent from './ViewEvent';
import { keyFor } from './lib/events';
import VirtualList from './VirtualList';

const keyOf = (e: Partial<CalendarEvent>, i: number) =>
  e.id && e.calendarId ? keyFor({ id: e.id, calendarId: e.calendarId }) : i;

function EventList({ events }: { events: Partial<CalendarEvent>[] }) {
  return (
    <div>
      <VirtualList
        items={events}
        getKey={keyOf}
        estimateSize={44}
        renderItem={(e) => <ViewEvent event={e} />}
      />
    </div>
  );
}

export default EventList;
