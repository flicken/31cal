import Dexie, { Table } from 'dexie';

import { Calendar, CalendarEvent, Setting, UpdateState } from './types';

export class DB extends Dexie {
  calendars!: Table<Calendar & { dirty?: boolean }, string>;
  events!: Table<CalendarEvent, string>;
  updateState!: Table<UpdateState, string[]>;
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
    // TODO: add multi-index for schedule
    // https://dexie.org/docs/MultiEntry-Index
    this.version(12).stores({
      events:
        '[id+calendarId], calendarId, dirty, [calendarId+start.ms], *_schedules',
    });
    this.version(13).stores({
      events:
        '[id+calendarId], calendarId, dirty, [calendarId+start.ms], *_schedules, [start.ms+end.ms]',
    });
  }
}
export const db = new DB();

(globalThis as any).db = db;
