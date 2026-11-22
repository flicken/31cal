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

export type CalendarEvent = {
  id: string;
  calendarId: string;
  summary?: string;
  description?: string;
  location?: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  start: StartEnd & Millis;
  end: StartEnd & Millis;
  extendedProperties?: ExtendedProperties;
  updated: string;
  _schedules?: string[];
  attachments?: Attachment[];
  recurringEventId?: string;
  originalStartTime?: StartEnd;
  attendees?: Attendee[];
  htmlLink?: string;
  iCalUID?: string;
};

export type Attendee = {
  displayName: string;
  email: string;
};

export type Attachment = {
  fileUrl: string;
  title?: string;
  mimeType?: string;
  iconLink?: string;
  fileId?: string;
};

export type ExtendedProperties = {
  shared?: Record<string, string>;
  private?: Record<string, string>;
};

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
  error?: string;
  disabled?: boolean;
};

export type Setting = {
  id: string;
  value: string | string[];
};
