import React, { useEffect, useRef } from 'react';

import { db } from './models/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from 'react-toastify/unstyled';
import { useLocation } from 'wouter';

import { max } from './lib/utils';
import { DateTime } from 'luxon';

import { useInterval } from './lib/reactHooks';
import { describeSyncError } from './lib/syncErrors';

import UpdateStatusIcon from './UpdateStatusIcon';
import ErrorIcon from './assets/error.svg';
import { authContext } from './authContext';

/** Top-bar sync status; links to /status and toasts each new failure once. */
function CalendarUpdateStatus() {
  // Re-render every 30s so the relative time stays current.
  const [, setAsOf] = React.useState(DateTime.now());
  const updates = useLiveQuery(() => db.updateState.toArray());
  const [, navigate] = useLocation();

  const active = updates?.filter((u) => !u.disabled) ?? [];
  const failures = active.filter((u) => u.error);
  const requesting = active.some((u) => u.requesting);
  const backfilling = active.some((u) => u.backfilling);
  const first = failures[0];

  const updatedAt = max(updates?.map((u) => u.updatedAt));

  useInterval(() => {
    setAsOf(DateTime.now());
  }, 30 * 1000);

  // Toast once per new failure (resource + message), not on every poll.
  const seen = useRef(new Set<string>());
  useEffect(() => {
    const fresh = failures.filter(
      (f) => !seen.current.has(`${f.resource}\n${f.error}`),
    );
    failures.forEach((f) => seen.current.add(`${f.resource}\n${f.error}`));
    if (fresh.length === 0) return;
    (async () => {
      // Name the newest failure; count the others still failing.
      const f = fresh[0];
      const name =
        f.resource === 'calendarList'
          ? 'your calendar list'
          : ((await db.calendars.get(f.resource.slice('calendar/'.length)))
              ?.summary ?? 'a calendar');
      const { summary, hint } = describeSyncError(f);
      const others = failures.length - 1;
      const more = others > 0 ? ` (and ${others} more)` : '';
      const render = `Couldn't sync ${name}${more}: ${summary}.${hint ? ` ${hint}` : ''} Tap for details.`;
      if (toast.isActive('sync-error')) {
        toast.update('sync-error', { render });
      } else {
        toast.error(render, {
          toastId: 'sync-error',
          onClick: () => navigate('/status'),
        });
      }
    })();
  });

  const { isLoggedIn } = React.useContext(authContext);
  if (!isLoggedIn) return null;

  if (first) {
    const { summary } = describeSyncError(first);
    return (
      <span role="status" title="Open sync status for details">
        <img
          alt=""
          aria-hidden="true"
          src={ErrorIcon}
          height={20}
          width={20}
          style={{ verticalAlign: 'middle', display: 'inline' }}
        />
        <span className="status-text status-error">
          {' '}
          {requesting ? 'Retrying' : 'Sync error'}: {summary}
          {failures.length > 1 ? ` (+${failures.length - 1})` : ''}
        </span>
      </span>
    );
  }

  return (
    <UpdateStatusIcon
      showText
      update={{ updatedAt: updatedAt ?? 0, requesting, backfilling }}
    />
  );
}

export default CalendarUpdateStatus;
