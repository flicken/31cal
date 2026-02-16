import React, { useMemo } from 'react';

import { useFilterState } from './lib/FilterStateContext';
import { useFilteredEvents } from './lib/hooks';
import { useSelectedCalendarIds } from './lib/hooks';
import { asArray } from './utils';

import EventList from './EventList';

function Events() {
  const { eventFilters } = useFilterState();
  const [selectedCalendarIds] = useSelectedCalendarIds();

  const filters = useMemo(
    () => ({ ...eventFilters, calendarIds: asArray(selectedCalendarIds) }),
    [eventFilters, selectedCalendarIds],
  );

  const eventList = useFilteredEvents(filters);
  if (!eventList) return null;

  return (
    <>
      <EventList events={eventList} />
    </>
  );
}

export default Events;
