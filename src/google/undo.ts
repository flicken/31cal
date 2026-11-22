/**
 * Undo payloads for bulk writes, computed from the cached copy of each event
 * taken just before the write.
 */
import { db } from '../models/db';
import { CalendarEvent } from '../models/types';

export type PatchLike = { eventId: string; calendarId: string } & Record<
  string,
  unknown
>;
export type Ref = { eventId: string; calendarId: string; summary?: string };

/** Cached copies of the events about to change, keyed by calendar/id. */
export async function snapshot(
  refs: Ref[],
): Promise<Map<string, CalendarEvent>> {
  const rows = await db.events.bulkGet(
    refs.map((r) => [r.eventId, r.calendarId]),
  );
  const map = new Map<string, CalendarEvent>();
  rows.forEach((row, i) => {
    if (row) map.set(`${refs[i].calendarId}/${refs[i].eventId}`, row);
  });
  return map;
}

function withoutLocalFields(value: unknown) {
  if (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'ms' in value
  ) {
    const { ms: _ms, ...rest } = value as Record<string, unknown>;
    return rest;
  }
  return value;
}

/**
 * Patches that put back the previous value of every field a patch changed.
 * A field that didn't exist before is cleared with null (Google's patch
 * semantics). Events missing from the snapshot can't be undone and are left
 * out.
 */
export function undoPatches<P extends PatchLike>(
  applied: P[],
  previous: Map<string, CalendarEvent>,
): PatchLike[] {
  return applied.flatMap((patch) => {
    const before = previous.get(`${patch.calendarId}/${patch.eventId}`) as
      Record<string, unknown> | undefined;
    if (!before) return [];
    const restore: PatchLike = {
      eventId: patch.eventId,
      calendarId: patch.calendarId,
    };
    for (const field of Object.keys(patch)) {
      if (field === 'eventId' || field === 'calendarId') continue;
      restore[field] =
        field in before ? withoutLocalFields(before[field]) : null;
    }
    return [restore];
  });
}

/**
 * Google keeps deleted events as status "cancelled"; patching the status
 * back to "confirmed" restores them (while Google still has them, roughly
 * 30 days, and only for events you can edit).
 */
export function undeletePatches(deleted: Ref[]): PatchLike[] {
  return deleted.map(({ eventId, calendarId, summary }) => ({
    eventId,
    calendarId,
    summary,
    status: 'confirmed',
  }));
}
