import React from 'react';
import { CalendarEvent } from './lib/types';
import ViewEvent from './ViewEvent';

function EventList({ events }: { events: CalendarEvent[] }) {
  return (
    <div>
      {events &&
        events.map((e) => (
          <ViewEvent key={`${e.calendarId}/${e.id}`} event={e} />
        ))}
    </div>
  );
}

export default EventList;
