import 'fake-indexeddb/auto';
import { beforeEach, expect, test } from 'vitest';
import { db, clearLocalData } from '../models/db';
import type { CalendarApi } from './calendarTypes';
import { setCalendarApiProvider } from './calendarClient';
import { patchEvents, saveEvents, deleteEvents } from './writes';
import { syncResource, toLocalEvent } from './sync';

const cal = {
  id: 'c1',
  summary: 'Cal',
  timeZone: 'UTC',
  selected: true,
  foregroundColor: '#000',
  backgroundColor: '#fff',
};

const gEvent = (id: string, summary: string, updated: string) => ({
  id,
  summary,
  status: 'confirmed' as const,
  updated,
  start: { dateTime: '2026-03-01T10:00:00Z' },
  end: { dateTime: '2026-03-01T11:00:00Z' },
});

let listPages: (() => Promise<any>)[] = [];

function fakeApi(): CalendarApi {
  return {
    calendarList: { list: async () => ({ result: { items: [] } }) },
    events: {
      list: async () =>
        (
          listPages.shift() ??
          (async () => ({ result: { items: [], nextSyncToken: 's' } }))
        )(),
      insert: async ({ resource }: any) => ({
        result: { ...gEvent('new1', resource.summary, '2026-02-01T00:00:00Z') },
      }),
      patch: async ({ eventId, resource }: any) => ({
        result: {
          ...gEvent(eventId, resource.summary, '2026-02-01T00:00:00Z'),
        },
      }),
      delete: async () => ({ result: undefined }),
    },
  } as unknown as CalendarApi;
}

beforeEach(async () => {
  listPages = [];
  await clearLocalData();
  await db.calendars.put(cal);
  await db.events.put(
    toLocalEvent(
      gEvent('e1', 'Old title', '2026-01-01T00:00:00Z'),
      'c1',
      'UTC',
    )!,
  );
  await db.updateState.put({
    account: 'me',
    resource: 'calendar/c1',
    nextSyncToken: 't',
    updatedAt: 1,
  });
  setCalendarApiProvider(async () => fakeApi());
});

test('a rename shows immediately, before any sync returns', async () => {
  await patchEvents([
    { eventId: 'e1', calendarId: 'c1', summary: 'New title' },
  ]);
  expect((await db.events.get(['e1', 'c1']))?.summary).toBe('New title');
});

test('a saved event is stored immediately', async () => {
  await saveEvents(cal, [
    { summary: 'Brand new', start: { dateTime: '2026-03-01T10:00:00Z' } },
  ]);
  const stored = await db.events.get(['new1', 'c1']);
  expect(stored?.summary).toBe('Brand new');
  expect(stored?.start.ms).toBe(Date.parse('2026-03-01T10:00:00Z'));
});

test('a sync page fetched before the write cannot bring back the old version', async () => {
  // A sync is running and returns the event as it was before the rename.
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  listPages.push(async () => {
    await gate;
    return {
      result: {
        items: [gEvent('e1', 'Old title', '2026-01-01T00:00:00Z')],
        nextSyncToken: 't2',
      },
    };
  });
  const staleSync = syncResource('me', 'calendar/c1');
  const write = patchEvents(
    [{ eventId: 'e1', calendarId: 'c1', summary: 'New title' }],
    'me',
  );
  await new Promise((r) => setTimeout(r, 20));
  release();
  await Promise.all([staleSync, write]);
  expect((await db.events.get(['e1', 'c1']))?.summary).toBe('New title');
});

test('the follow-up sync after a write runs fresh, not the stale in-flight one', async () => {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  let runs = 0;
  listPages.push(async () => {
    runs++;
    await gate;
    return { result: { items: [], nextSyncToken: 't2' } };
  });
  listPages.push(async () => {
    runs++;
    return { result: { items: [], nextSyncToken: 't3' } };
  });
  const staleSync = syncResource('me', 'calendar/c1');
  const fresh = syncResource('me', 'calendar/c1', { fresh: true });
  release();
  await Promise.all([staleSync, fresh]);
  expect(runs).toBe(2);
  expect((await db.updateState.get(['me', 'calendar/c1']))?.nextSyncToken).toBe(
    't3',
  );
});

test('a deleted event stays hidden even if a stale sync page arrives', async () => {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  listPages.push(async () => {
    await gate;
    return {
      result: {
        items: [gEvent('e1', 'Old title', '2026-01-01T00:00:00Z')],
        nextSyncToken: 't2',
      },
    };
  });
  const staleSync = syncResource('me', 'calendar/c1');
  const del = deleteEvents([{ eventId: 'e1', calendarId: 'c1' }], 'me');
  await new Promise((r) => setTimeout(r, 20));
  release();
  await Promise.all([staleSync, del]);
  expect((await db.events.get(['e1', 'c1']))?.status).toBe('cancelled');
});
