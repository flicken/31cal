import Dexie, { Table } from 'dexie';

import {Calendar, CalendarEvent, UpdateState} from './types';

export class DB extends Dexie {
    calendars!: Table<Calendar, string>;
    events!: Table<CalendarEvent, string>;
    updateState!: Table<UpdateState, string[]>;
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
            events: '[id+calendarId]'
        });
    }
}

export const db = new DB();

