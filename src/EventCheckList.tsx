import { Calendar, CalendarEvent } from './models/types';
import React, { ChangeEventHandler } from 'react';
import { ViewStartAndEnd } from './ViewEvent';
import { keyFor } from './lib/events';

export function EventCheckList({
  events,
  setChecked,
  isChecked,
  onAllCheckedSelected,
  calendars,
}: {
  events: CalendarEvent[];
  calendars: Record<string, Calendar & { dirty?: boolean }>;
  setChecked: (event: CalendarEvent, checked: boolean) => void;
  isChecked: (event: CalendarEvent) => boolean;
  onAllCheckedSelected: () => void;
}) {
  if (!events) {
    return null;
  }

  const allChecked = events.length > 0 && events.every(isChecked);

  return (
    <div>
      <input
        type="checkbox"
        checked={allChecked}
        onChange={() => {
          onAllCheckedSelected();
        }}
      />
      {events.map((e, i) => {
        const checked = isChecked(e);
        return (
          <>
            <ViewCheckEvent
              key={keyFor(e)}
              event={e}
              calendar={calendars[e.calendarId]}
              checked={checked}
              onChange={() => {
                setChecked(e, !checked);
              }}
            />
          </>
        );
      })}
    </div>
  );
}

function ViewCheckEvent({
  calendar,
  event,
  checked,
  onChange,
}: {
  calendar: Calendar;
  event: Partial<CalendarEvent>;
  checked: boolean;
  onChange: ChangeEventHandler;
}) {
  return (
    <div
      style={{ border: '2px dotted #bbb, padding: ', padding: '.5rem 1rem' }}
    >
      <span
        style={{
          color: calendar.foregroundColor,
          backgroundColor: calendar.backgroundColor,
        }}
      >
        &nbsp;
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <ViewStartAndEnd start={event.start} end={event.end} />{' '}
      <b style={{ display: 'inline' }}>{event.summary}</b>
    </div>
  );
}
