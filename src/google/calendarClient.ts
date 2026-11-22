/**
 * Minimal Google Calendar v3 REST client over fetch. Replaces the runtime
 * gapi script: no third-party JS, no discovery document, typed calls.
 *
 * Errors are thrown with the same shape gapi used ({ status, result: { error
 * } }) so googleErrors.ts classifies them unchanged.
 */
import type { CalendarApi, GoogleErrorBody } from './calendarTypes';

const BASE = 'https://www.googleapis.com/calendar/v3';

export class GoogleApiError extends Error {
  constructor(
    readonly status: number,
    readonly result: { error: GoogleErrorBody },
  ) {
    super(result.error.message ?? `Google API error ${status}`);
    this.name = 'GoogleApiError';
  }
}

/** The OAuth access token stored by useGoogleButton (localStorage JSON). */
function storedAccessToken(): string | undefined {
  try {
    const raw = localStorage.getItem('googleToken');
    return raw ? (JSON.parse(raw)?.access_token ?? undefined) : undefined;
  } catch {
    return undefined;
  }
}

let accessToken: () => string | undefined = storedAccessToken;

/** Overridable for tests. */
export function setAccessTokenProvider(provider: () => string | undefined) {
  accessToken = provider;
}

type Query = Record<string, string | number | boolean | undefined>;

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  { query, body }: { query?: Query; body?: unknown } = {},
): Promise<{ result: T }> {
  const token = accessToken();
  if (!token) {
    // Not an auth *failure* (status 0): don't trigger a re-auth popup loop.
    throw new GoogleApiError(0, {
      error: { code: 0, message: 'Not signed in' },
    });
  }
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }
  if (!res.ok) {
    const error = (json as { error?: GoogleErrorBody } | undefined)?.error ?? {
      code: res.status,
      message: res.statusText || `HTTP ${res.status}`,
    };
    throw new GoogleApiError(res.status, {
      error: { code: res.status, ...error },
    });
  }
  return { result: json as T };
}

const enc = encodeURIComponent;

export const fetchCalendarApi: CalendarApi = {
  calendarList: {
    list: (params) =>
      request('GET', '/users/me/calendarList', { query: params }),
  },
  events: {
    list: ({ calendarId, ...query }) =>
      request('GET', `/calendars/${enc(calendarId)}/events`, { query }),
    insert: ({ calendarId, supportsAttachments, resource }) =>
      request('POST', `/calendars/${enc(calendarId)}/events`, {
        query: { supportsAttachments },
        body: resource,
      }),
    patch: ({ calendarId, eventId, supportsAttachments, resource }) =>
      request('PATCH', `/calendars/${enc(calendarId)}/events/${enc(eventId)}`, {
        query: { supportsAttachments },
        body: resource,
      }),
    delete: ({ calendarId, eventId }) =>
      request('DELETE', `/calendars/${enc(calendarId)}/events/${enc(eventId)}`),
  },
};

let apiProvider = async (): Promise<CalendarApi> => fetchCalendarApi;

/** The calendar client used by sync and writes. */
export function calendarApi(): Promise<CalendarApi> {
  return apiProvider();
}

/** Overridable for tests. */
export function setCalendarApiProvider(provider: () => Promise<CalendarApi>) {
  apiProvider = provider;
}
