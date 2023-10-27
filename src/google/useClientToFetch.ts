import React, { useCallback, useEffect } from 'react';

import { db } from '../models/db';
import fetchList from './fetchList';
import useDefaultCalendar from '../lib/useDefaultCalendar';

import { useRecoilValue, useResetRecoilState } from 'recoil';
import { selectedCalendars } from '../lib/store';
import { Calendar } from '../models/types';

import { DateTime } from 'luxon';

import { eventSchedules } from '../lib/useScheduleList';

import { useInterval } from 'usehooks-ts';
import { GoogleUser } from '../useGoogleButton';

const toMillis = (
  event: any,
  fieldName: 'start' | 'end',
  timeZone: string,
): number => {
  const value = event[fieldName];
  const date = DateTime.fromISO(value.dateTime || value.date, {
    zone: value.timeZone || timeZone,
  });
  if (
    fieldName === 'end' &&
    event.start?.date &&
    event.start?.date === event.end?.date
  ) {
    return date.plus({ days: 1 }).toMillis();
  }

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

export const getEvents = async (
  user: GoogleUser | null,
  calendarsToFetch?: any[],
) => {
  if (!user) return;
  if (!user.email)
    throw new Error(`Cannot find user email in ${JSON.stringify(user)}}`);
  if (!calendarsToFetch) return;
  const fetched = calendarsToFetch.map(async (calendar) => {
    if (!calendar) return undefined;

    console.log(`User ${JSON.stringify(user)}`);
    const account = user.email;
    console.log(`User.email ${JSON.stringify(user.email)}`);
    const calendarId = calendar.id;
    const resource = `calendar/${calendarId}`;
    console.log('Fetching calendar', calendar);

    await fetchResource(account, resource);
  });
  await Promise.all(fetched);
};

export async function fetchResource(account: string, resource: string) {
  if (resource === 'calendarList') {
    const transformation = (calendar: any) => {
      if (calendar.summaryOverride) {
        calendar.originalSummary = calendar.summary;
        calendar.summary = calendar.summaryOverride;
      }
      return calendar;
    };

    return await fetchList({
      account,
      resource,
      transformation,
      request: {},
      googleResource: (gapi) => gapi.client.calendar.calendarList,
      table: db.calendars,
    });
  } else if (resource.startsWith('calendar/')) {
    const calendarId = resource.replace('calendar/', '');
    const calendar = await db.calendars.get(calendarId);
    if (!calendar) {
      throw new Error(`Cannot find calendar ${calendarId}`);
    }
    const transformation = (event: any) => {
      mutateEvent(event, calendarId, calendar.timeZone);
      return event;
    };
    const request = {
      calendarId,
      showDeleted: true,
      singleEvents: true,
    };
    console.log(`Request: ${account} ${JSON.stringify(request)}`);
    return await fetchList({
      account,
      request,
      resource,
      transformation,
      googleResource: (gapi) => gapi.client.calendar.events,
      table: db.events,
    });
  } else {
    throw new Error(`Unknown resource type`);
  }
}

function useClientToFetch(user: GoogleUser | null, interval: number) {
  const [lastFetchDate, setLastFetchDate] = React.useState(DateTime.now());

  useInterval(() => {
    setLastFetchDate(DateTime.now());
  }, interval);

  const getCalendars = useCallback(async () => {
    if (!user) return;
    await fetchResource(user.email, 'calendarList');
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
