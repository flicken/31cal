export type MaybeDirty = {
  dirty?: boolean;
};

export type Calendar = {
  id: string;
  summary: string;
  selected: boolean;
  timeZone: string;
};

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
  end?: StartEnd & Millis;
  extendedProperties?: ExtendedProperties;
  _schedules?: String[];
  attachments: Attachment[];
};

export type Attachment = {
  fileUrl: string;
  title?: string;
  mimeType: string;
  iconLink?: string;
  fileId: string;
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
  value: string;
};
