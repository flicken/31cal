import { DateTime } from 'luxon';
import { expect, test } from 'vitest';
import { CalendarEvent } from '../models/types';
import { filterForFilters, FilterValues } from './filters';

const start = DateTime.fromISO('2026-03-10T00:00:00Z');
const end = DateTime.fromISO('2026-03-11T00:00:00Z');
const base: FilterValues = {
  start,
  end,
  showCancelled: false,
  calendarIds: ['a'],
};

const ev = (overrides: Partial<CalendarEvent>): CalendarEvent => ({
  id: 'x',
  calendarId: 'a',
  status: 'confirmed',
  updated: '2026-01-01T00:00:00Z',
  start: { dateTime: '', ms: Date.parse('2026-03-10T10:00:00Z') },
  end: { dateTime: '', ms: Date.parse('2026-03-10T11:00:00Z') },
  ...overrides,
});

test('keeps events overlapping the range in selected calendars', () => {
  const f = filterForFilters(base);
  expect(f(ev({}))).toBe(true);
  expect(f(ev({ calendarId: 'b' }))).toBe(false);
});

test('range bounds: end at range start excluded, start at range end included', () => {
  const f = filterForFilters(base);
  expect(
    f(
      ev({
        start: { date: '', ms: +start - 3600e3 },
        end: { date: '', ms: +start },
      }),
    ),
  ).toBe(false);
  expect(
    f(
      ev({
        start: { date: '', ms: +end },
        end: { date: '', ms: +end + 3600e3 },
      }),
    ),
  ).toBe(true);
});

test('cancelled events only with showCancelled', () => {
  expect(filterForFilters(base)(ev({ status: 'cancelled' }))).toBe(false);
  expect(
    filterForFilters({ ...base, showCancelled: true })(
      ev({ status: 'cancelled' }),
    ),
  ).toBe(true);
});

test('updatedSince compares against the event update time', () => {
  const f = filterForFilters({
    ...base,
    updatedSince: DateTime.fromISO('2026-02-01T00:00:00Z'),
  });
  expect(f(ev({ updated: '2026-01-15T00:00:00Z' }))).toBe(false);
  expect(f(ev({ updated: '2026-02-15T00:00:00Z' }))).toBe(true);
});

test('no selected calendars shows nothing', () => {
  expect(filterForFilters({ ...base, calendarIds: [] })(ev({}))).toBe(false);
});
