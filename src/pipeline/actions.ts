/**
 * Pipeline actions. Each action turns the selected events plus its form's
 * parameters into a Plan: one Change per event, with before/after values for
 * the preview and warnings. Planning is pure; nothing is written until Run.
 */
import { Calendar, CalendarEvent } from '../models/types';
import type { EventPatch, NewEvent } from '../google/writes';
import { keyFor, isRecurring } from '../lib/events';
import { COPIED_FROM_CALENDAR, COPIED_FROM_ID, sourceKey } from '../lib/copies';
import { pick } from '../lib/utils';
import { Condition, hasGuests, textPattern } from './filters';

export type PlanContext = {
  calendars: Map<string, Calendar>;
  userEmail?: string;
  /** Sources already copied into a calendar (calendar/id keys). */
  copiedInto?: (calendarId: string) => ReadonlySet<string>;
  /** The current filter, for defaults such as Rename's search text. */
  conditions?: Condition[];
};

export type Change = {
  /** Key of the source event (calendar/id). */
  key: string;
  kind: 'patch' | 'delete' | 'insert';
  event: CalendarEvent;
  /** Field values shown in the preview. */
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  patch?: EventPatch;
  insert?: { calendarId: string; event: NewEvent };
  warnings: string[];
  /** Why this change can't run; such rows start skipped. */
  blocked?: string;
};

export type Plan = {
  changes: Change[];
  /** Selected events the action would leave as they are. */
  unchanged: number;
  /** The parameters can't produce a plan (e.g. invalid JSON). */
  error?: string;
};

export type ActionId = 'rename' | 'delete' | 'copy' | 'json';

export type Action<P> = {
  id: ActionId;
  label: string;
  /** Run-button text, e.g. "Rename 12". */
  verb: string;
  defaultParams: (ctx: PlanContext, events: CalendarEvent[]) => P;
  plan: (events: CalendarEvent[], params: P, ctx: PlanContext) => Plan;
};

/** Fields that identify or are derived for an event and must not be bulk-applied. */
export const READ_ONLY_FIELDS = [
  'id',
  'calendarId',
  'eventId',
  'iCalUID',
  'recurringEventId',
  'originalStartTime',
  'sequence',
  'created',
  'updated',
  '_schedules',
  'eventType',
  'etag',
  'kind',
  'htmlLink',
  'creator',
  'organizer',
];

const WRITABLE = new Set(['owner', 'writer']);

function canWrite(ctx: PlanContext, calendarId: string): boolean {
  const role = ctx.calendars.get(calendarId)?.accessRole;
  return role === undefined || WRITABLE.has(role);
}

/** Warnings shared by actions that change an existing event. */
function editWarnings(e: CalendarEvent): string[] {
  const w: string[] = [];
  if (isRecurring(e)) {
    w.push('Repeating event: only this occurrence changes, not the series.');
  }
  if (hasGuests(e)) {
    const n = (e.attendees ?? []).length;
    w.push(`Has ${n} guest${n === 1 ? '' : 's'}; they won't be notified.`);
  }
  return w;
}

function editBlocked(e: CalendarEvent, ctx: PlanContext): string | undefined {
  if (!canWrite(ctx, e.calendarId)) return "You can't edit this calendar.";
  return undefined;
}

const stripMs = (v: unknown) => {
  if (v && typeof v === 'object' && 'ms' in v) {
    const { ms: _ms, ...rest } = v as Record<string, unknown>;
    return rest;
  }
  return v;
};

// ---- Rename ---------------------------------------------------------------

export type RenameParams = {
  /** Text or /regex/ to replace; empty means no replacement. */
  find: string;
  replace: string;
  prefix: string;
  suffix: string;
};

export function newSummary(summary: string, p: RenameParams): string {
  let s = summary;
  if (p.find) {
    const { regex } = textPattern(p.find);
    s = s.replace(new RegExp(regex.source, 'gi'), p.replace);
  }
  return `${p.prefix}${s}${p.suffix}`;
}

export const rename: Action<RenameParams> = {
  id: 'rename',
  label: 'Rename',
  verb: 'Rename',
  defaultParams: (ctx) => {
    const text = ctx.conditions?.find(
      (c) => c.type === 'text' && (c.field === 'summary' || c.field === 'any'),
    );
    return {
      find: text && text.type === 'text' ? text.value : '',
      replace: '',
      prefix: '',
      suffix: '',
    };
  },
  plan(events, params, ctx) {
    const changes: Change[] = [];
    let unchanged = 0;
    for (const e of events) {
      const before = e.summary ?? '';
      const after = newSummary(before, params);
      if (after === before) {
        unchanged++;
        continue;
      }
      changes.push({
        key: keyFor(e),
        kind: 'patch',
        event: e,
        before: { summary: before },
        after: { summary: after },
        patch: { eventId: e.id, calendarId: e.calendarId, summary: after },
        warnings: editWarnings(e),
        blocked: editBlocked(e, ctx),
      });
    }
    return { changes, unchanged };
  },
};

// ---- Delete ---------------------------------------------------------------

export const remove: Action<Record<string, never>> = {
  id: 'delete',
  label: 'Delete',
  verb: 'Delete',
  defaultParams: () => ({}),
  plan(events, _params, ctx) {
    const changes: Change[] = [];
    let unchanged = 0;
    for (const e of events) {
      if (e.status === 'cancelled') {
        unchanged++;
        continue;
      }
      changes.push({
        key: keyFor(e),
        kind: 'delete',
        event: e,
        before: { summary: e.summary ?? '' },
        after: {},
        warnings: editWarnings(e),
        blocked: editBlocked(e, ctx),
      });
    }
    return { changes, unchanged };
  },
};

// ---- Copy to calendar -----------------------------------------------------

export type CopyParams = { calendarId: string; prefix: string };

export const copy: Action<CopyParams> = {
  id: 'copy',
  label: 'Copy to calendar',
  verb: 'Copy',
  defaultParams: (ctx) => {
    const writable = [...ctx.calendars.values()].find(
      (c) => !c.accessRole || WRITABLE.has(c.accessRole),
    );
    return { calendarId: writable?.id ?? '', prefix: '' };
  },
  plan(events, params, ctx) {
    const target = ctx.calendars.get(params.calendarId);
    if (!target) {
      return {
        changes: [],
        unchanged: 0,
        error: 'Choose a calendar to copy to.',
      };
    }
    const already = ctx.copiedInto?.(target.id) ?? new Set<string>();
    const targetWritable = canWrite(ctx, target.id);
    const changes = events.map((e): Change => {
      const summary = `${params.prefix}${e.summary ?? ''}`;
      const event: NewEvent = {
        ...pick(e, 'attachments', 'description', 'location', 'transparency'),
        start: stripMs(e.start) as NewEvent['start'],
        end: stripMs(e.end) as NewEvent['end'],
        summary,
        extendedProperties: {
          private: {
            [COPIED_FROM_ID]: e.id,
            [COPIED_FROM_CALENDAR]: e.calendarId,
          },
        },
      };
      const warnings: string[] = [];
      if (isRecurring(e)) {
        warnings.push('Repeating event: copied as a single event.');
      }
      if (e.calendarId === target.id)
        warnings.push('Copying into the same calendar.');
      return {
        key: keyFor(e),
        kind: 'insert',
        event: e,
        before: {},
        after: { calendar: target.summary, summary },
        insert: { calendarId: target.id, event },
        warnings,
        blocked: !targetWritable
          ? `You can't add events to ${target.summary}.`
          : already.has(sourceKey(e.calendarId, e.id))
            ? `Already copied to ${target.summary}.`
            : undefined,
      };
    });
    return { changes, unchanged: 0 };
  },
};

// ---- Edit JSON ------------------------------------------------------------

export type JsonParams = { json: string };

/** The editable fields of an event as pretty JSON (a starting point). */
export function editableJson(event: CalendarEvent | undefined): string {
  if (!event) return '{}';
  const fields: Record<string, unknown> = { ...event };
  READ_ONLY_FIELDS.forEach((f) => delete fields[f]);
  for (const k of ['start', 'end'])
    if (fields[k]) fields[k] = stripMs(fields[k]);
  delete fields.status;
  return JSON.stringify(fields, null, 2);
}

export function parseJsonFields(json: string): {
  fields?: Record<string, unknown>;
  error?: string;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    return { error: `The JSON is not valid: ${(e as Error).message}` };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { error: 'The JSON must be an object of fields to set.' };
  }
  const fields = { ...(parsed as Record<string, unknown>) };
  READ_ONLY_FIELDS.forEach((f) => delete fields[f]);
  return { fields };
}

const same = (a: unknown, b: unknown) =>
  JSON.stringify(stripMs(a)) === JSON.stringify(stripMs(b));

export const json: Action<JsonParams> = {
  id: 'json',
  label: 'Edit JSON',
  verb: 'Apply to',
  defaultParams: (_ctx, events) => ({ json: editableJson(events[0]) }),
  plan(events, params, ctx) {
    const { fields, error } = parseJsonFields(params.json);
    if (!fields) return { changes: [], unchanged: 0, error };
    const changes: Change[] = [];
    let unchanged = 0;
    const setsTime = 'start' in fields || 'end' in fields;
    for (const e of events) {
      const record = e as unknown as Record<string, unknown>;
      const changed = Object.keys(fields).filter(
        (k) => !same(record[k], fields[k]),
      );
      if (changed.length === 0) {
        unchanged++;
        continue;
      }
      const warnings = editWarnings(e);
      if (setsTime && events.length > 1) {
        warnings.push('Sets the same start and end on every selected event.');
      }
      changes.push({
        key: keyFor(e),
        kind: 'patch',
        event: e,
        before: Object.fromEntries(changed.map((k) => [k, stripMs(record[k])])),
        after: Object.fromEntries(changed.map((k) => [k, fields[k]])),
        patch: {
          eventId: e.id,
          calendarId: e.calendarId,
          ...Object.fromEntries(changed.map((k) => [k, fields[k]])),
        },
        warnings,
        blocked: editBlocked(e, ctx),
      });
    }
    return { changes, unchanged };
  },
};

export const ACTIONS = { rename, delete: remove, copy, json } as const;
export const ACTION_LIST: Action<any>[] = [rename, remove, copy, json];
