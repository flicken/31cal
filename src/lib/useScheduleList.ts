import { db } from '../models/db';
import { CalendarEvent } from '../models/types';
import { useLiveQuery } from 'dexie-react-hooks';

import _ from 'lodash';

const PROPERTY_PREFIX = /^31cal./;

const eventSchedules = (e: CalendarEvent) => {
  return _.toPairs(e.extendedProperties?.shared)
    .filter((kv) => kv[0].startsWith('31cal') && !!kv[1])
    .map((kv) => kv[0].replace(PROPERTY_PREFIX, ''))
    .map((k) => decodeURIComponent(k));
};

const addEventSchedule = (e: CalendarEvent, schedule: string) => {
  _.set(e, `extendedProperties.shared.31cal/${schedule}`, schedule);
};

const removeEventSchedule = (e: CalendarEvent, schedule: string) => {
  _.unset(e, `extendedProperties.shared.31cal/${schedule}`);
};

const useScheduleList = () => {
  const list = useLiveQuery(() => db.events.orderBy('_schedules').uniqueKeys());
  //db.events.toArray().then(q => _.uniq(q.flatMap(eventSchedules))))

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
