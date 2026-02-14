import React from 'react';

import { useState, useEffect, useMemo } from 'react';

import { DateTime, Interval } from 'luxon';

import { useFilterState } from './lib/FilterStateContext';
import { useFilteredEvents, usePaperColumns, useSelectedCalendarIds } from './lib/hooks';
import { asArray } from './utils';
import { days } from './Table';

import {
  CalendarEvent,
  isStartEndDate,
  StartEndDate,
  StartEndDateTime,
} from './models/types';

import { intersection } from 'lodash-es';

type TextFilterProps = JSX.IntrinsicElements['input'] & {
  filter: string;
  placeholder?: string;
  onValueChange: (arg0: string) => void;
};

const TextFilter = ({
  filter,
  onValueChange,
  placeholder = 'Filter...',
  onFocus,
  ...rest
}: TextFilterProps) => {
  const [value, setValue] = useState(filter);

  useEffect(() => {
    setValue(filter);
  }, [filter]);

  return (
    <input
      {...rest}
      value={value || ''}
      onChange={(e) => {
        let v = e.target.value;
        setValue(v);
        onValueChange(v);
      }}
      onFocus={onFocus}
      placeholder={placeholder}
    />
  );
};


type EventFilter = (e: CalendarEvent) => Boolean;

export const splitByFilters = (
  events: CalendarEvent[],
  filters: EventFilter[],
) => {
  const matchedIds = new Set();

  const matched = filters.map((f) =>
    events.filter((e) => f(e) && matchedIds.add(e.id)),
  );

  return {
    matched: matched,
    unmatched: events.filter((e) => !matchedIds.has(e.id)),
  };
};

function simple(datetime: DateTime) {
  return datetime.toLocaleString(DateTime.TIME_24_SIMPLE);
}

function tomorrow(day: string) {
  const today = DateTime.fromISO(day);
  return today.plus({ days: 1 }).toISODate();
}

export function showTime(event: CalendarEvent, day: string) {
  if (
    isStartEndDate(event.start) &&
    (!event.end || isStartEndDate(event.end))
  ) {
    const startToday = event.start.date === day;
    const endToday = event.end.date === tomorrow(day);
    if (startToday && endToday) {
      return 'All day';
    } else if (startToday && !endToday) {
      return `Every day until ${event.end.date}`;
    } else if (endToday) {
      return `${event.start.date} until today`;
    } else {
      return '...';
    }
  } else {
    const start = DateTime.fromMillis(event.start.ms!);
    const end = DateTime.fromMillis(event.end.ms!);
    const startToday = start.toISODate() === day;
    const endToday = end.toISODate() === day;
    if (startToday && endToday) {
      return `${simple(start)} - ${simple(end)}`;
    } else if (startToday && !endToday) {
      return `${simple(start)} - ${end.toISODate()}`;
    } else if (endToday) {
      return `${start.toISODate()} -> ${simple(end)}`;
    } else {
      return '...';
    }
  }
}

export const byDate = (events: CalendarEvent[], dates: string[]) => {
  let eventsByDate = new Map<string, CalendarEvent[]>();
  dates.forEach((date) => {
    eventsByDate.set(date, []);
  });
  events.forEach((event) => {
    const start = event.start?.ms
      ? DateTime.fromMillis(event.start.ms)
      : undefined;
    const end = event.end?.ms ? DateTime.fromMillis(event.end.ms) : undefined;
    if (start && end) {
      const keys = intersection(Array.from(days(start, end)), dates);
      for (const resKey of keys) {
        let eventsOnDate = eventsByDate.get(resKey);
        if (!Array.isArray(eventsOnDate)) {
          eventsOnDate = [];
          eventsByDate.set(resKey, eventsOnDate);
        }
        eventsOnDate.push(event);
      }
    }
  });
  return eventsByDate;
};

type ELProps = {
  event: CalendarEvent;
  day: string;
};
const EL = ({ event, day }: ELProps) => {
  let recurring =
    event.recurringEventId &&
    (event.originalStartTime as StartEndDate)?.date ===
      (event.start as StartEndDate).date &&
    (event.originalStartTime as StartEndDateTime)?.dateTime ===
      (event.start as StartEndDateTime).dateTime;

  return (
    <span style={{ color: recurring ? 'green' : 'blue' }}>
      <b>{showTime(event, day)}</b>
      <br />
      {event.summary || event.description || JSON.stringify(event)}
      <br />
    </span>
  );
};

type RowProps = JSX.IntrinsicElements['tr'] & {
  day: string;
  filters: any[];
  events: CalendarEvent[];
};

const dayNames = ['Sun', 'Mon', 'Tues', 'Wed', 'Thur', 'Fri', 'Sat'];

const Row = ({ day, filters, events, style, ...rest }: RowProps) => {
  const [hover, setHover] = useState(false);
  const split = splitByFilters(events, filters);
  const { unmatched, matched } = split;

  const hoverStyle = hover
    ? {
        outline: 'none',
        borderColor: 'red',
        boxShadow: '0 0 10px red',
        filter: 'brightness(.9)',
      }
    : null;

  const dayOfWeek = new Date(day).getDay();
  const dayStyle =
    dayOfWeek == 1
      ? {
          borderTop: 'thin dashed grey',
        }
      : null;

  return (
    <tr
      onMouseEnter={() => {
        setHover(true);
      }}
      onMouseLeave={() => {
        setHover(false);
      }}
      style={{
        verticalAlign: 'top',
        ...style,
        ...hoverStyle,
        ...dayStyle,
      }}
      {...rest}
    >
      <td key="day" style={{ minWidth: '7em', fontWeight: 'bold' }}>
        {day} {dayNames[dayOfWeek]}
      </td>
      {matched.map((columnEvents, index) => (
        <td key={index}>
          {columnEvents.map((event) => (
            <EL key={`${index}/${event.calendarId}/${event.id}`} event={event} day={day} />
          ))}
        </td>
      ))}
      <td key="unmatched">
        {unmatched.map((event) => (
          <EL key={`unmatched/${event.calendarId}/${event.id}`} event={event} day={day} />
        ))}
      </td>
    </tr>
  );
};

function search(regex: RegExp, s?: string) {
  if (!s) return undefined;
  return s.search(regex) >= 0;
}

export default function Paper() {
  const { eventFilters } = useFilterState();
  const [selectedCalendarIds] = useSelectedCalendarIds();

  const allFilters = useMemo(
    () => ({ ...eventFilters, calendarIds: asArray(selectedCalendarIds) }),
    [eventFilters, selectedCalendarIds],
  );

  const events = useFilteredEvents(allFilters);
  const [columns, setColumns] = usePaperColumns();

  const dates = React.useMemo(
    () => Array.from(days(allFilters.start, allFilters.end)),
    [allFilters.start, allFilters.end],
  );

  let eventsByDate = byDate(events, dates);

  let filters = columns
    .map((c) => c && new RegExp(c.replace(/\?/g, ''), 'i'))
    .map((regex) => (event: CalendarEvent) => {
      if (regex) {
        return (
          search(regex, event.summary) ||
          search(regex, event.description) ||
          search(regex, event.location) ||
          event.attendees?.findIndex(
            (a) => search(regex, a.displayName) || search(regex, a.email),
          ) >= 0
        );
      } else {
        return false;
      }
    });

  const columnsToShow = [...columns, ''];
  let list = (
    <table
      style={{
        margin: '0px',
        textAlign: 'left',
        borderCollapse: 'collapse',
      }}
      width="100%"
    >
      <thead>
        <tr>
          <th key="day" style={{ minWidth: '100px' }}>
            Day
          </th>
          {columnsToShow.map((column, index) => (
            <th key={`column-${index}`} style={{ minWidth: '15%' }}>
              <TextFilter
                key={`filter-${index}`}
                filter={column}
                placeholder="Search events..."
                autoFocus={index === 0}
                onValueChange={(v) => {
                  if (index === columns.length) {
                    setColumns([...columns, v]);
                  } else {
                    const c = [...columns];
                    c[index] = v;
                    setColumns(c);
                  }
                }}
              />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {dates.map((day, index) => {
          const even = index % 2;
          return (
            <Row
              key={day}
              day={day}
              events={eventsByDate.get(day) || []}
              filters={filters}
              style={{ backgroundColor: even ? '#fff' : '#f2f2f2' }}
            />
          );
        })}
      </tbody>
    </table>
  );

  let emptyState = (
    <div className="empty">
      <h3>Empty</h3>
    </div>
  );

  return events?.length ? list : emptyState;
}
