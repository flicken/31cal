import React from 'react';
import Calendars from './Calendars';
import {
  useCalendars,
  useSelectedCalendarIds,
  useSelectedCalendars,
} from './lib/hooks';
import { Calendar } from './models/types';

/** Top-bar calendar picker. */
export default function CalendarFilter() {
  const calOptions = useCalendars() ?? [];
  const calValue = useSelectedCalendars();
  const [, setSelectedCalendarIds] = useSelectedCalendarIds();

  const onCalendarChange = (calendars: Calendar[]) => {
    setSelectedCalendarIds(calendars.filter((c) => c).map((c) => c?.id));
  };

  return (
    <Calendars
      options={calOptions}
      value={calValue}
      onChange={onCalendarChange}
      compact
    />
  );
}
