import { CalendarEvent } from '../models/types';
import type { Change } from './actions';
import { groupChanges, insertSourceKey } from './run';

const ev = (id: string, calendarId = 'c1'): CalendarEvent => ({
  id,
  calendarId,
  summary: `S ${id}`,
  updated: '',
  start: { date: '2026-03-01' },
  end: { date: '2026-03-02' },
});

test('groups patches, deletes and inserts per target calendar', () => {
  const changes: Change[] = [
    {
      key: 'c1/a',
      kind: 'patch',
      event: ev('a'),
      before: {},
      after: {},
      warnings: [],
      patch: { eventId: 'a', calendarId: 'c1', location: 'X' },
    },
    {
      key: 'c1/b',
      kind: 'delete',
      event: ev('b'),
      before: {},
      after: {},
      warnings: [],
    },
    {
      key: 'c1/c',
      kind: 'insert',
      event: ev('c'),
      before: {},
      after: {},
      warnings: [],
      insert: { calendarId: 'c2', event: { summary: 'x' } },
    },
    {
      key: 'c1/d',
      kind: 'insert',
      event: ev('d'),
      before: {},
      after: {},
      warnings: [],
      insert: { calendarId: 'c2', event: { summary: 'y' } },
    },
  ];
  const g = groupChanges(changes);
  // Patches carry the summary for the progress/summary toast.
  expect(g.patches).toEqual([
    { eventId: 'a', calendarId: 'c1', location: 'X', summary: 'S a' },
  ]);
  expect(g.deletes).toEqual([
    { eventId: 'b', calendarId: 'c1', summary: 'S b' },
  ]);
  expect(g.inserts.get('c2')?.map((e) => e.summary)).toEqual(['x', 'y']);
});

test('maps a failed copy back to its source event', () => {
  expect(
    insertSourceKey({
      extendedProperties: {
        private: {
          '31cal.copiedFromId': 'a',
          '31cal.copiedFromCalendarId': 'c1',
        },
      },
    }),
  ).toBe('c1/a');
  expect(insertSourceKey({ summary: 'x' })).toBeUndefined();
});
