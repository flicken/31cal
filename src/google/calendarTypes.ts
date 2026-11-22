/**
 * The subset of the Google Calendar API v3 that 31cal uses.
 * https://developers.google.com/calendar/api/v3/reference
 */

export type EventDateTime = {
  /** All-day: YYYY-MM-DD (end is exclusive). */
  date?: string;
  /** RFC 3339 with offset. */
  dateTime?: string;
  /** IANA zone name. */
  timeZone?: string;
};

export type EventStatus = 'confirmed' | 'tentative' | 'cancelled';

export type GoogleAttachment = {
  fileUrl: string;
  title?: string;
  mimeType?: string;
  iconLink?: string;
  fileId?: string;
};

export type GoogleAttendee = {
  email?: string;
  displayName?: string;
  responseStatus?: string;
};

export type GooglePerson = {
  email?: string;
  displayName?: string;
  self?: boolean;
};

export type GoogleEvent = {
  id: string;
  status?: EventStatus;
  summary?: string;
  description?: string;
  location?: string;
  /** Absent on cancelled instances returned by incremental sync. */
  start?: EventDateTime;
  end?: EventDateTime;
  updated?: string;
  created?: string;
  extendedProperties?: {
    shared?: Record<string, string>;
    private?: Record<string, string>;
  };
  attachments?: GoogleAttachment[];
  attendees?: GoogleAttendee[];
  creator?: GooglePerson;
  organizer?: GooglePerson;
  recurringEventId?: string;
  originalStartTime?: EventDateTime;
  transparency?: 'opaque' | 'transparent';
  htmlLink?: string;
  iCalUID?: string;
  etag?: string;
  sequence?: number;
  eventType?: string;
};

export type GoogleCalendarListEntry = {
  id: string;
  summary?: string;
  summaryOverride?: string;
  description?: string;
  timeZone?: string;
  foregroundColor?: string;
  backgroundColor?: string;
  primary?: boolean;
  selected?: boolean;
  /** Set on entries removed from the list (incremental sync only). */
  deleted?: boolean;
  accessRole?: 'freeBusyReader' | 'reader' | 'writer' | 'owner';
};

export type ListResponse<T> = {
  items?: T[];
  nextPageToken?: string;
  nextSyncToken?: string;
};

export type ListParams = {
  pageToken?: string;
  syncToken?: string;
  showDeleted?: boolean;
  singleEvents?: boolean;
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
};

export type EventsListParams = ListParams & { calendarId: string };

type Response<T> = Promise<{ result: T }>;

/** Writable event fields (what insert/patch accept). */
export type EventResource = Partial<Omit<GoogleEvent, 'id'>> & { id?: string };

/** The calendar client used by sync and writes (gapi or a fetch wrapper). */
export type CalendarApi = {
  calendarList: {
    list(params: ListParams): Response<ListResponse<GoogleCalendarListEntry>>;
  };
  events: {
    list(params: EventsListParams): Response<ListResponse<GoogleEvent>>;
    insert(params: {
      calendarId: string;
      supportsAttachments?: boolean;
      resource: EventResource;
    }): Response<GoogleEvent>;
    patch(params: {
      calendarId: string;
      eventId: string;
      supportsAttachments?: boolean;
      resource: Record<string, unknown>;
    }): Response<GoogleEvent>;
    delete(params: { calendarId: string; eventId: string }): Response<unknown>;
  };
};

/** Error body Google returns, as gapi surfaces it on `e.result.error`. */
export type GoogleErrorBody = {
  code?: number;
  message?: string;
  errors?: { reason?: string; message?: string }[];
};
