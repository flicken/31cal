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
import type { Table } from 'dexie';
import { db } from '../models/db';
import { Calendar, CalendarEvent, UpdateState } from '../models/types';
import { eventSchedules } from '../lib/useScheduleList';
import { debug } from '../lib/log';
import { noteDurations } from '../lib/eventQueries';
import { calendarApi } from './calendarClient';
import { callGoogle, errorMessage, statusOf } from './googleErrors';
import type {
  CalendarApi,
  GoogleCalendarListEntry,
  GoogleEvent,
  ListParams,
  ListResponse,
} from './calendarTypes';

export type { CalendarApi } from './calendarTypes';

export const CALENDAR_LIST = 'calendarList';

/** The window fetched first on a full sync; the rest is backfilled after. */
const RECENT_PAST = { months: 1 };
const RECENT_FUTURE = { months: 6 };
export const calendarResource = (calendarId: string) =>
  `calendar/${calendarId}`;

export { setCalendarApiProvider } from './calendarClient';

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
  event: GoogleEvent,
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
    updated: event.updated ?? '',
    start: { ...event.start, ms: startMs } as CalendarEvent['start'],
    end: { ...(event.end ?? event.start), ms: endMs } as CalendarEvent['end'],
    _schedules: schedules,
  };
}

type Handler<T extends { id: string }> = {
  request: ListParams;
  /**
   * Extra parameters for a quick first pass over recent events before a full
   * sync, so views fill in while the rest of history backfills.
   */
  recentWindow?: () => ListParams;
  list: (
    api: CalendarApi,
    req: ListParams,
  ) => Promise<{ result: ListResponse<T> }>;
  tables: Table[];
  apply: (items: T[]) => Promise<void>;
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

const calendarListHandler: Handler<GoogleCalendarListEntry> = {
  request: {},
  list: (api, req) => api.calendarList.list(req),
  tables: [db.calendars, db.events, db.updateState, db.calendarStats],
  async apply(items) {
    for (const calendar of items) {
      if (calendar.deleted) {
        await deleteCalendarLocally(calendar.id);
        continue;
      }
      const local: Calendar = {
        ...calendar,
        summary: calendar.summaryOverride ?? calendar.summary ?? calendar.id,
        originalSummary: calendar.summaryOverride
          ? calendar.summary
          : undefined,
        selected: !!calendar.selected,
        timeZone: calendar.timeZone ?? 'UTC',
        foregroundColor: calendar.foregroundColor ?? '#000000',
        backgroundColor: calendar.backgroundColor ?? '#ffffff',
      };
      await db.calendars.put(local);
    }
  },
  async purgeExcept(seen) {
    const stale = (await db.calendars.toCollection().primaryKeys()).filter(
      (id) => !seen.has(id),
    );
    for (const id of stale) await deleteCalendarLocally(id);
  },
};

async function eventsHandler(
  calendarId: string,
): Promise<Handler<GoogleEvent>> {
  const calendar = await db.calendars.get(calendarId);
  if (!calendar) throw new Error(`Unknown calendar ${calendarId}`);

  return {
    request: { showDeleted: true, singleEvents: true },
    recentWindow: () => {
      const now = DateTime.now();
      return {
        timeMin: now.minus(RECENT_PAST).toISO(),
        timeMax: now.plus(RECENT_FUTURE).toISO(),
      };
    },
    list: (api, req) => api.events.list({ ...req, calendarId }),
    tables: [db.calendars, db.events, db.updateState, db.calendarStats],
    async apply(items) {
      const puts: CalendarEvent[] = [];
      const tombstones = items.filter(
        (i) => i.status === 'cancelled' && !i.start,
      );
      const existing = await db.events.bulkGet(
        tombstones.map((t): [string, string] => [t.id, calendarId]),
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
  if (resource === CALENDAR_LIST) {
    return runSync(account, resource, undefined, calendarListHandler);
  }
  if (calendarId) {
    let handler;
    try {
      handler = await eventsHandler(calendarId);
    } catch (e) {
      // Record failures that happen before the sync itself starts, too.
      await recordSyncError(account, resource, e);
      throw e;
    }
    return runSync(account, resource, calendarId, handler);
  }
  throw new Error(`Unknown resource ${resource}`);
}

async function runSync<T extends { id: string }>(
  account: string,
  resource: string,
  calendarId: string | undefined,
  handler: Handler<T>,
) {
  const key: [string, string] = [account, resource];
  const previous = await db.updateState.get(key);
  await db.updateState.put({
    ...(previous ?? { updatedAt: 0 }),
    account,
    resource,
    requestedAt: Date.now(),
    requesting: true,
    // Keep the last error visible while retrying; success clears it.
  });

  const api = await calendarApi();
  let syncToken = previous?.nextSyncToken;
  let pageToken: string | undefined;
  let fullSync = !syncToken;
  const seen = new Set<string>();

  /**
   * Fetch the recent window (all pages) and store it. Its rows don't count
   * as "seen" for purging: only the full pass decides what was deleted.
   */
  const recentPass = async () => {
    if (!handler.recentWindow) return;
    const window = handler.recentWindow();
    let page: string | undefined;
    do {
      const req = { ...handler.request, ...window, pageToken: page };
      const result = (await callGoogle(() => handler.list(api, req))).result;
      await db.transaction('rw', handler.tables, () =>
        handler.apply(result.items ?? []),
      );
      page = result.nextPageToken;
    } while (page);
    await db.updateState.update(key, { backfilling: true });
  };

  try {
    if (fullSync) await recentPass();
    while (true) {
      let result: ListResponse<T>;
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
          await recentPass();
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
            backfilling: false,
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
    await recordSyncError(account, resource, e, { backfilling: false });
    throw e;
  }
}

/** HTTP status for a failure; -1 for network errors (fetch TypeError). */
export function failureStatus(e: unknown): number | undefined {
  const status = statusOf(e);
  if (status !== undefined) return status;
  if (e instanceof TypeError) return -1;
  return undefined;
}

async function recordSyncError(
  account: string,
  resource: string,
  e: unknown,
  extra: Partial<UpdateState> = {},
) {
  const key: [string, string] = [account, resource];
  const now = Date.now();
  const changes = {
    requesting: false,
    error: errorMessage(e),
    errorStatus: failureStatus(e),
    errorAt: now,
    ...extra,
  };
  if (!(await db.updateState.update(key, changes))) {
    await db.updateState.put({ account, resource, updatedAt: 0, ...changes });
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
