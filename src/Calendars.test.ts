import { expect, test } from 'vitest';
import { filterCalendars, moveItem } from './Calendars';
import { Calendar } from './models/types';

test('moveItem moves forward and back, clamping the target', () => {
  expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  expect(moveItem(['a', 'b', 'c'], 1, 9)).toEqual(['a', 'c', 'b']);
});

test('filterCalendars matches case-insensitively and ignores blank queries', () => {
  const cals = [
    { summary: 'Home' },
    { summary: 'Work' },
    { summary: 'Soccer club' },
  ] as Calendar[];
  expect(filterCalendars(cals, '  ').length).toBe(3);
  expect(filterCalendars(cals, 'CLUB').map((c) => c.summary)).toEqual([
    'Soccer club',
  ]);
  expect(filterCalendars(cals, 'o').length).toBe(3);
});
