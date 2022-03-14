import React from 'react';
import { CalendarEvent } from './lib/types';
import ViewEvent from './ViewEvent';

function keyFor(event: CalendarEvent, i: number) {
  return event.id ? `${event.calendarId}/${event.id}` : i;
}
function EventList({ events }: { events: CalendarEvent[] }) {
  return (
    <div>
      {events &&
        events.map((e, i) => <ViewEvent key={keyFor(e, i)} event={e} />)}
    </div>
  );
}

export default EventList;
