import React, { useEffect } from 'react';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './models/db';
import { useSetRecoilState } from 'recoil';
import { allCalendars, allEvents } from './lib/store';

export default function EventsContext() {
  const events = useLiveQuery(() => db.events.toArray());
  const setEvents = useSetRecoilState(allEvents);
  useEffect(() => {
    if (events) {
      setEvents(events);
    }
  }, [events]);

  const calendars = useLiveQuery(() => db.calendars.toArray());
  const setCalendars = useSetRecoilState(allCalendars);
  useEffect(() => {
    if (calendars) {
      setCalendars(calendars);
    }
  }, [calendars]);
  return null;
}
