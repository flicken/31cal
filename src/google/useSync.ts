import { useEffect } from 'react';
import { useInterval } from '../lib/reactHooks';
import { useLiveQuery } from 'dexie-react-hooks';

import { db } from '../models/db';
import { autoSelectCalendarIds, calendarsQuery } from '../lib/hooks';
import { GoogleUser } from '../useGoogleButton';
import { debug } from '../lib/log';
import {
  CALENDAR_LIST,
  calendarResource,
  syncCalendars,
  syncResource,
} from './sync';

async function selectedCalendarIds(): Promise<string[]> {
  const setting = await db.settings.get('selectedCalendars');
  const value = setting?.value;
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

/** Sync the calendar list, auto-select calendars on first run, then sync events. */
export async function syncAll(account: string) {
  await syncResource(account, CALENDAR_LIST);
  if (!(await db.settings.get('selectedCalendars'))) {
    await db.settings.put({
      id: 'selectedCalendars',
      value: autoSelectCalendarIds(await calendarsQuery()),
    });
  }
  await syncCalendars(account, await selectedCalendarIds());
}

/** Keep per-calendar sync state's `disabled` flag in line with the selection. */
async function markDisabled(selectedIds: string[]) {
  const selected = new Set(selectedIds.map(calendarResource));
  const states = await db.updateState.toArray();
  const changes = states
    .filter((s) => s.resource !== CALENDAR_LIST)
    .filter((s) => !!s.disabled === selected.has(s.resource))
    .map((s) => ({
      key: [s.account, s.resource] as [string, string],
      changes: { disabled: !selected.has(s.resource) },
    }));
  if (changes.length) await db.updateState.bulkUpdate(changes);
}

export default function useSync(user: GoogleUser | null, intervalMs: number) {
  const account = user?.email;
  // undefined while loading, so we never act on a transient empty selection.
  const selected = useLiveQuery(selectedCalendarIds);
  const selectedKey = selected?.join(',');

  const run = () => {
    if (!account) return;
    syncAll(account).catch((e) => debug('Sync failed', e));
  };

  useEffect(run, [account]);
  useInterval(run, account ? intervalMs : null);

  useEffect(() => {
    if (!selected) return;
    markDisabled(selected).catch((e) => debug('markDisabled failed', e));
    syncCalendars(account, selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, selectedKey]);
}
