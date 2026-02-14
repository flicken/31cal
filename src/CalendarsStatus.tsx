import React, { useEffect, useState } from 'react';

import { Calendar, UpdateState } from './models/types';
import { db } from './models/db';
import { useLiveQuery } from 'dexie-react-hooks';

import useDefaultCalendar from './lib/useDefaultCalendar';

import { useCalendars, useSelectedCalendarIds, useCountsByCalendar } from './lib/hooks';

import { keyBy, sortBy } from 'lodash-es';
import { DateTime } from 'luxon';

import { useInterval } from 'usehooks-ts';

import { UpdateStatus, UpdateStatusIcon } from './CalendarUpdateStatus';

function sortKey(c: Calendar): string {
  if (c.primary) {
    return `000_${c.summary?.toUpperCase()}`;
  }
  if (c.id === 'addressbook#contacts@group.v.calendar.google.com') {
    return `001_${c.summary?.toUpperCase()}`;
  }
  return c.summary?.toUpperCase();
}

function Calendars() {
  const [asOf, setAsOf] = React.useState(DateTime.now());
  const defaultCalendar = useDefaultCalendar();
  const calList = useCalendars();
  const counts = useCountsByCalendar();
  const [selectedCalendarIds_, setSelectedCalendarIds] = useSelectedCalendarIds();
  const updates = useLiveQuery(() => db.updateState.toArray());
  const updatesMap = keyBy(updates, 'resource');

  const listUpdate = updatesMap['calendarList'];

  useInterval(() => {
    setAsOf(DateTime.now());
  }, 1000);

  const onToggle = React.useCallback(
    (calendarId: string) => {
      const oldCalendarIds = Array.isArray(selectedCalendarIds_) ? selectedCalendarIds_ : [selectedCalendarIds_];
      if (oldCalendarIds.includes(calendarId)) {
        setSelectedCalendarIds(oldCalendarIds.filter((id: string) => id !== calendarId));
      } else {
        setSelectedCalendarIds([...oldCalendarIds, calendarId]);
      }
    },
    [selectedCalendarIds_, setSelectedCalendarIds],
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
                <UpdateStatusIcon update={updatesMap[`calendar/${c.id}`]} />
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
