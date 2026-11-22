import type {
  EventStatus,
  GoogleAttachment,
  GoogleAttendee,
  GoogleEvent,
} from '../google/calendarTypes';

/** A calendar-list entry as stored locally (summaryOverride applied). */
export type Calendar = {
  id: string;
  summary: string;
  selected: boolean;
  timeZone: string;
  foregroundColor: string;
  backgroundColor: string;
  primary?: boolean;
  summaryOverride?: string;
  originalSummary?: string;
  description?: string;
  accessRole?: 'freeBusyReader' | 'reader' | 'writer' | 'owner';
};

export function isStartEndDate(startEnd: StartEnd): startEnd is StartEndDate {
  return 'date' in startEnd && startEnd.date !== undefined;
}

export type StartEndDate = {
  date: string;
};

export type StartEndDateTime = {
  dateTime: string;
  timeZone?: string;
};

export type StartEnd = StartEndDate | StartEndDateTime;

export type Millis = {
  ms?: number;
};

/**
 * A Google event as stored locally: start/end gain `ms` for indexed range
 * queries, plus the owning calendar and parsed 31cal schedules.
 */
export type CalendarEvent = Omit<GoogleEvent, 'start' | 'end' | 'updated'> & {
  calendarId: string;
  start: StartEnd & Millis;
  end: StartEnd & Millis;
  updated: string;
  status?: EventStatus;
  _schedules?: string[];
};

export type Attendee = GoogleAttendee;
export type Attachment = GoogleAttachment;
export type ExtendedProperties = NonNullable<GoogleEvent['extendedProperties']>;

export type UpdateState = {
  account: string;
  resource: string;
  nextSyncToken?: string;
  nextPageToken?: string;
  etag?: string;
  updatedAt: number;
  requestedAt?: number;
  requesting?: boolean;
  resyncRequired?: boolean;
  /** Recent events are stored; older history is still being fetched. */
  backfilling?: boolean;
  error?: string;
  disabled?: boolean;
};

export type Setting = {
  id: string;
  value: string | string[];
};
