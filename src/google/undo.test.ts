import 'fake-indexeddb/auto';
import { beforeEach, expect, test } from 'vitest';
import { clearLocalData, db } from '../models/db';
import { CalendarEvent } from '../models/types';
import { snapshot, undeletePatches, undoPatches } from './undo';

const event: CalendarEvent = {
  id: 'e1',
  calendarId: 'c1',
  status: 'confirmed',
  updated: '2026-01-01T00:00:00Z',
  summary: 'Soccer',
  start: { dateTime: '2026-03-01T10:00:00Z', ms: 1 },
  end: { dateTime: '2026-03-01T11:00:00Z', ms: 2 },
};

beforeEach(async () => {
  await clearLocalData();
  await db.events.put(event);
});

test('snapshot reads cached events by calendar/id', async () => {
  const snap = await snapshot([
    { eventId: 'e1', calendarId: 'c1' },
    { eventId: 'missing', calendarId: 'c1' },
  ]);
  expect([...snap.keys()]).toEqual(['c1/e1']);
});

test('undo restores changed fields, clears added ones, drops ms', async () => {
  const snap = await snapshot([{ eventId: 'e1', calendarId: 'c1' }]);
  const undo = undoPatches(
    [
      {
        eventId: 'e1',
        calendarId: 'c1',
        summary: 'Football',
        location: 'Park',
        start: { dateTime: '2026-03-02T10:00:00Z' },
      },
      { eventId: 'unknown', calendarId: 'c1', summary: 'x' },
    ],
    snap,
  );
  expect(undo).toEqual([
    {
      eventId: 'e1',
      calendarId: 'c1',
      summary: 'Soccer',
      location: null,
      start: { dateTime: '2026-03-01T10:00:00Z' },
    },
  ]);
});

test('undelete patches status back to confirmed', () => {
  expect(
    undeletePatches([{ eventId: 'e1', calendarId: 'c1', summary: 'S' }]),
  ).toEqual([
    { eventId: 'e1', calendarId: 'c1', summary: 'S', status: 'confirmed' },
  ]);
});
