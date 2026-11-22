import { DateTime } from 'luxon';
import { monthWeeks } from './Calendar';

const days = (weeks: (DateTime | null)[][]) =>
  weeks.map((w) => w.map((d) => (d ? d.day : 0)));

test('weeks start on Monday when asked, padding outside days', () => {
  const weeks = days(monthWeeks(DateTime.local(2026, 2, 1), 1));
  // Feb 1 2026 is a Sunday: six blanks before it in a Monday-first week.
  expect(weeks[0]).toEqual([0, 0, 0, 0, 0, 0, 1]);
  expect(weeks.at(-1)).toEqual([23, 24, 25, 26, 27, 28, 0]);
});

test('weeks start on Sunday when asked', () => {
  const weeks = days(monthWeeks(DateTime.local(2026, 2, 1), 7));
  expect(weeks[0]).toEqual([1, 2, 3, 4, 5, 6, 7]);
  expect(weeks).toHaveLength(4);
});

test('every day of the month appears exactly once, across DST', () => {
  const month = DateTime.fromObject(
    { year: 2026, month: 3 },
    { zone: 'America/New_York' },
  );
  const all = monthWeeks(month, 7).flat().filter(Boolean) as DateTime[];
  expect(all.map((d) => d.day)).toEqual(
    Array.from({ length: 31 }, (_, i) => i + 1),
  );
});
