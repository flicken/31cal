/**
 * All writes to Google go through here: sequential calls with retry/backoff,
 * one progress toast per batch, a summary at the end, and per-item results so
 * callers can keep failed rows selected.
 */
import React from 'react';
import { toast } from 'react-toastify/unstyled';
import { DateTime } from 'luxon';

import { db } from '../models/db';
import { Calendar, CalendarEvent } from '../models/types';
import { calendarApi } from './calendarClient';
import { callGoogle, errorMessage, statusOf } from './googleErrors';
import { syncCalendars } from './sync';
import type { EventResource } from './calendarTypes';
import { snapshot, undeletePatches, undoPatches } from './undo';

export type BatchResult<T> = {
  succeeded: T[];
  skipped: T[];
  failed: { item: T; error: string }[];
};

export const SKIPPED = Symbol('skipped');

export async function runBatch<T>(
  label: string,
  items: T[],
  fn: (item: T) => Promise<unknown>,
  describe: (item: T) => string,
  {
    undo,
  }: {
    /** Given what succeeded, an action that reverses it (or undefined). */
    undo?: (succeeded: T[]) => (() => void) | undefined;
  } = {},
): Promise<BatchResult<T>> {
  const result: BatchResult<T> = { succeeded: [], skipped: [], failed: [] };
  if (items.length === 0) return result;

  const toastId = toast.loading(`${label}: 0 of ${items.length}`);
  for (const [i, item] of items.entries()) {
    try {
      const r = await callGoogle(() => fn(item));
      (r === SKIPPED ? result.skipped : result.succeeded).push(item);
    } catch (e) {
      result.failed.push({ item, error: errorMessage(e) });
    }
    toast.update(toastId, { render: `${label}: ${i + 1} of ${items.length}` });
  }

  const parts = [`${result.succeeded.length} done`];
  if (result.skipped.length)
    parts.push(`${result.skipped.length} already done`);
  if (result.failed.length) parts.push(`${result.failed.length} failed`);
  const onUndo = result.succeeded.length ? undo?.(result.succeeded) : undefined;
  toast.update(toastId, {
    render: (
      <div>
        <b>{label}</b>: {parts.join(', ')}
        {onUndo && (
          <>
            {' '}
            <button
              type="button"
              onClick={() => {
                toast.dismiss(toastId);
                onUndo();
              }}
            >
              Undo
            </button>
          </>
        )}
        {result.failed.length > 0 && (
          <ul style={{ margin: 0, paddingLeft: '1.2em' }}>
            {result.failed.slice(0, 10).map(({ item, error }, i) => (
              <li key={i}>
                {describe(item)}: {error}
              </li>
            ))}
            {result.failed.length > 10 && (
              <li>…and {result.failed.length - 10} more</li>
            )}
          </ul>
        )}
      </div>
    ),
    type:
      result.failed.length === 0
        ? 'success'
        : result.succeeded.length
          ? 'warning'
          : 'error',
    isLoading: false,
    // Leave time to press Undo.
    autoClose: result.failed.length ? false : onUndo ? 15000 : 5000,
    closeButton: true,
  });
  return result;
}

export type NewEvent = Partial<CalendarEvent> & { id?: string };

function withDefaultEnd(event: NewEvent, timeZone: string): NewEvent {
  if (event.end || !event.start) return event;
  if ('date' in event.start && event.start.date) {
    const next = DateTime.fromISO(event.start.date)
      .plus({ days: 1 })
      .toISODate()!;
    return { ...event, end: { date: next } };
  }
  const start = event.start as { dateTime: string; timeZone?: string };
  const end = DateTime.fromISO(start.dateTime, {
    zone: start.timeZone || timeZone,
  })
    .plus({ hours: 1 })
    .toISO()!;
  return { ...event, end: { dateTime: end, timeZone: start.timeZone } };
}

/** Strip local-only fields before sending to Google. */
function toGoogle(event: Record<string, unknown>): Record<string, unknown> {
  const { calendarId: _c, _schedules: _s, start, end, ...rest } = event;
  const clean = (v: unknown) => {
    if (!v || typeof v !== 'object') return v;
    const { ms: _ms, ...r } = v as Record<string, unknown>;
    return r;
  };
  return {
    ...rest,
    ...(start !== undefined && { start: clean(start) }),
    ...(end !== undefined && { end: clean(end) }),
  };
}

const describeEvent = (e: { summary?: string; id?: string }) =>
  e.summary || e.id || '(untitled)';

export async function saveEvents(
  calendar: Calendar,
  events: NewEvent[],
  { description, account }: { description?: string; account?: string } = {},
) {
  const api = await calendarApi();
  const result = await runBatch(
    `Saving to ${calendar.summary}`,
    events,
    async (event) => {
      const resource = toGoogle(
        withDefaultEnd(
          description ? { description, ...event } : event,
          calendar.timeZone,
        ),
      );
      try {
        return await api.events.insert({
          calendarId: calendar.id,
          supportsAttachments: true,
          resource: resource as EventResource,
        });
      } catch (e) {
        // Re-importing an event with a deterministic id.
        if (statusOf(e) === 409 && event.id) return SKIPPED;
        throw e;
      }
    },
    describeEvent,
  );
  await syncCalendars(account, [calendar.id]);
  return result;
}

export type EventPatch = {
  eventId: string;
  calendarId: string;
  summary?: string;
  [key: string]: unknown;
};

export async function patchEvents(
  patches: EventPatch[],
  account?: string,
  { label, undoable = true }: { label?: string; undoable?: boolean } = {},
) {
  const api = await calendarApi();
  const before = undoable ? await snapshot(patches) : new Map();
  const result = await runBatch(
    label ?? `Updating ${patches.length} events`,
    patches,
    ({ eventId, calendarId, ...resource }) =>
      api.events.patch({
        calendarId,
        eventId,
        supportsAttachments: true,
        resource: toGoogle(resource),
      }),
    (p) => p.summary ?? p.eventId,
    {
      undo: (succeeded) => {
        const restore = undoPatches(succeeded, before) as EventPatch[];
        if (!undoable || restore.length === 0) return undefined;
        return () =>
          void patchEvents(restore, account, {
            label: `Undoing ${restore.length} changes`,
            undoable: false,
          });
      },
    },
  );
  await syncCalendars(
    account,
    patches.map((p) => p.calendarId),
  );
  return result;
}

export type EventRef = {
  eventId: string;
  calendarId: string;
  summary?: string;
};

export async function deleteEvents(events: EventRef[], account?: string) {
  const api = await calendarApi();
  const result = await runBatch(
    `Deleting ${events.length} events`,
    events,
    async ({ eventId, calendarId }) => {
      try {
        await api.events.delete({ calendarId, eventId });
      } catch (e) {
        if ([404, 410].includes(statusOf(e) ?? 0)) return SKIPPED;
        throw e;
      }
    },
    (e) => e.summary ?? e.eventId,
    {
      undo: (succeeded) => () =>
        void patchEvents(undeletePatches(succeeded) as EventPatch[], account, {
          label: `Restoring ${succeeded.length} events`,
          undoable: false,
        }),
    },
  );
  // Optimistic: hide deleted events until the next sync confirms.
  const done = [...result.succeeded, ...result.skipped];
  await db.events.bulkUpdate(
    done.map((e) => ({
      key: [e.eventId, e.calendarId],
      changes: { status: 'cancelled' },
    })),
  );
  await syncCalendars(
    account,
    events.map((e) => e.calendarId),
  );
  return result;
}
