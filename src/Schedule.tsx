import React, { useCallback, useEffect, useState } from 'react';

import { db } from './models/db';
import { useLiveQuery } from 'dexie-react-hooks';

import { useRecoilValue } from 'recoil';
import {
  filteredEvents,
  allEventFilters,
  allEvents as allEventsState,
} from './lib/store';

import useDefaultCalendar from './lib/useDefaultCalendar';
import { useScheduleList, eventSchedules } from './lib/useScheduleList';
import { useSetting } from './lib/settings';
import EventList from './EventList';
import DateTimeRangeInput, { DateTimeRange } from './DateTimeRangeInput';

import { DateTime } from 'luxon';
import _ from 'lodash';

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

  const onChange = useCallback((e) => {
    setState(e);
    setSelectedSchedules(e ? [e.value] : []);
  }, []);

  return (
    <Select
      isClearable={true}
      onChange={onChange}
      value={state}
      isLoading={!list || !selectedSchedules}
      options={(list ?? []).map((s) => ({ value: s, label: s })) as any}
    />
  );
}

function Schedule() {
  const [selectedSchedules] = useSetting('selectedSchedules');
  const allEvents = useRecoilValue(allEventsState);
  let eventList = useRecoilValue(filteredEvents);
  const filters = useRecoilValue(allEventFilters);

  if (!_.isEmpty(selectedSchedules)) {
    eventList = eventList.filter(
      (e) => !_.isEmpty(_.intersection(selectedSchedules, e._schedules ?? [])),
    );
  }

  return (
    <div>
      <div>
        Schedule: <SelectSchedule />
      </div>
      <br />
      {JSON.stringify(filters)}
      <div>
        Showing: {eventList && eventList.length} of {allEvents.length} events
      </div>
      <EventList events={eventList?.filter((e) => e.status !== 'cancelled')} />
    </div>
  );
}

export default Schedule;
