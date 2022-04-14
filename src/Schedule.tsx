import React, { useCallback, useEffect, useState } from 'react';

import { db } from './models/db';
import { useLiveQuery } from 'dexie-react-hooks';

import { useRecoilValue } from 'recoil';
import { filteredEvents, allEventFilters, allEventsCount } from './lib/store';

import useDefaultCalendar from './lib/useDefaultCalendar';
import { useScheduleList, eventSchedules } from './lib/useScheduleList';
import { useSetting } from './lib/settings';
import EventList from './EventList';
import DateTimeRangeInput, { DateTimeRange } from './DateTimeRangeInput';

import { DateTime } from 'luxon';
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
  const allEventsCount_ = useRecoilValue(allEventsCount);
  let eventList = useRecoilValue(filteredEvents);

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
