import { readableOn } from './lib/contrast';
import React from 'react';

import { Calendar, UpdateState } from './models/types';
import { db } from './models/db';
import { useLiveQuery } from 'dexie-react-hooks';

import { useDefaultCalendar } from './lib/hooks';

import {
  useCalendars,
  useSelectedCalendarIds,
  useCountsByCalendar,
  useLatestUpdateByCalendar,
} from './lib/hooks';

import { keyBy, sortBy } from './lib/utils';
import { DateTime } from 'luxon';

import { syncResource } from './google/sync';

import { useInterval } from './lib/reactHooks';
import UpdateStatusIcon from './UpdateStatusIcon';
import { describeSyncError } from './lib/syncErrors';
import { toRelativeDate } from './lib/utils';

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
  // Re-render every 30s so relative times stay current.
  const [, setAsOf] = React.useState(DateTime.now());
  const defaultCalendar = useDefaultCalendar();
  const calList = useCalendars();
  const counts = useCountsByCalendar() ?? {};
  const latest = useLatestUpdateByCalendar() ?? {};
  const [selectedCalendarIds_, setSelectedCalendarIds] =
    useSelectedCalendarIds();
  const updates = useLiveQuery(() => db.updateState.toArray());
  const updatesMap = keyBy(updates, 'resource');

  useInterval(() => {
    setAsOf(DateTime.now());
  }, 30 * 1000);

  const onToggle = React.useCallback(
    (calendarId: string) => {
      const oldCalendarIds = Array.isArray(selectedCalendarIds_)
        ? selectedCalendarIds_
        : [selectedCalendarIds_];
      if (oldCalendarIds.includes(calendarId)) {
        setSelectedCalendarIds(
          oldCalendarIds.filter((id: string) => id !== calendarId),
        );
      } else {
        setSelectedCalendarIds([...oldCalendarIds, calendarId]);
      }
    },
    [selectedCalendarIds_, setSelectedCalendarIds],
  );

  const nameOf = (resource: string) =>
    resource === 'calendarList'
      ? 'Calendar list'
      : (calList?.find((c) => `calendar/${c.id}` === resource)?.summary ??
        resource.slice('calendar/'.length));
  const failures = (updates ?? []).filter((u) => u.error && !u.disabled);

  return (
    <>
      {failures.length > 0 && (
        <SyncErrors failures={failures} nameOf={nameOf} />
      )}
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
                  color: readableOn(c.backgroundColor, c.foregroundColor),
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
                  {update?.disabled ? null : <UpdateStatus update={update} />}
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

async function retry(update: UpdateState) {
  await syncResource(update.account, update.resource).catch(() => {});
}

/** Status cell: icon plus, on failure, the reason as text and a Retry button. */
function UpdateStatus({ update }: { update?: UpdateState }) {
  if (!update) return null;
  if (!update.error) return <UpdateStatusIcon update={update} />;
  return (
    <span>
      <UpdateStatusIcon update={update} /> {describeSyncError(update).summary}{' '}
      <button disabled={update.requesting} onClick={() => retry(update)}>
        {update.requesting ? 'Retrying…' : 'Retry'}
      </button>
    </span>
  );
}

/** Every current sync failure, in plain language, with Retry buttons. */
function SyncErrors({
  failures,
  nameOf,
}: {
  failures: UpdateState[];
  nameOf: (resource: string) => string;
}) {
  return (
    <div role="alert" className="sync-errors">
      <strong>
        {failures.length === 1
          ? 'One sync problem'
          : `${failures.length} sync problems`}
      </strong>{' '}
      <button onClick={() => failures.forEach(retry)}>Retry all</button>
      <ul>
        {failures.map((u) => {
          const { summary, hint, detail } = describeSyncError(u);
          return (
            <li key={u.resource}>
              <b>{nameOf(u.resource)}</b>: {summary}
              {u.errorAt ? ` (${toRelativeDate(u.errorAt)})` : ''}
              {u.requesting ? ' — retrying…' : ''}
              {hint && <div className="hint">{hint}</div>}
              {detail && detail !== summary && (
                <details>
                  <summary>Details from Google</summary>
                  {detail}
                  {u.errorStatus && u.errorStatus > 0
                    ? ` (HTTP ${u.errorStatus})`
                    : ''}
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default Calendars;
