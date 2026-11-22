import React, { useContext } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'wouter';
import { authContext } from './authContext';
import { db } from './models/db';
import { calendarResource } from './google/sync';

function Message({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty-state" role="status">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

/**
 * Why a view has nothing to show, or null when it has events. Distinguishes
 * signed out, loading, no calendars selected, still syncing, and an empty
 * range.
 */
export function useEmptyState(
  events: readonly unknown[] | undefined,
  calendarIds: string[],
): React.ReactElement | null {
  const { isLoggedIn, login } = useContext(authContext);
  const ids = calendarIds.join(',');
  const syncing = useLiveQuery(async () => {
    if (!ids) return { active: false, total: 0 };
    const resources = new Set(ids.split(',').map(calendarResource));
    const states = (await db.updateState.toArray()).filter((s) =>
      resources.has(s.resource),
    );
    const neverSynced =
      resources.size > states.filter((s) => s.nextSyncToken).length;
    return {
      active: neverSynced || states.some((s) => s.requesting || s.backfilling),
      total: await db.events.count(),
    };
  }, [ids]);

  if (events && events.length > 0) return null;

  if (!isLoggedIn) {
    return (
      <Message title="Sign in to see your calendars">
        <p>
          31cal keeps a copy of your Google Calendar in this browser. It starts
          with read-only access.
        </p>
        <button type="button" className="primary-button" onClick={login}>
          Sign in with Google
        </button>
      </Message>
    );
  }
  if (!events) return <Message title="Loading…" />;
  if (calendarIds.length === 0) {
    return (
      <Message title="No calendars selected">
        <p>
          Choose calendars in the calendar picker at the top, or on the{' '}
          <Link href="/status">status</Link> page.
        </p>
      </Message>
    );
  }
  if (syncing?.active) {
    return (
      <Message title="Syncing your calendars…">
        <p>
          {syncing.total} events downloaded so far. They appear here as they
          arrive.
        </p>
      </Message>
    );
  }
  return (
    <Message title="No events in this range">
      <p>Try a wider range in the search box, such as “next 3 months”.</p>
    </Message>
  );
}
