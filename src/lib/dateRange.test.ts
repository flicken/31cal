import { DateTime, Settings } from 'luxon';
import {
  dayText,
  nudge,
  presets,
  rangeText,
  unitRange,
  nextUnits,
  pastUnits,
} from './dateRange';
import { parseRelativeRange, parseSearchText } from './searchTextParser';

const NOW = DateTime.local(2026, 2, 10, 12, 0); // a Tuesday
beforeEach(() => {
  Settings.now = () => NOW.toMillis();
});
afterEach(() => {
  Settings.now = () => Date.now();
});

const iso = (d: DateTime) => d.toISO({ includeOffset: false });
const sameRange = (
  a: { start?: DateTime; end?: DateTime },
  b: { start: DateTime; end: DateTime },
) => {
  expect(+a.start!).toBe(+b.start);
  expect(+a.end!).toBe(+b.end);
};

describe('unit ranges', () => {
  test('this/next/last month', () => {
    const r = unitRange(NOW, 'month', 1);
    expect(iso(r.start)).toBe('2026-03-01T00:00:00.000');
    expect(iso(r.end)).toBe('2026-03-31T23:59:59.999');
    expect(iso(unitRange(NOW, 'month', -1).start)).toBe(
      '2026-01-01T00:00:00.000',
    );
  });

  test('a week is 7 days and contains today', () => {
    const r = unitRange(NOW, 'week');
    expect(r.start <= NOW && NOW <= r.end).toBe(true);
    expect(Math.round(r.end.diff(r.start, 'days').days)).toBe(7);
  });

  test('next 7 days starts today and includes 7 days', () => {
    const r = nextUnits(NOW, 7, 'days');
    expect(iso(r.start)).toBe('2026-02-10T00:00:00.000');
    expect(iso(r.end)).toBe('2026-02-16T23:59:59.999');
  });

  test('past 30 days ends today', () => {
    const r = pastUnits(NOW, 30, 'days');
    expect(iso(r.start)).toBe('2026-01-12T00:00:00.000');
    expect(iso(r.end)).toBe('2026-02-10T23:59:59.999');
  });
});

describe('parser relative ranges', () => {
  test.each([
    ['this week', () => unitRange(NOW, 'week')],
    ['next week', () => unitRange(NOW, 'week', 1)],
    ['last week', () => unitRange(NOW, 'week', -1)],
    ['this month', () => unitRange(NOW, 'month')],
    ['next month', () => unitRange(NOW, 'month', 1)],
    ['this year', () => unitRange(NOW, 'year')],
    ['next 7 days', () => nextUnits(NOW, 7, 'days')],
    ['next 2 weeks', () => nextUnits(NOW, 2, 'weeks')],
    ['Next 3 Months', () => nextUnits(NOW, 3, 'months')],
    ['past 30 days', () => pastUnits(NOW, 30, 'days')],
    ['last 2 weeks', () => pastUnits(NOW, 2, 'weeks')],
  ])('%s', (text, expected) => {
    const r = parseSearchText(text);
    const e = expected();
    expect([+r.start!, +r.end!]).toEqual([+e.start, +e.end]);
  });

  test('combines with updated since', () => {
    const r = parseSearchText('next week updated since yesterday');
    sameRange(r, unitRange(NOW, 'week', 1));
    expect(r.updatedSince?.toISODate()).toBe('2026-02-09');
  });

  test('leaves other text to chrono', () => {
    expect(parseRelativeRange('january to march')).toBeUndefined();
  });
});

describe('presets', () => {
  test.each(presets(NOW).map((p) => [p.label, p] as const))(
    '%s text parses back to its range',
    (_label, p) => {
      const parsed = parseSearchText(p.text);
      expect([parsed.start!.toISODate(), parsed.end!.toISODate()]).toEqual([
        p.range.start.toISODate(),
        p.range.end.toISODate(),
      ]);
    },
  );

  test('Everything and All upcoming use cached event bounds', () => {
    const first = DateTime.local(2019, 5, 3, 9).toMillis();
    const last = DateTime.local(2028, 1, 2, 9).toMillis();
    const byLabel = Object.fromEntries(
      presets(NOW, { first, last }).map((p) => [p.label, p.range]),
    );
    expect(byLabel['Everything'].start.toISODate()).toBe('2019-05-03');
    expect(byLabel['Everything'].end.toISODate()).toBe('2028-01-02');
    expect(byLabel['All upcoming'].start.toISODate()).toBe('2026-02-10');
  });
});

describe('nudge', () => {
  test('a month moves to the whole next month, whatever its length', () => {
    const jan = unitRange(DateTime.local(2026, 1, 15), 'month');
    const feb = nudge(jan, 1);
    expect(iso(feb.start)).toBe('2026-02-01T00:00:00.000');
    expect(iso(feb.end)).toBe('2026-02-28T23:59:59.999');
    const back = nudge(feb, -1);
    expect(iso(back.end)).toBe('2026-01-31T23:59:59.999');
  });

  test('three months move by three months', () => {
    const q = {
      start: DateTime.local(2026, 1, 1),
      end: DateTime.local(2026, 3, 31).endOf('day'),
    };
    const next = nudge(q, 1);
    expect(next.start.toISODate()).toBe('2026-04-01');
    expect(iso(next.end)).toBe('2026-06-30T23:59:59.999');
  });

  test('a week moves by a week', () => {
    const w = unitRange(NOW, 'week');
    const n = nudge(w, 1);
    expect(+n.start).toBe(+unitRange(NOW, 'week', 1).start);
    expect(+n.end).toBe(+unitRange(NOW, 'week', 1).end);
  });

  test('N days move by N calendar days', () => {
    const r = nextUnits(NOW, 7, 'days');
    const n = nudge(r, 1);
    expect(iso(n.start)).toBe('2026-02-17T00:00:00.000');
    expect(iso(n.end)).toBe('2026-02-23T23:59:59.999');
  });

  test('keeps local midnight across DST', () => {
    const zone = 'America/New_York';
    const start = DateTime.fromISO('2026-03-02T00:00', { zone });
    const r = { start, end: start.plus({ days: 6 }).endOf('day') };
    const n = nudge(r, 1); // crosses the March 8 DST change
    expect(n.start.toISO()).toBe('2026-03-09T00:00:00.000-04:00');
    expect(n.end.toFormat('yyyy-MM-dd HH:mm')).toBe('2026-03-15 23:59');
  });

  test('a mid-day range shifts by its own length', () => {
    const r = { start: NOW, end: NOW.plus({ hours: 3 }) };
    expect(+nudge(r, 1).start).toBe(+NOW.plus({ hours: 3 }));
  });
});

describe('text round trips', () => {
  test('a whole month is written as the month name', () => {
    const r = unitRange(DateTime.local(2026, 12, 5), 'month');
    expect(rangeText(r)).toBe('December 2026');
    sameRange(parseSearchText('December 2026'), r);
  });

  test('other ranges are written as two dates', () => {
    const r = {
      start: DateTime.local(2026, 11, 22),
      end: DateTime.local(2027, 1, 3).endOf('day'),
    };
    expect(rangeText(r)).toBe('Nov 22, 2026 to Jan 3, 2027');
    sameRange(parseSearchText(rangeText(r)), r);
  });

  test('single dates parse back to the same day', () => {
    const d = DateTime.local(2025, 7, 4);
    expect(parseSearchText(dayText(d)).start?.toISODate()).toBe('2025-07-04');
  });
});
