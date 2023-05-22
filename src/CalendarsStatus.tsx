import React, { useEffect, useState } from 'react';

import { Calendar, UpdateState } from './models/types';
import { db } from './models/db';
import { useLiveQuery } from 'dexie-react-hooks';

import useDefaultCalendar from './lib/useDefaultCalendar';

import { useRecoilState, useRecoilValue } from 'recoil';
import {
  selectedCalendarIds,
  allCalendars,
  countsByCalendar,
} from './lib/store';

import { keyBy, sortBy } from 'lodash-es';
import { DateTime } from 'luxon';

import { useInterval } from 'usehooks-ts';

function showDate(millis?: number) {
  if (!millis) return undefined;

  const date = DateTime.fromMillis(millis);
  return (
    <span title={date.toString()}>{date.toRelative({ style: 'narrow' })}</span>
  );
}

function sortKey(c: Calendar): string {
  if (c.primary) {
    return `000_${c.summary?.toUpperCase()}`;
  }
  if (c.id === 'addressbook#contacts@group.v.calendar.google.com') {
    return `001_${c.summary?.toUpperCase()}`;
  }
  return c.summary?.toUpperCase();
}

function UpdateStatus({ update }: { update?: UpdateState }) {
  if (!update) {
    return null;
  }
  if (update.error) {
    return (
      <>
        Error {update.error} {showDate(update.updatedAt)}
      </>
    );
  }

  if (update.requesting) {
    return <>Requesting since {showDate(update.updatedAt)}</>;
  }

  if (update.updatedAt) {
    return <>Successfully updated {showDate(update.updatedAt)}</>;
  }

  return null;
}

function Calendars() {
  const [asOf, setAsOf] = React.useState(DateTime.now());
  const defaultCalendar = useDefaultCalendar();
  const calList = useRecoilValue(allCalendars);
  const counts = useRecoilValue(countsByCalendar);
  const [selectedCalendarIds_, setSelectedCalendarIds] =
    useRecoilState(selectedCalendarIds);
  const updates = useLiveQuery(() => db.updateState.toArray());
  const updatesMap = keyBy(updates, (e) =>
    e.resource.replaceAll(/^calendar\//g, ''),
  );

  const listUpdate = updatesMap['calendarList'];

  useInterval(() => {
    setAsOf(DateTime.now());
  }, 1000);

  const onToggle = React.useCallback(
    (calendarId: string) => {
      setSelectedCalendarIds((param) => {
        const oldCalendarIds = Array.isArray(param) ? param : [param];
        if (oldCalendarIds.includes(calendarId)) {
          return oldCalendarIds.filter((id: string) => id !== calendarId);
        } else {
          return [...oldCalendarIds, calendarId];
        }
      });
    },
    [setSelectedCalendarIds],
  );

  return (
    <>
      <table style={{ margin: 0, padding: 0, border: 'none' }}>
        <thead>
          <tr>
            <th></th>
            <th>Name</th>
            <th>Events</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {sortBy(calList, sortKey).map((c) => (
            <tr
              key={c.id}
              style={{
                backgroundColor: c.backgroundColor,
                color: c.foregroundColor,
                fontWeight: defaultCalendar?.id == c.id ? 'bold' : undefined,
              }}
            >
              <td>
                <input
                  type="checkbox"
                  checked={selectedCalendarIds_.includes(c.id)}
                  onChange={() => {
                    onToggle(c.id);
                  }}
                />
              </td>
              <td>{c.summary}</td>
              <td>{counts[c.id]}</td>
              <td>
                <UpdateStatus update={updatesMap[c.id]} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      Calendar list: <UpdateStatus update={updatesMap['calendarList']} />
    </>
  );
}

function run<T>(f: () => T): T {
  return f();
}

export default Calendars;
