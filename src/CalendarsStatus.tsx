import React from 'react';

import { Calendar, UpdateState } from './models/types';
import { db } from './models/db';
import { useLiveQuery } from 'dexie-react-hooks';

import useDefaultCalendar from './lib/useDefaultCalendar';

import {
  useCalendars,
  useSelectedCalendarIds,
  useCountsByCalendar,
  useLatestUpdateByCalendar,
} from './lib/hooks';

import { keyBy, sortBy } from './lib/utils';
import { DateTime } from 'luxon';

import { fetchResource } from './google/useClientToFetch';

import { useInterval } from 'usehooks-ts';
import UpdateStatusIcon from './UpdateStatusIcon';

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
  const counts = useCountsByCalendar() ?? {};
  const latest = useLatestUpdateByCalendar() ?? {};
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
            <th>Latest update</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {sortBy(calList ?? [], sortKey).map((c) => {
            const update = updatesMap[`calendar/${c.id}`];

            return (
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
                <td>{update?.disabled ? null : counts[c.id]}</td>
                <td>{update?.disabled ? null : latest[c.id]}</td>
                <td>
                  {update?.disabled ? null : <UpdateStatusIcon update={update} />}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      Calendar list: <UpdateStatus update={updatesMap['calendarList']} />
    </>
  );
}

function UpdateStatus({ update }: { update?: UpdateState }) {
  if (!update) {
    return null;
  }
  if (update.error) {
    return (
      <>
        <button
          onClick={async () => {
            await db.updateState.update([update.account, update.resource], {
              nextSyncToken: undefined,
              nextPageToken: undefined,
              etag: undefined,
            });
           await fetchResource(update.account, update.resource);
          }}
        >
          <UpdateStatusIcon update={update} />
          {update.error}
        </button>
      </>
    );
  }

  return <UpdateStatusIcon update={update} />;
}


function run<T>(f: () => T): T {
  return f();
}

export default Calendars;
