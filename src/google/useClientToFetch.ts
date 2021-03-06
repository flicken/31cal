import React, { useCallback, useEffect } from 'react';

import { db } from '../models/db';
import fetchList from './fetchList';
import { useLiveQuery } from 'dexie-react-hooks';
import useDefaultCalendar from '../lib/useDefaultCalendar';

import { useRecoilValue } from 'recoil';
import { selectedCalendars } from '../lib/store';
import { Calendar } from '../models/types';

import { DateTime } from 'luxon';

import { eventSchedules } from '../lib/useScheduleList';

import { useInterval } from 'usehooks-ts';

const toMillis = (event: any, fieldName: string, timeZone: string) => {
  let value = event[fieldName];
  let date = DateTime.fromISO(value.dateTime || value.date, {
    zone: value.timeZone || timeZone,
  });
  return date.toMillis();
};

let mutateEvent = (event: any, calendarId: string, timeZone: string) => {
  let start = toMillis(event, 'start', timeZone);
  let end = toMillis(event, 'end', timeZone);
  event.start.ms = start;
  event.end.ms = end;
  event.eventId = event.id;
  event.calendarId = calendarId;
  event._schedules = eventSchedules(event);
  // event.id = idFor(event)
};

export const getEvents = async (user: any, calendarsToFetch?: any[]) => {
  if (!user) return;
  if (!calendarsToFetch) return;
  const fetched = calendarsToFetch.map(async (calendar) => {
    if (!calendar) return Promise.resolve(undefined);
    console.log('Fetching calendar', calendar);
    const account = user.profileObj.email;
    const calendarId = calendar.id;
    const timeZone = calendar.timeZone;
    const resource = `calendar/${calendarId}`;
    const transformation = (event: any) => {
      mutateEvent(event, calendarId, timeZone);
      return event;
    };
    const request = {
      calendarId,
      showDeleted: true,
      singleEvents: true,
    };
    return fetchList({
      account,
      request,
      resource,
      transformation,
      googleResource: (gapi) => gapi.client.calendar.events,
      table: db.events,
    });
  });
  await Promise.all(fetched);
};

function useClientToFetch(user: any, interval: number) {
  const [lastFetchDate, setLastFetchDate] = React.useState(DateTime.now());

  useInterval(() => {
    setLastFetchDate(DateTime.now());
  }, interval);

  const getCalendars = useCallback(async () => {
    if (!user) return;
    const account = user.profileObj.email;
    const resource = 'calendarList';
    const transformation = (calendar: any) => {
      if (calendar.summaryOverride) {
        calendar.originalSummary = calendar.summary;
        calendar.summary = calendar.summaryOverride;
      }
      return calendar;
    };

    await fetchList({
      account,
      resource,
      transformation,
      request: {},
      googleResource: (gapi) => gapi.client.calendar.calendarList,
      table: db.calendars,
    });
  }, [user, lastFetchDate]);

  const calendarsToFetch = useRecoilValue(selectedCalendars);

  useEffect(() => {
    getCalendars();
  }, [getCalendars]);

  useEffect(() => {
    getEvents(user, calendarsToFetch);
  }, [user, calendarsToFetch, lastFetchDate]);
}

export default useClientToFetch;
