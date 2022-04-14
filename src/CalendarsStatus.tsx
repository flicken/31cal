import React, { useEffect, useState } from 'react';

import { Calendar } from './models/types';
import { db } from './models/db';
import { useLiveQuery } from 'dexie-react-hooks';

import useDefaultCalendar from './lib/useDefaultCalendar';

import { useRecoilState, useRecoilValue } from 'recoil';
import {
  selectedCalendarIds,
  allCalendars,
  countsByCalendar,
} from './lib/store';

import _ from 'lodash';
import { DateTime } from 'luxon';

import { useInterval } from 'usehooks-ts';

function showDate(millis?: number) {
  if (!millis) return undefined;

  const date = DateTime.fromMillis(millis);
  return <span title={date.toString()}>{date.toRelative()}</span>;
}

function Calendars() {
  const [asOf, setAsOf] = React.useState(DateTime.now());
  const defaultCalendar = useDefaultCalendar();
  const calList = useRecoilValue(allCalendars);
  const counts = useRecoilValue(countsByCalendar);
  const [selectedCalendarIds_, setSelectedCalendarIds] =
    useRecoilState(selectedCalendarIds);
  const updates = useLiveQuery(() => db.updateState.toArray());
  const updatesMap = _.keyBy(
    updates?.filter((e) => e.resource.startsWith('calendar/')),
    (e) => e.resource.replaceAll(/^calendar\//g, ''),
  );

  useInterval(() => {
    setAsOf(DateTime.now());
  }, 1000);

  const onToggle = React.useCallback(
    (calendarId) => {
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
            <th>Updated</th>
            <th>Events</th>
          </tr>
        </thead>
        <tbody>
          {_.sortBy(calList, (c) => c.summary?.toUpperCase()).map((c) => (
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
              <td>{showDate(updatesMap[c.id]?.updatedAt)}</td>
              <td>{counts[c.id]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      As of {asOf.toLocaleString(DateTime.TIME_SIMPLE)}
    </>
  );
}

export default Calendars;
