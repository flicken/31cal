import React, { useEffect, useMemo, useState } from 'react';

import { useFilterState } from './lib/FilterStateContext';
import { useEvents, useFilteredEvents, useSelectedCalendarIds } from './lib/hooks';
import { asArray } from './utils';

import { useScheduleList } from './lib/useScheduleList';
import { useSetting } from './lib/settings';
import EventList from './EventList';

import { isEmpty, intersection } from 'lodash-es';

import Select from 'react-select';

type SelectValue = {
  label: string;
  value: string;
};

function SelectSchedule() {
  const [state, setState] = useState<SelectValue | undefined>(undefined);
  const { list } = useScheduleList();
  const [selectedSchedules, setSelectedSchedules] =
    useSetting('selectedSchedules');

  useEffect(() => {
    const s = selectedSchedules && selectedSchedules[0];
    if (s) {
      const newState = {
        value: s,
        label: s,
      };
      setState(newState);
    }
  }, [selectedSchedules]);

  return (
    <Select
      isClearable={true}
      onChange={(e) => {
        setState(e ?? undefined);
        setSelectedSchedules(e ? [e.value] : []);
      }}
      value={state}
      isLoading={!list || !selectedSchedules}
      options={(list ?? []).map((s) => ({ value: s, label: s })) as any}
    />
  );
}

function Schedule() {
  const [selectedSchedules] = useSetting('selectedSchedules');
  const allEventsArray = useEvents();
  const allEventsCount_ = allEventsArray.length;

  const { eventFilters } = useFilterState();
  const [selectedCalendarIds] = useSelectedCalendarIds();

  const filters = useMemo(
    () => ({ ...eventFilters, calendarIds: asArray(selectedCalendarIds) }),
    [eventFilters, selectedCalendarIds],
  );

  let eventList = useFilteredEvents(filters);

  if (!isEmpty(selectedSchedules)) {
    eventList = eventList.filter(
      (e) => !isEmpty(intersection(selectedSchedules, e._schedules ?? [])),
    );
  }

  return (
    <div>
      <div>
        Schedule: <SelectSchedule />
      </div>
      <br />
      <div>
        Showing: {eventList && eventList.length} of {allEventsCount_} events
      </div>
      <EventList events={eventList} />
    </div>
  );
}

export default Schedule;
