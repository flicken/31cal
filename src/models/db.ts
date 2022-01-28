import Dexie, { Table } from 'dexie';

export interface Calendar {
    id: string;
    summary: string;
    selected: boolean;
}

export interface Event {
    id: string;
    calendarId: string;
}

export interface UpdateState {
    account: string;
    resource: string;
    nextSyncToken?: string;
    nextPageToken?: string;
    etag?: string;
    updatedAt: number;
}

export class DB extends Dexie {
    calendars!: Table<Calendar, string>;
    events!: Table<Event, string>;
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

