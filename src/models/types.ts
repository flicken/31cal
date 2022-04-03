export type MaybeDirty = {
  dirty?: boolean;
};

export type Calendar = {
  id: string;
  summary: string;
  selected: boolean;
  timeZone: string;
  foregroundColor: string;
  backgroundColor: string;
};

export function isStartEndDate(startEnd: StartEnd): startEnd is StartEndDate {
  return (<StartEndDate>startEnd).date !== undefined;
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

export type CalendarEvent = MaybeDirty & {
  id: string;
  calendarId: string;
  summary?: string;
  description?: string;
  location?: string;
  status?: string;
  start: StartEnd & Millis;
  end: StartEnd & Millis;
  extendedProperties?: ExtendedProperties;
  updated: string;
  _schedules?: String[];
  attachments: Attachment[];
  recurringEventId?: string;
  originalStartTime?: StartEnd;
  attendees: Attendee[];
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
  shared: any;
  private: any;
};

export type UpdateState = {
  account: string;
  resource: string;
  nextSyncToken?: string;
  nextPageToken?: string;
  etag?: string;
  updatedAt: number;
  requestedAt?: number;
};

export type Setting = {
  id: string;
  value: string | string[];
};
