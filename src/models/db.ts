import Dexie, { Table } from 'dexie';

import { Calendar, CalendarEvent, Setting, UpdateState } from './types';

export class DB extends Dexie {
  calendars!: Table<Calendar, string>;
  events!: Table<CalendarEvent, [string, string]>;
  updateState!: Table<UpdateState, [string, string]>;
  settings!: Table<Setting, string>;
  constructor() {
    super('31cal');
    this.version(1).stores({
      calendars: 'id, summary',
    });
    this.version(2).stores({
      updateState: '[account+resource]',
    });
    this.version(3).stores({
      calendars: 'id, summary',
      updateState: '[account+resource]',
    });
    this.version(4).stores({
      events: '[id+calendarId]',
    });
    this.version(5).stores({
      settings: 'id',
      events: '[id+calendarId], dirty',
    });
    this.version(6).stores({
      events: '[id+calendarId], calendarId, dirty',
    });
    this.version(8).stores({
      events: '[id+calendarId], calendarId, dirty, [calendarId+start.ms]',
    });
    this.version(12).stores({
      events:
        '[id+calendarId], calendarId, dirty, [calendarId+start.ms], *_schedules',
    });
    this.version(13).stores({
      events:
        '[id+calendarId], calendarId, dirty, [calendarId+start.ms], *_schedules, [start.ms+end.ms]',
    });
    // Drop the never-read `dirty` index and field.
    this.version(14)
      .stores({
        events:
          '[id+calendarId], calendarId, [calendarId+start.ms], *_schedules, [start.ms+end.ms]',
      })
      .upgrade(async (tx) => {
        await tx
          .table('events')
          .toCollection()
          .modify((e: any) => {
            delete e.dirty;
            delete e.eventId;
          });
        await tx
          .table('calendars')
          .toCollection()
          .modify((c: any) => {
            delete c.dirty;
          });
      });
  }
}
export const db = new DB();

/** Remove every cached calendar, event, sync state and setting. */
export async function clearLocalData() {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });
}

if (import.meta.env.DEV) {
  (globalThis as any).db = db;
}
