import 'fake-indexeddb/auto';
import { beforeEach, expect, test } from 'vitest';
import { db, clearLocalData } from '../models/db';
import { CalendarEvent } from '../models/types';
import {
  countsByCalendar,
  eventsInRange,
  latestUpdateByCalendar,
  noteDurations,
} from './eventQueries';

const H = 3600e3;
const D = 24 * H;
const T0 = Date.parse('2026-03-10T00:00:00Z');

function ev(
  id: string,
  calendarId: string,
  start: number,
  end: number,
  extra: Partial<CalendarEvent> = {},
): CalendarEvent {
  return {
    id,
    calendarId,
    status: 'confirmed',
    updated: '2026-01-01T00:00:00Z',
    start: { dateTime: new Date(start).toISOString(), ms: start },
    end: { dateTime: new Date(end).toISOString(), ms: end },
    ...extra,
  };
}

async function seed(events: CalendarEvent[]) {
  await db.events.bulkPut(events);
  for (const cal of new Set(events.map((e) => e.calendarId))) {
    await noteDurations(
      cal,
      events.filter((e) => e.calendarId === cal),
    );
  }
}

beforeEach(clearLocalData);

test('returns overlapping events from selected calendars only', async () => {
  await seed([
    ev('before', 'a', T0 - 2 * D, T0 - D),
    ev('inside', 'a', T0 + H, T0 + 2 * H),
    ev('after', 'a', T0 + 10 * D, T0 + 10 * D + H),
    ev('other-cal', 'b', T0 + H, T0 + 2 * H),
    ev('ends-at-start', 'a', T0 - H, T0),
  ]);
  const ids = (await eventsInRange(['a'], T0, T0 + D)).map((e) => e.id);
  expect(ids).toEqual(['inside']);
});

test('finds long events that started before the range', async () => {
  await seed([
    ev('trip', 'a', T0 - 30 * D, T0 + 5 * D),
    ev('short-old', 'a', T0 - 20 * D, T0 - 20 * D + H),
  ]);
  const ids = (await eventsInRange(['a'], T0, T0 + D)).map((e) => e.id);
  expect(ids).toEqual(['trip']);
});

test('finds recent events even without recorded stats', async () => {
  await db.events.put(ev('just-started', 'a', T0 - H, T0 + H));
  expect((await eventsInRange(['a'], T0, T0 + D)).map((e) => e.id)).toEqual([
    'just-started',
  ]);
});

test('noteDurations never shrinks the lookback', async () => {
  await noteDurations('a', [ev('x', 'a', 0, 10 * D)]);
  await noteDurations('a', [ev('y', 'a', 0, H)]);
  expect((await db.calendarStats.get('a'))?.maxDurationMs).toBe(10 * D);
});

test('counts and latest update ignore cancelled events', async () => {
  await seed([
    ev('1', 'a', T0, T0 + H, { updated: '2026-02-01T00:00:00Z' }),
    ev('2', 'a', T0, T0 + H, {
      updated: '2026-03-01T00:00:00Z',
      status: 'cancelled',
    }),
    ev('3', 'a', T0, T0 + H, {
      updated: '2026-02-15T00:00:00Z',
      status: 'tentative',
    }),
    ev('4', 'b', T0, T0 + H, { status: 'cancelled' }),
  ]);
  expect(await countsByCalendar(['a', 'b'])).toEqual({ a: 2, b: 0 });
  expect(await latestUpdateByCalendar(['a', 'b'])).toEqual({
    a: '2026-02-15T00:00:00Z',
  });
});
