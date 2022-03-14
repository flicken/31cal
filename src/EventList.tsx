import React from 'react';
import { CalendarEvent } from './models/types';
import ViewEvent from './ViewEvent';

function keyFor(event: Partial<CalendarEvent>, i: number) {
  return event.id ? `${event.calendarId}/${event.id}` : i.toString();
}

function EventList({ events }: { events: Partial<CalendarEvent>[] }) {
  return (
    <div>
      {events &&
        events.map((e, i) => <ViewEvent key={keyFor(e, i)} event={e} />)}
    </div>
  );
}

export default EventList;
