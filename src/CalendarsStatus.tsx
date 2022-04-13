import React, { useEffect, useState } from 'react';

import { Calendar } from './models/types';
import { db } from './models/db';
import { useLiveQuery } from 'dexie-react-hooks';

import useDefaultCalendar from './lib/useDefaultCalendar';

import { useRecoilValue } from 'recoil';
import {
  selectedCalendars as selectedCalendarsState,
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
  const selectedCalendars = useRecoilValue(selectedCalendarsState);
  const updates = useLiveQuery(() => db.updateState.toArray());
  const updatesMap = _.keyBy(
    updates?.filter((e) => e.resource.startsWith('calendar/')),
    (e) => e.resource.replaceAll(/^calendar\//g, ''),
  );
  const selectedMap = _.keyBy(selectedCalendars, (e) => e.id);

  console.log('selecetd', selectedCalendars);
  useInterval(() => {
    setAsOf(DateTime.now());
  }, 1000);

  return (
    <>
      <table style={{ margin: 0, padding: 0, border: 'none' }}>
        <tr>
          <th></th>
          <th>Name</th>
          <th>Updated</th>
          <th>Events</th>
        </tr>
        {_.sortBy(calList, (e) => e.summary?.toUpperCase()).map((c) => (
          <tr
            style={{
              backgroundColor: c.backgroundColor,
              color: c.foregroundColor,
              fontWeight: defaultCalendar?.id == c.id ? 'bold' : undefined,
            }}
          >
            <td>
              <input
                type="checkbox"
                defaultChecked={selectedMap[c.id]}
                disabled={true}
                onChange={() => {}}
              />
            </td>
            <td>{c.summary}</td>
            <td>{showDate(updatesMap[c.id]?.updatedAt)}</td>
            <td>{counts[c.id]}</td>
          </tr>
        ))}
      </table>
      As of {asOf.toLocaleString(DateTime.TIME_SIMPLE)}
    </>
  );
}

export default Calendars;
