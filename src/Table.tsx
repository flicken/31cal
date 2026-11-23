import React, { useMemo, useState } from 'react';
import { DateTime } from 'luxon';

import { useEmptyState } from './EmptyState';
import { CalendarEvent } from './models/types';
import { FilterValues } from './lib/filters';
import { eventDays, keyFor } from './lib/events';
import { useFilterState } from './lib/FilterStateContext';
import { useFilteredEvents, useSelectedCalendarIds } from './lib/hooks';
import { asArray, days, intersection } from './lib/utils';
import { ViewEventSummary } from './ViewEvent';
import { ViewStartAndEnd } from './ViewStartAndEnd';
import { deleteEvents } from './google/writes';
import { userContext } from './userContext';
import { authContext } from './authContext';

const COLUMN_COUNT = 4; // select, when, time, what

function IndeterminateCheckbox({
  indeterminate,
  ...rest
}: { indeterminate?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      ref={(el) => {
        if (el) el.indeterminate = !!indeterminate;
      }}
      {...rest}
    />
  );
}

/** Events grouped by each local day they occupy within the filter range. */
export function groupByDay(events: CalendarEvent[], dates: string[]) {
  const grouped = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    for (const day of intersection(eventDays(event), dates)) {
      const list = grouped.get(day);
      if (list) list.push(event);
      else grouped.set(day, [event]);
    }
  }
  return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function EventTable({
  events,
  filters,
}: {
  events: CalendarEvent[];
  filters: FilterValues;
}) {
  const user = React.useContext(userContext);
  const { ensureWriteAccess } = React.useContext(authContext);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  // Days the user collapsed; everything starts expanded.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const groups = useMemo(
    () => groupByDay(events, Array.from(days(filters.start, filters.end))),
    [events, filters.start, filters.end],
  );

  // Only count selections that are still visible after filters change.
  const selectedEvents = useMemo(
    () => events.filter((e) => selected.has(keyFor(e))),
    [events, selected],
  );
  const allSelected =
    events.length > 0 && selectedEvents.length === events.length;

  const toggle = (event: CalendarEvent) =>
    setSelected((old) => {
      const next = new Set(old);
      const key = keyFor(event);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(events.map(keyFor)));

  const toggleDay = (day: string) =>
    setCollapsed((old) => {
      const next = new Set(old);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });

  const onDelete = async () => {
    const n = selectedEvents.length;
    if (
      !window.confirm(
        `Delete ${n} event${n === 1 ? '' : 's'}? This cannot be undone here.`,
      )
    )
      return;
    if (!(await ensureWriteAccess())) return;
    setBusy(true);
    try {
      const { failed } = await deleteEvents(
        selectedEvents.map((event) => ({
          calendarId: event.calendarId,
          eventId: event.id,
          summary: event.summary,
        })),
        user?.email,
      );
      // Keep only failures selected so they can be retried.
      setSelected(
        new Set(failed.map(({ item }) => `${item.calendarId}/${item.eventId}`)),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div>
        <button
          disabled={busy || selectedEvents.length === 0}
          onClick={onDelete}
        >
          Delete {selectedEvents.length || ''}
        </button>
      </div>
      <table>
        <thead>
          <tr>
            <th>
              <IndeterminateCheckbox
                aria-label="Select all events"
                checked={allSelected}
                indeterminate={selectedEvents.length > 0 && !allSelected}
                onChange={toggleAll}
              />
            </th>
            <th>When</th>
            <th>Time</th>
            <th>What</th>
          </tr>
        </thead>
        <tbody>
          {groups.map(([day, dayEvents]) => {
            const open = !collapsed.has(day);
            return (
              <React.Fragment key={day}>
                <tr>
                  <td colSpan={COLUMN_COUNT} style={{ fontWeight: 'bold' }}>
                    <button
                      type="button"
                      className="link-button"
                      aria-expanded={open}
                      onClick={() => toggleDay(day)}
                    >
                      {day} ({dayEvents.length})
                    </button>
                  </td>
                </tr>
                {open &&
                  dayEvents.map((event) => (
                    <tr key={`${day}/${keyFor(event)}`}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Select ${event.summary || 'event'}`}
                          checked={selected.has(keyFor(event))}
                          onChange={() => toggle(event)}
                        />
                      </td>
                      <td>
                        {event.start?.ms !== undefined
                          ? DateTime.fromMillis(event.start.ms).toISODate()
                          : null}
                      </td>
                      <td>
                        <ViewStartAndEnd
                          start={event.start}
                          end={event.end}
                          showDate={false}
                        />
                      </td>
                      <td>
                        <ViewEventSummary event={event} />
                      </td>
                    </tr>
                  ))}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

export default function Table() {
  const { eventFilters } = useFilterState();
  const [selectedCalendarIds] = useSelectedCalendarIds();

  const allFilters = useMemo(
    () => ({ ...eventFilters, calendarIds: asArray(selectedCalendarIds) }),
    [eventFilters, selectedCalendarIds],
  );

  const events = useFilteredEvents(allFilters);
  const empty = useEmptyState(events, allFilters.calendarIds);
  if (empty || !events) return empty;

  return <EventTable events={events} filters={allFilters} />;
}
