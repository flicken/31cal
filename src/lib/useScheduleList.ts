import { db } from '../models/db';
import { CalendarEvent } from '../models/types';
import { useLiveQuery } from 'dexie-react-hooks';

const PROPERTY_PREFIX = /^31cal./;

function safeDecode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** Schedule names stored as shared extended properties `31cal/<name>`. */
const eventSchedules = (e: Pick<CalendarEvent, 'extendedProperties'>) => {
  return Object.entries(e.extendedProperties?.shared ?? {})
    .filter((kv) => kv[0].startsWith('31cal') && !!kv[1])
    .map((kv) => kv[0].replace(PROPERTY_PREFIX, ''))
    .map(safeDecode);
};

const useScheduleList = () => {
  const list = useLiveQuery(() => db.events.orderBy('_schedules').uniqueKeys());

  return {
    list,
  };
};

export default useScheduleList;

export { useScheduleList, eventSchedules };
