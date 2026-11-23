import { useEmptyState } from './EmptyState';
import React, { useMemo } from 'react';

import { useFilterState } from './lib/FilterStateContext';
import {
  useEventCount,
  useFilteredEvents,
  useSelectedCalendarIds,
} from './lib/hooks';
import { asArray } from './lib/utils';

import { useScheduleList } from './lib/useScheduleList';
import { useSetting } from './lib/settings';
import EventList from './EventList';

import { isEmpty, intersection } from './lib/utils';

function SelectSchedule() {
  const { list } = useScheduleList();
  const [selectedSchedules, setSelectedSchedules] =
    useSetting('selectedSchedules');
  const current = asArray(selectedSchedules ?? [])[0] ?? '';

  return (
    <select
      aria-label="Schedule"
      value={current}
      disabled={!list}
      onChange={(e) =>
        setSelectedSchedules(e.target.value ? [e.target.value] : [])
      }
    >
      <option value="">All schedules</option>
      {(list ?? []).map((s) => (
        <option key={String(s)} value={String(s)}>
          {String(s)}
        </option>
      ))}
    </select>
  );
}

function Schedule() {
  const [selectedSchedules] = useSetting('selectedSchedules');
  const totalEvents = useEventCount() ?? 0;

  const { eventFilters } = useFilterState();
  const [selectedCalendarIds] = useSelectedCalendarIds();

  const filters = useMemo(
    () => ({ ...eventFilters, calendarIds: asArray(selectedCalendarIds) }),
    [eventFilters, selectedCalendarIds],
  );

  let eventList = useFilteredEvents(filters);
  const empty = useEmptyState(eventList, filters.calendarIds);

  if (eventList && !isEmpty(selectedSchedules)) {
    eventList = eventList.filter(
      (e) => !isEmpty(intersection(selectedSchedules, e._schedules ?? [])),
    );
  }

  if (empty || !eventList) return empty;

  return (
    <div>
      <div>
        Schedule: <SelectSchedule />
      </div>
      <br />
      <div>
        Showing: {eventList.length} of {totalEvents} events
      </div>
      <EventList events={eventList} />
    </div>
  );
}

export default Schedule;
