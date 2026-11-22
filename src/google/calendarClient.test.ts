import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import {
  fetchCalendarApi,
  GoogleApiError,
  setAccessTokenProvider,
} from './calendarClient';
import { isAuthError, isRetryable, statusOf } from './googleErrors';

type Call = { url: URL; init: RequestInit };
let calls: Call[] = [];
let respond: (call: Call) => Response;

beforeEach(() => {
  calls = [];
  setAccessTokenProvider(() => 'tok');
  vi.stubGlobal('fetch', async (url: URL, init: RequestInit) => {
    const call = { url: new URL(url), init };
    calls.push(call);
    return respond(call);
  });
});
afterEach(() => vi.unstubAllGlobals());

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

test('lists events with encoded ids, query params and a bearer token', async () => {
  respond = () => json({ items: [{ id: 'a' }], nextSyncToken: 's' });
  const { result } = await fetchCalendarApi.events.list({
    calendarId: 'x@group.calendar.google.com',
    syncToken: 't',
    singleEvents: true,
    pageToken: undefined,
  });
  expect(result.items?.[0].id).toBe('a');
  const { url, init } = calls[0];
  expect(url.pathname).toBe(
    '/calendar/v3/calendars/x%40group.calendar.google.com/events',
  );
  expect(url.searchParams.get('syncToken')).toBe('t');
  expect(url.searchParams.get('singleEvents')).toBe('true');
  expect(url.searchParams.has('pageToken')).toBe(false);
  expect((init.headers as Record<string, string>).Authorization).toBe(
    'Bearer tok',
  );
});

test('patch sends JSON and delete accepts an empty 204', async () => {
  respond = ({ init }) =>
    init.method === 'DELETE'
      ? new Response(null, { status: 204 })
      : json({ id: 'e' });
  await fetchCalendarApi.events.patch({
    calendarId: 'c',
    eventId: 'e',
    supportsAttachments: true,
    resource: { summary: 'x' },
  });
  expect(calls[0].init.method).toBe('PATCH');
  expect(calls[0].init.body).toBe('{"summary":"x"}');
  expect(calls[0].url.searchParams.get('supportsAttachments')).toBe('true');
  await expect(
    fetchCalendarApi.events.delete({ calendarId: 'c', eventId: 'e' }),
  ).resolves.toEqual({ result: undefined });
});

test('errors keep the gapi shape so classification still works', async () => {
  respond = () =>
    json(
      {
        error: {
          code: 403,
          message: 'Rate',
          errors: [{ reason: 'rateLimitExceeded' }],
        },
      },
      403,
    );
  const e = await fetchCalendarApi.calendarList.list({}).catch((x) => x);
  expect(e).toBeInstanceOf(GoogleApiError);
  expect(statusOf(e)).toBe(403);
  expect(isRetryable(e)).toBe(true);

  respond = () =>
    new Response('Unauthorized', { status: 401, statusText: 'Unauthorized' });
  const e2 = await fetchCalendarApi.calendarList.list({}).catch((x) => x);
  expect(isAuthError(e2)).toBe(true);
});

test('missing token fails without looking like an auth failure', async () => {
  setAccessTokenProvider(() => undefined);
  const e = await fetchCalendarApi.calendarList.list({}).catch((x) => x);
  expect(e.message).toBe('Not signed in');
  expect(isAuthError(e)).toBe(false);
  expect(calls).toHaveLength(0);
});
