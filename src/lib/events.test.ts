import { DateTime } from 'luxon';
import { dayOfWeek, eventDays } from './events';

test('all-day events use their own dates regardless of time zone', () => {
  // ms computed in a far-east calendar zone would land on the previous local day.
  const event = {
    start: { date: '2026-03-02', ms: Date.parse('2026-03-01T15:00:00Z') },
    end: { date: '2026-03-04', ms: Date.parse('2026-03-03T15:00:00Z') },
  };
  expect(eventDays(event)).toEqual(['2026-03-02', '2026-03-03']);
});

test('timed events span the local days they touch', () => {
  const s = DateTime.local(2026, 3, 2, 23, 0);
  const e = DateTime.local(2026, 3, 3, 1, 0);
  expect(
    eventDays({
      start: { dateTime: s.toISO()!, ms: s.toMillis() },
      end: { dateTime: e.toISO()!, ms: e.toMillis() },
    }),
  ).toEqual(['2026-03-02', '2026-03-03']);
});

test('zero-length events at midnight still show on their day', () => {
  const s = DateTime.local(2026, 3, 2);
  expect(
    eventDays({
      start: { dateTime: s.toISO()!, ms: s.toMillis() },
      end: { dateTime: s.toISO()!, ms: s.toMillis() },
    }),
  ).toEqual(['2026-03-02']);
});

test('dayOfWeek does not shift west of UTC', () => {
  expect(dayOfWeek('2026-03-02')).toBe(1); // Monday
  expect(dayOfWeek('2026-03-01')).toBe(0); // Sunday
});
