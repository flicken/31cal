import { readableOn } from './lib/contrast';
import { Calendar, CalendarEvent } from './models/types';
import React from 'react';
import { ViewStartAndEnd } from './ViewStartAndEnd';
import { keyFor } from './lib/events';
import RowList from './RowList';

export function EventCheckList({
  events,
  setChecked,
  isChecked,
  onAllCheckedSelected,
  calendars,
}: {
  events: CalendarEvent[];
  calendars: Record<string, Calendar>;
  setChecked: (event: CalendarEvent, checked: boolean) => void;
  isChecked: (event: CalendarEvent) => boolean;
  onAllCheckedSelected: () => void;
}) {
  const checkedCount = events.filter(isChecked).length;
  const allChecked = events.length > 0 && checkedCount === events.length;

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={allChecked}
          ref={(el) => {
            if (el) el.indeterminate = checkedCount > 0 && !allChecked;
          }}
          onChange={onAllCheckedSelected}
        />{' '}
        Select all ({checkedCount} of {events.length} selected)
      </label>
      <RowList
        items={events}
        getKey={(e) => keyFor(e)}
        renderItem={(e) => (
          <ViewCheckEvent
            event={e}
            calendar={calendars[e.calendarId]}
            checked={isChecked(e)}
            onChange={(on) => setChecked(e, on)}
          />
        )}
      />
    </div>
  );
}

function ViewCheckEvent({
  calendar,
  event,
  checked,
  onChange,
}: {
  calendar?: Calendar;
  event: Partial<CalendarEvent>;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label style={{ display: 'block', padding: '.5rem 1rem' }}>
      <span
        title={calendar?.summary}
        aria-hidden="true"
        style={{
          color:
            calendar &&
            readableOn(calendar.backgroundColor, calendar.foregroundColor),
          backgroundColor: calendar?.backgroundColor,
        }}
      >
        &nbsp;
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <ViewStartAndEnd start={event.start} end={event.end} />{' '}
      <b style={{ display: 'inline' }}>{event.summary}</b>
    </label>
  );
}
