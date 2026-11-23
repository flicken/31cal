import { DateTime } from 'luxon';
import { expect, test } from 'vitest';
import { groupByDay } from './Table';
import { CalendarEvent } from './models/types';

const ev = (id: string, startIso: string, endIso: string): CalendarEvent => {
  const s = DateTime.fromISO(startIso);
  const e = DateTime.fromISO(endIso);
  return {
    id,
    calendarId: 'c',
    updated: '',
    start: { dateTime: s.toISO()!, ms: s.toMillis() },
    end: { dateTime: e.toISO()!, ms: e.toMillis() },
  };
};

test('groups events by day in range, multi-day events in each day, sorted', () => {
  const events = [
    ev('late', '2026-03-03T10:00', '2026-03-03T11:00'),
    ev('span', '2026-03-01T22:00', '2026-03-02T02:00'),
    ev('outside', '2026-04-01T10:00', '2026-04-01T11:00'),
  ];
  const groups = groupByDay(events, ['2026-03-01', '2026-03-02', '2026-03-03']);
  expect(groups.map(([d, es]) => [d, es.map((e) => e.id)])).toEqual([
    ['2026-03-01', ['span']],
    ['2026-03-02', ['span']],
    ['2026-03-03', ['late']],
  ]);
});
