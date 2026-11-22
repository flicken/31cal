import React from 'react';
import Calendars from './Calendars';
import {
  useCalendars,
  useSelectedCalendarIds,
  useSelectedCalendars,
} from './lib/hooks';
import { Calendar } from './models/types';

/** Top-bar calendar picker; lazy-loaded so react-select isn't in the main chunk. */
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
