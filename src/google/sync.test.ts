import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, clearLocalData } from '../models/db';
import {
  CalendarApi,
  setCalendarApiProvider,
  syncResource,
  toLocalEvent,
  toMillis,
} from './sync';

type Page = { items?: any[]; nextPageToken?: string; nextSyncToken?: string };
type Responder = (req: any) => Page | Promise<Page>;

function googleError(code: number, reason?: string) {
  return {
    result: {
      error: {
        code,
        message: `HTTP ${code}`,
        errors: reason ? [{ reason }] : [],
      },
    },
  };
}

let calls: { kind: string; req: any }[] = [];
function fakeApi(lists: {
  calendarList?: Responder;
  events?: Responder;
}): CalendarApi {
  const wrap = (kind: string, fn?: Responder) => ({
    list: async (req: any) => {
      calls.push({ kind, req });
      if (!fn) throw new Error(`unexpected ${kind}`);
      return { result: await fn(req) };
    },
  });
  return {
    calendarList: wrap('calendarList', lists.calendarList),
    events: wrap('events', lists.events),
  };
}

const ev = (id: string, startIso: string, extra: object = {}) => ({
  id,
  status: 'confirmed',
  updated: '2026-01-01T00:00:00Z',
  summary: id,
  start: { dateTime: startIso },
  end: { dateTime: startIso.replace('T10', 'T11') },
  ...extra,
});

async function seedCalendar() {
  await db.calendars.put({
    id: 'c1',
    summary: 'Cal',
    timeZone: 'America/New_York',
    selected: true,
    foregroundColor: '#000',
    backgroundColor: '#fff',
  });
}

beforeEach(async () => {
  calls = [];
  await clearLocalData();
});

describe('toMillis / toLocalEvent', () => {
  it('handles all-day dates in the calendar time zone', () => {
    expect(toMillis({ date: '2026-03-01' }, 'America/New_York')).toBe(
      Date.parse('2026-03-01T05:00:00Z'),
    );
  });

  it('returns undefined for missing start instead of throwing', () => {
    expect(toMillis(undefined, 'UTC')).toBeUndefined();
    expect(
      toLocalEvent({ id: 'x', status: 'cancelled' }, 'c1', 'UTC'),
    ).toBeUndefined();
  });

  it('extends equal all-day start/end by a day', () => {
    const e = toLocalEvent(
      { id: 'x', start: { date: '2026-03-01' }, end: { date: '2026-03-01' } },
      'c1',
      'UTC',
    )!;
    expect(e.end.ms! - e.start.ms!).toBe(24 * 3600 * 1000);
  });

  it('tolerates malformed schedule keys', () => {
    const e = toLocalEvent(
      {
        id: 'x',
        start: { date: '2026-03-01' },
        end: { date: '2026-03-02' },
        extendedProperties: { shared: { '31cal/50%off': 'y' } },
      },
      'c1',
      'UTC',
    )!;
    expect(e._schedules).toEqual(['50%off']);
  });
});

describe('syncResource events', () => {
  it('pages, stores events and saves the sync token only at the end', async () => {
    await seedCalendar();
    setCalendarApiProvider(async () =>
      fakeApi({
        events: (req) =>
          req.pageToken
            ? {
                items: [ev('b', '2026-03-02T10:00:00Z')],
                nextSyncToken: 'sync1',
              }
            : { items: [ev('a', '2026-03-01T10:00:00Z')], nextPageToken: 'p2' },
      }),
    );
    await syncResource('me', 'calendar/c1');
    expect((await db.events.toArray()).map((e) => e.id).sort()).toEqual([
      'a',
      'b',
    ]);
    const state = await db.updateState.get(['me', 'calendar/c1']);
    expect(state?.nextSyncToken).toBe('sync1');
    expect(state?.requesting).toBe(false);
    expect(calls.every((c) => !('resyncRequired' in c.req))).toBe(true);
  });

  it('applies cancelled instances without start as tombstones', async () => {
    await seedCalendar();
    let round = 0;
    setCalendarApiProvider(async () =>
      fakeApi({
        events: () =>
          round++ === 0
            ? { items: [ev('a', '2026-03-01T10:00:00Z')], nextSyncToken: 's1' }
            : {
                items: [
                  {
                    id: 'a',
                    status: 'cancelled',
                    updated: '2026-02-01T00:00:00Z',
                  },
                  { id: 'never-seen', status: 'cancelled' },
                ],
                nextSyncToken: 's2',
              },
      }),
    );
    await syncResource('me', 'calendar/c1');
    await syncResource('me', 'calendar/c1');
    const a = await db.events.get(['a', 'c1']);
    expect(a?.status).toBe('cancelled');
    expect(a?.start.ms).toBeDefined();
    expect(await db.events.get(['never-seen', 'c1'])).toBeUndefined();
    expect(
      (await db.updateState.get(['me', 'calendar/c1']))?.nextSyncToken,
    ).toBe('s2');
  });

  it('on 410 does a full sync and purges events Google no longer has', async () => {
    await seedCalendar();
    await db.events.bulkPut([
      toLocalEvent(ev('keep', '2026-03-01T10:00:00Z'), 'c1', 'UTC')!,
      toLocalEvent(ev('gone', '2026-03-01T10:00:00Z'), 'c1', 'UTC')!,
    ]);
    await db.updateState.put({
      account: 'me',
      resource: 'calendar/c1',
      nextSyncToken: 'stale',
      updatedAt: 1,
    });
    setCalendarApiProvider(async () =>
      fakeApi({
        events: (req) => {
          if (req.syncToken === 'stale') throw googleError(410);
          return {
            items: [ev('keep', '2026-03-01T10:00:00Z')],
            nextSyncToken: 'fresh',
          };
        },
      }),
    );
    await syncResource('me', 'calendar/c1');
    expect((await db.events.toArray()).map((e) => e.id)).toEqual(['keep']);
    expect(
      (await db.updateState.get(['me', 'calendar/c1']))?.nextSyncToken,
    ).toBe('fresh');
  });

  it('records errors without touching the stored token', async () => {
    await seedCalendar();
    localStorage.setItem('googleToken', '"t"');
    setCalendarApiProvider(async () =>
      fakeApi({
        events: () => {
          throw googleError(403, 'forbidden');
        },
      }),
    );
    await expect(syncResource('me', 'calendar/c1')).rejects.toBeTruthy();
    const state = await db.updateState.get(['me', 'calendar/c1']);
    expect(state?.error).toBe('HTTP 403');
    expect(state?.requesting).toBe(false);
    expect(localStorage.getItem('googleToken')).toBe('"t"');
  });

  it('shares one in-flight run between concurrent callers', async () => {
    await seedCalendar();
    setCalendarApiProvider(async () =>
      fakeApi({ events: () => ({ items: [], nextSyncToken: 's' }) }),
    );
    await Promise.all([
      syncResource('me', 'calendar/c1'),
      syncResource('me', 'calendar/c1'),
    ]);
    // One run: the recent window plus the full pass.
    expect(calls.map((c) => !!c.req.timeMin)).toEqual([true, false]);
  });
});

describe('syncResource calendarList', () => {
  it('deletes calendars removed from the list, with their events', async () => {
    await seedCalendar();
    await db.events.put(
      toLocalEvent(ev('a', '2026-03-01T10:00:00Z'), 'c1', 'UTC')!,
    );
    await db.updateState.put({
      account: 'me',
      resource: 'calendarList',
      nextSyncToken: 't',
      updatedAt: 1,
    });
    setCalendarApiProvider(async () =>
      fakeApi({
        calendarList: () => ({
          items: [
            { id: 'c1', deleted: true },
            {
              id: 'c2',
              summary: 'Orig',
              summaryOverride: 'Mine',
              timeZone: 'UTC',
            },
          ],
          nextSyncToken: 't2',
        }),
      }),
    );
    await syncResource('me', 'calendarList');
    expect(await db.calendars.get('c1')).toBeUndefined();
    expect(await db.events.count()).toBe(0);
    const c2 = await db.calendars.get('c2');
    expect(c2?.summary).toBe('Mine');
    expect(c2?.originalSummary).toBe('Orig');
  });
});

describe('recent-first sync', () => {
  it('fetches a recent window before the full pass and marks backfilling', async () => {
    await seedCalendar();
    const states: (boolean | undefined)[] = [];
    setCalendarApiProvider(async () =>
      fakeApi({
        events: async (req) => {
          states.push(
            (await db.updateState.get(['me', 'calendar/c1']))?.backfilling,
          );
          return req.timeMin
            ? { items: [ev('recent', '2026-03-01T10:00:00Z')] }
            : {
                items: [
                  ev('recent', '2026-03-01T10:00:00Z'),
                  ev('old', '2020-03-01T10:00:00Z'),
                ],
                nextSyncToken: 's',
              };
        },
      }),
    );
    await syncResource('me', 'calendar/c1');
    expect(calls.map((c) => !!c.req.timeMin)).toEqual([true, false]);
    expect(calls[0].req.syncToken).toBeUndefined();
    expect(states).toEqual([undefined, true]);
    const state = await db.updateState.get(['me', 'calendar/c1']);
    expect(state?.backfilling).toBe(false);
    expect(state?.nextSyncToken).toBe('s');
    expect((await db.events.toArray()).map((e) => e.id).sort()).toEqual([
      'old',
      'recent',
    ]);
  });

  it('incremental syncs skip the recent window', async () => {
    await seedCalendar();
    await db.updateState.put({
      account: 'me',
      resource: 'calendar/c1',
      nextSyncToken: 't',
      updatedAt: 1,
    });
    setCalendarApiProvider(async () =>
      fakeApi({ events: () => ({ items: [], nextSyncToken: 't2' }) }),
    );
    await syncResource('me', 'calendar/c1');
    expect(calls.length).toBe(1);
    expect(calls[0].req.timeMin).toBeUndefined();
  });

  it('after 410, purges only by the full pass, not the recent window', async () => {
    await seedCalendar();
    await db.events.put(
      toLocalEvent(ev('deleted-recent', '2026-03-01T10:00:00Z'), 'c1', 'UTC')!,
    );
    await db.updateState.put({
      account: 'me',
      resource: 'calendar/c1',
      nextSyncToken: 'stale',
      updatedAt: 1,
    });
    setCalendarApiProvider(async () =>
      fakeApi({
        events: (req) => {
          if (req.syncToken === 'stale') throw googleError(410);
          // A stale window response still lists the deleted event; the full
          // pass (the source of truth) does not.
          if (req.timeMin)
            return { items: [ev('deleted-recent', '2026-03-01T10:00:00Z')] };
          return {
            items: [ev('keep', '2026-03-02T10:00:00Z')],
            nextSyncToken: 'fresh',
          };
        },
      }),
    );
    await syncResource('me', 'calendar/c1');
    expect((await db.events.toArray()).map((e) => e.id)).toEqual(['keep']);
  });
});
