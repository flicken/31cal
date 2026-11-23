/**
 * Turn the runnable changes of a plan into writes.tsx calls, and map the
 * results back to source-event keys so failed rows can stay selected.
 */
import { Calendar } from '../models/types';
import {
  EventPatch,
  EventRef,
  NewEvent,
  deleteEvents,
  patchEvents,
  saveEvents,
} from '../google/writes';
import { COPIED_FROM_CALENDAR, COPIED_FROM_ID, sourceKey } from '../lib/copies';
import type { Change } from './actions';

export type Grouped = {
  patches: EventPatch[];
  deletes: EventRef[];
  inserts: Map<string, NewEvent[]>;
};

export function groupChanges(changes: Change[]): Grouped {
  const g: Grouped = { patches: [], deletes: [], inserts: new Map() };
  for (const c of changes) {
    if (c.kind === 'patch' && c.patch) {
      g.patches.push({
        ...c.patch,
        summary: c.patch.summary ?? c.event.summary,
      });
    } else if (c.kind === 'delete') {
      g.deletes.push({
        eventId: c.event.id,
        calendarId: c.event.calendarId,
        summary: c.event.summary,
      });
    } else if (c.kind === 'insert' && c.insert) {
      const list = g.inserts.get(c.insert.calendarId) ?? [];
      list.push(c.insert.event);
      g.inserts.set(c.insert.calendarId, list);
    }
  }
  return g;
}

/** Source keys of inserts that failed (copies carry their source in private properties). */
export function insertSourceKey(e: NewEvent): string | undefined {
  const p = e.extendedProperties?.private;
  return p?.[COPIED_FROM_ID] && p[COPIED_FROM_CALENDAR]
    ? sourceKey(p[COPIED_FROM_CALENDAR], p[COPIED_FROM_ID])
    : undefined;
}

/** Run the writes; resolves to the source keys that failed. */
export async function runChanges(
  changes: Change[],
  calendars: Map<string, Calendar>,
  { account, label }: { account?: string; label: string },
): Promise<string[]> {
  const g = groupChanges(changes);
  const failed: string[] = [];
  if (g.patches.length) {
    const r = await patchEvents(g.patches, account, {
      label: `${label} ${g.patches.length} events`,
    });
    r.failed.forEach(({ item }) =>
      failed.push(`${item.calendarId}/${item.eventId}`),
    );
  }
  if (g.deletes.length) {
    const r = await deleteEvents(g.deletes, account);
    r.failed.forEach(({ item }) =>
      failed.push(`${item.calendarId}/${item.eventId}`),
    );
  }
  for (const [calendarId, events] of g.inserts) {
    const calendar = calendars.get(calendarId);
    if (!calendar) continue;
    const r = await saveEvents(calendar, events, { account });
    r.failed.forEach(({ item }) => {
      const k = insertSourceKey(item);
      if (k) failed.push(k);
    });
  }
  return failed;
}
