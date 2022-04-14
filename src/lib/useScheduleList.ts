import { db } from '../models/db';
import { CalendarEvent } from '../models/types';
import { useLiveQuery } from 'dexie-react-hooks';

import { unset, set, toPairs } from 'lodash-es';

const PROPERTY_PREFIX = /^31cal./;

const eventSchedules = (e: CalendarEvent) => {
  return toPairs(e.extendedProperties?.shared)
    .filter((kv) => kv[0].startsWith('31cal') && !!kv[1])
    .map((kv) => kv[0].replace(PROPERTY_PREFIX, ''))
    .map((k) => decodeURIComponent(k));
};

const addEventSchedule = (e: CalendarEvent, schedule: string) => {
  set(e, `extendedProperties.shared.31cal/${schedule}`, schedule);
};

const removeEventSchedule = (e: CalendarEvent, schedule: string) => {
  unset(e, `extendedProperties.shared.31cal/${schedule}`);
};

const useScheduleList = () => {
  const list = useLiveQuery(() => db.events.orderBy('_schedules').uniqueKeys());

  return {
    list,
  };
};

export default useScheduleList;

export {
  useScheduleList,
  eventSchedules,
  addEventSchedule,
  removeEventSchedule,
};
