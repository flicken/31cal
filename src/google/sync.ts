/**
 * Incremental sync of Google Calendar resources into IndexedDB.
 *
 * - One in-flight sync per [account, resource]; concurrent callers share it.
 * - Pages are written as they arrive so views fill in progressively.
 * - The sync token is only saved once the last page is stored.
 * - A 410 (expired sync token) triggers a full sync that also purges rows
 *   Google no longer returns.
 * - Cancelled event instances without start/end are applied as tombstones.
 * - Calendars removed from the calendar list are deleted with their events.
 */
import { DateTime } from 'luxon';
import { db } from '../models/db';
import { Calendar, CalendarEvent, UpdateState } from '../models/types';
import { eventSchedules } from '../lib/useScheduleList';
import { debug } from '../lib/log';
import { noteDurations } from '../lib/eventQueries';
import ensureClient from './ensureClient';
import { callGoogle, errorMessage, statusOf } from './googleErrors';

export const CALENDAR_LIST = 'calendarList';
export const calendarResource = (calendarId: string) =>
  `calendar/${calendarId}`;

type ListResult = {
  items?: any[];
  nextPageToken?: string;
  nextSyncToken?: string;
};

export type CalendarApi = {
  calendarList: { list(req: object): Promise<{ result: ListResult }> };
  events: { list(req: object): Promise<{ result: ListResult }> };
};

/** Overridable for tests. */
let apiProvider = async (): Promise<CalendarApi> => {
  await ensureClient();
  return (window as any).gapi.client.calendar;
};

export function setCalendarApiProvider(provider: () => Promise<CalendarApi>) {
  apiProvider = provider;
}

/** Milliseconds for a Google start/end, or undefined when it is missing. */
export function toMillis(
  value: { date?: string; dateTime?: string; timeZone?: string } | undefined,
  timeZone: string | undefined,
): number | undefined {
  const iso = value?.dateTime || value?.date;
  if (!iso) return undefined;
  const date = DateTime.fromISO(iso, { zone: value?.timeZone || timeZone });
  return date.isValid ? date.toMillis() : undefined;
}

/** Add the derived fields the local DB indexes on. Returns undefined if unusable. */
export function toLocalEvent(
  event: any,
  calendarId: string,
  timeZone: string | undefined,
): CalendarEvent | undefined {
  const startMs = toMillis(event.start, timeZone);
  let endMs = toMillis(event.end, timeZone);
  if (startMs === undefined) return undefined;
  if (endMs === undefined || endMs < startMs) endMs = startMs;
  if (event.start?.date && event.start.date === event.end?.date) {
    // All-day end dates are exclusive; tolerate equal start/end.
    endMs = DateTime.fromMillis(endMs).plus({ days: 1 }).toMillis();
  }

  let schedules: string[] = [];
  try {
    schedules = eventSchedules(event);
  } catch (e) {
    debug('Ignoring malformed schedule properties', event.id, e);
  }

  return {
    ...event,
    calendarId,
    start: { ...event.start, ms: startMs },
    end: { ...(event.end ?? event.start), ms: endMs },
    _schedules: schedules,
  };
}

type Handler = {
  request: object;
  list: (api: CalendarApi, req: object) => Promise<{ result: ListResult }>;
  tables: any[];
  apply: (items: any[]) => Promise<void>;
  purgeExcept: (seenIds: Set<string>) => Promise<void>;
};

async function deleteCalendarLocally(calendarId: string) {
  await db.events.where('calendarId').equals(calendarId).delete();
  await db.calendars.delete(calendarId);
  await db.calendarStats.delete(calendarId);
  await db.updateState
    .filter((s) => s.resource === calendarResource(calendarId))
    .delete();
}

const calendarListHandler: Handler = {
  request: {},
  list: (api, req) => api.calendarList.list(req),
  tables: [db.calendars, db.events, db.updateState, db.calendarStats],
  async apply(items) {
    for (const calendar of items) {
      if (calendar.deleted) {
        await deleteCalendarLocally(calendar.id);
        continue;
      }
      if (calendar.summaryOverride) {
        calendar.originalSummary = calendar.summary;
        calendar.summary = calendar.summaryOverride;
      }
      await db.calendars.put(calendar as Calendar);
    }
  },
  async purgeExcept(seen) {
    const stale = (await db.calendars.toCollection().primaryKeys()).filter(
      (id) => !seen.has(id),
    );
    for (const id of stale) await deleteCalendarLocally(id);
  },
};

async function eventsHandler(calendarId: string): Promise<Handler> {
  const calendar = await db.calendars.get(calendarId);
  if (!calendar) throw new Error(`Unknown calendar ${calendarId}`);

  return {
    request: { calendarId, showDeleted: true, singleEvents: true },
    list: (api, req) => api.events.list(req),
    tables: [db.calendars, db.events, db.updateState, db.calendarStats],
    async apply(items) {
      const puts: CalendarEvent[] = [];
      const tombstones = items.filter(
        (i) => i.status === 'cancelled' && !i.start,
      );
      const existing = await db.events.bulkGet(
        tombstones.map((t) => [t.id, calendarId] as any),
      );
      tombstones.forEach((t, i) => {
        const old = existing[i];
        if (old)
          puts.push({
            ...old,
            status: 'cancelled',
            updated: t.updated ?? old.updated,
          });
      });
      for (const item of items) {
        if (item.status === 'cancelled' && !item.start) continue;
        const local = toLocalEvent(item, calendarId, calendar.timeZone);
        if (local) puts.push(local);
        else debug('Skipping event without a usable start', item.id);
      }
      await db.events.bulkPut(puts);
      await noteDurations(calendarId, puts);
    },
    async purgeExcept(seen) {
      await db.events
        .where('calendarId')
        .equals(calendarId)
        .filter((e) => !seen.has(e.id))
        .delete();
    },
  };
}

const inFlight = new Map<string, Promise<void>>();

/** Sync one resource; concurrent calls for the same key share one run. */
export function syncResource(account: string, resource: string): Promise<void> {
  const key = `${account}\u0000${resource}`;
  const running = inFlight.get(key);
  if (running) return running;
  const run = doSync(account, resource).finally(() => inFlight.delete(key));
  inFlight.set(key, run);
  return run;
}

async function doSync(account: string, resource: string) {
  const calendarId = resource.startsWith('calendar/')
    ? resource.slice('calendar/'.length)
    : undefined;
  const handler =
    resource === CALENDAR_LIST
      ? calendarListHandler
      : calendarId
        ? await eventsHandler(calendarId)
        : undefined;
  if (!handler) throw new Error(`Unknown resource ${resource}`);

  const key: [string, string] = [account, resource];
  const previous = await db.updateState.get(key);
  await db.updateState.put({
    ...(previous ?? { updatedAt: 0 }),
    account,
    resource,
    requestedAt: Date.now(),
    requesting: true,
    error: undefined,
  });

  const api = await apiProvider();
  let syncToken = previous?.nextSyncToken;
  let pageToken: string | undefined;
  let fullSync = !syncToken;
  const seen = new Set<string>();

  try {
    while (true) {
      let result: ListResult;
      try {
        const req = { ...handler.request, syncToken, pageToken };
        result = (await callGoogle(() => handler.list(api, req))).result;
      } catch (e) {
        if (statusOf(e) === 410 && syncToken) {
          debug(`Sync token expired for ${resource}; full sync`);
          syncToken = undefined;
          pageToken = undefined;
          fullSync = true;
          seen.clear();
          continue;
        }
        throw e;
      }

      const items = result.items ?? [];
      items.forEach((i) => seen.add(i.id));
      pageToken = result.nextPageToken;
      const done = !pageToken;

      await db.transaction('rw', handler.tables, async () => {
        await handler.apply(items);
        if (done) {
          if (fullSync) await handler.purgeExcept(seen);
          const state: UpdateState = {
            account,
            resource,
            nextSyncToken: result.nextSyncToken,
            updatedAt: Date.now(),
            requestedAt: previous?.requestedAt,
            requesting: false,
            disabled: previous?.disabled,
          };
          // A deleted calendar removes its own state row; don't recreate it.
          if (!calendarId || (await db.calendars.get(calendarId))) {
            await db.updateState.put(state);
          }
        }
      });
      if (done) return;
    }
  } catch (e) {
    debug(`Sync failed for ${resource}`, e);
    await db.updateState.update(key, {
      requesting: false,
      error: errorMessage(e),
      updatedAt: Date.now(),
    });
    throw e;
  }
}

/** Sync the given calendars' events, reporting (not throwing) per-calendar failures. */
export async function syncCalendars(
  account: string | undefined,
  calendarIds: Iterable<string>,
): Promise<void> {
  if (!account) return;
  const results = await Promise.allSettled(
    [...new Set(calendarIds)].map((id) =>
      syncResource(account, calendarResource(id)),
    ),
  );
  results
    .filter((r) => r.status === 'rejected')
    .forEach((r) =>
      debug('Calendar sync failed', (r as PromiseRejectedResult).reason),
    );
}
