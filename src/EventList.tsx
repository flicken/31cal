import React from 'react';
import { CalendarEvent } from './models/types';
import ViewEvent from './ViewEvent';
import { keyFor } from './lib/events';

function EventList({ events }: { events: Partial<CalendarEvent>[] }) {
  return (
    <div>
      {events &&
        events.map((e, i) => (
          <ViewEvent
            key={
              e.id && e.calendarId
                ? keyFor({ id: e.id, calendarId: e.calendarId })
                : i
            }
            event={e}
          />
        ))}
    </div>
  );
}

export default EventList;
