import 'fake-indexeddb/auto';
import { DateTime, Settings } from 'luxon';
import { db, clearLocalData } from '../models/db';
import { CalendarEvent } from '../models/types';
import { queryPipelineEvents } from './query';

const NOW = DateTime.local(2026, 3, 10, 12);
const NOW_MS = NOW.toMillis();
beforeEach(async () => {
  Settings.now = () => NOW_MS;
  await clearLocalData();
});
afterEach(() => {
  Settings.now = () => Date.now();
});

const ev = (
  id: string,
  calendarId: string,
  day: number,
  over: Partial<CalendarEvent> = {},
): CalendarEvent => {
  const s = DateTime.local(2026, 3, day, 10);
  return {
    id,
    calendarId,
    summary: id,
    status: 'confirmed',
    updated: '2026-03-01T00:00:00Z',
    start: { dateTime: s.toISO()!, ms: s.toMillis() },
    end: {
      dateTime: s.plus({ hours: 1 }).toISO()!,
      ms: s.plus({ hours: 1 }).toMillis(),
    },
    ...over,
  };
};

test('uses selected calendars unless the filter names some, then applies conditions', async () => {
  await db.events.bulkPut([
    ev('a', 'c1', 11),
    ev('b', 'c1', 12, { recurringEventId: 'r' }),
    ev('c', 'c2', 11),
    ev('old', 'c1', 1),
    ev('gone', 'c1', 11, { status: 'cancelled' }),
  ]);
  const ids = async (conds: any[], selected = ['c1']) =>
    (await queryPipelineEvents(conds, selected)).map((e) => e.id);

  expect(await ids([])).toEqual(['old', 'a', 'b']);
  expect(await ids([{ type: 'dates', text: 'this week' }])).toEqual(['a', 'b']);
  expect(await ids([{ type: 'calendars', ids: ['c2'] }])).toEqual(['c']);
  expect(await ids([{ type: 'recurring', value: true }])).toEqual(['b']);
  expect(await ids([{ type: 'cancelled', value: 'only' }])).toEqual(['gone']);
  expect(await ids([], [])).toEqual([]);
});
