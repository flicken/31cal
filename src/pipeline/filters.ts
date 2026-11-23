/**
 * Pipeline filter conditions: a list of conditions that must all match
 * (AND). Conditions round-trip through URL search params so a filter can be
 * bookmarked or handed to /pipeline from another view.
 */
import { DateTime } from 'luxon';
import { CalendarEvent } from '../models/types';
import { safeRegExp } from '../lib/regex';
import { parseSearchText } from '../lib/searchTextParser';
import { isRecurring } from '../lib/events';
import { COPIED_FROM_CALENDAR, COPIED_FROM_ID } from '../lib/copies';

export const TEXT_FIELDS = [
  'any',
  'summary',
  'description',
  'location',
  'guests',
] as const;
export type TextField = (typeof TEXT_FIELDS)[number];

export type Condition =
  /** Date range as typed ("next month", "start:2026-01-01 end-of:2026-03"). */
  | { type: 'dates'; text: string }
  | { type: 'calendars'; ids: string[] }
  /** Text match; `/.../` values are regular expressions (case-insensitive). */
  | { type: 'text'; field: TextField; value: string }
  | { type: 'recurring'; value: boolean }
  | { type: 'allDay'; value: boolean }
  | { type: 'hasGuests'; value: boolean }
  | { type: 'iOrganize'; value: boolean }
  /** Cancelled events are excluded unless this says otherwise. */
  | { type: 'cancelled'; value: 'include' | 'only' }
  | { type: 'schedule'; name: string }
  | { type: 'updatedSince'; text: string }
  | { type: 'copied'; value: boolean };

export type ConditionType = Condition['type'];

/** Conditions that may appear at most once. */
export const SINGLETONS: ConditionType[] = [
  'dates',
  'calendars',
  'recurring',
  'allDay',
  'hasGuests',
  'iOrganize',
  'cancelled',
  'updatedSince',
  'copied',
];

export type MatchContext = {
  userEmail?: string;
};

/** The date range a filter selects, or undefined for all time. */
export function dateRangeOf(
  conditions: Condition[],
): { start: DateTime; end: DateTime } | undefined {
  const c = conditions.find((x) => x.type === 'dates');
  if (!c || c.type !== 'dates' || !c.text.trim()) return undefined;
  const { start, end } = parseSearchText(c.text);
  return start && end ? { start, end } : undefined;
}

export function updatedSinceOf(conditions: Condition[]): DateTime | undefined {
  const c = conditions.find((x) => x.type === 'updatedSince');
  if (!c || c.type !== 'updatedSince' || !c.text.trim()) return undefined;
  // The range parser reads bare dates forward ("march 5" = next March 5);
  // "updated since …" reads them backward, as this needs.
  return parseSearchText(`updated since ${c.text}`).updatedSince;
}

/** Calendar ids the filter names, or undefined to mean "the selected ones". */
export function calendarIdsOf(conditions: Condition[]): string[] | undefined {
  const c = conditions.find((x) => x.type === 'calendars');
  return c && c.type === 'calendars' && c.ids.length ? c.ids : undefined;
}

export function textPattern(value: string): { regex: RegExp; error?: string } {
  const m = value.match(/^\/(.*)\/$/s);
  if (m) return safeRegExp(m[1], 'i');
  return safeRegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

function fieldText(e: CalendarEvent, field: TextField): string[] {
  const guests = () =>
    (e.attendees ?? []).flatMap((a) => [a.displayName ?? '', a.email ?? '']);
  switch (field) {
    case 'summary':
      return [e.summary ?? ''];
    case 'description':
      return [e.description ?? ''];
    case 'location':
      return [e.location ?? ''];
    case 'guests':
      return guests();
    case 'any':
      return [
        e.summary ?? '',
        e.description ?? '',
        e.location ?? '',
        ...guests(),
      ];
  }
}

const isAllDay = (e: CalendarEvent) => 'date' in e.start && !!e.start.date;
const guestCount = (e: CalendarEvent) =>
  (e.attendees ?? []).filter((a) => !a.email || a.email !== e.organizer?.email)
    .length;
export const hasGuests = (e: CalendarEvent) => guestCount(e) > 0;
export const isCopy = (e: CalendarEvent) =>
  !!e.extendedProperties?.private?.[COPIED_FROM_ID] &&
  !!e.extendedProperties?.private?.[COPIED_FROM_CALENDAR];

export function iOrganize(e: CalendarEvent, userEmail?: string): boolean {
  if (e.organizer?.self) return true;
  return !!userEmail && e.organizer?.email === userEmail;
}

/**
 * Compile conditions into a predicate. Date and calendar conditions are
 * applied here too, so the predicate is complete on its own; the data hook
 * also uses them to narrow the IndexedDB query.
 */
export function compile(
  conditions: Condition[],
  ctx: MatchContext = {},
): (e: CalendarEvent) => boolean {
  const range = dateRangeOf(conditions);
  const startMs = range?.start.toMillis();
  const endMs = range?.end.toMillis();
  const since = updatedSinceOf(conditions)?.toUTC().toISO();
  const calendarIds = calendarIdsOf(conditions);
  const calendarSet = calendarIds && new Set(calendarIds);
  const cancelled = conditions.find((c) => c.type === 'cancelled') as
    Extract<Condition, { type: 'cancelled' }> | undefined;

  const tests: ((e: CalendarEvent) => boolean)[] = [];
  if (!cancelled) tests.push((e) => e.status !== 'cancelled');
  else if (cancelled.value === 'only')
    tests.push((e) => e.status === 'cancelled');
  if (range) {
    tests.push(
      (e) =>
        (e.end?.ms === undefined || e.end.ms > startMs!) &&
        (e.start?.ms === undefined || e.start.ms <= endMs!),
    );
  }
  if (calendarSet) tests.push((e) => calendarSet.has(e.calendarId));
  if (since) tests.push((e) => !!e.updated && e.updated > since);

  for (const c of conditions) {
    switch (c.type) {
      case 'text': {
        if (!c.value) break;
        const { regex } = textPattern(c.value);
        tests.push((e) => fieldText(e, c.field).some((t) => regex.test(t)));
        break;
      }
      case 'recurring':
        tests.push((e) => isRecurring(e) === c.value);
        break;
      case 'allDay':
        tests.push((e) => isAllDay(e) === c.value);
        break;
      case 'hasGuests':
        tests.push((e) => hasGuests(e) === c.value);
        break;
      case 'iOrganize':
        tests.push((e) => iOrganize(e, ctx.userEmail) === c.value);
        break;
      case 'schedule':
        if (c.name) tests.push((e) => !!e._schedules?.includes(c.name));
        break;
      case 'copied':
        tests.push((e) => isCopy(e) === c.value);
        break;
      default:
        break;
    }
  }
  return (e) => tests.every((t) => t(e));
}

export function matches(
  event: CalendarEvent,
  conditions: Condition[],
  ctx: MatchContext = {},
): boolean {
  return compile(conditions, ctx)(event);
}

// ---- URL round-trip ------------------------------------------------------

const yesNo = (v: boolean) => (v ? 'yes' : 'no');
const parseYesNo = (v: string): boolean | undefined =>
  v === 'yes' ? true : v === 'no' ? false : undefined;

/** Conditions → URL params, in order. */
export function toSearchParams(conditions: Condition[]): URLSearchParams {
  const p = new URLSearchParams();
  for (const c of conditions) {
    switch (c.type) {
      case 'dates':
        p.append('dates', c.text);
        break;
      case 'calendars':
        p.append('cal', c.ids.join(','));
        break;
      case 'text':
        p.append(c.field, c.value);
        break;
      case 'recurring':
        p.append('recurring', yesNo(c.value));
        break;
      case 'allDay':
        p.append('allday', yesNo(c.value));
        break;
      case 'hasGuests':
        p.append('hasguests', yesNo(c.value));
        break;
      case 'iOrganize':
        p.append('mine', yesNo(c.value));
        break;
      case 'cancelled':
        p.append('cancelled', c.value);
        break;
      case 'schedule':
        p.append('schedule', c.name);
        break;
      case 'updatedSince':
        p.append('updated', c.text);
        break;
      case 'copied':
        p.append('copied', yesNo(c.value));
        break;
    }
  }
  return p;
}

/** URL params → conditions; unknown or malformed params are ignored. */
export function fromSearchParams(p: URLSearchParams): Condition[] {
  const out: Condition[] = [];
  const once = new Set<ConditionType>();
  const add = (c: Condition) => {
    if (SINGLETONS.includes(c.type)) {
      if (once.has(c.type)) return;
      once.add(c.type);
    }
    out.push(c);
  };
  for (const [key, value] of p) {
    const yn = parseYesNo(value);
    switch (key) {
      case 'dates':
        add({ type: 'dates', text: value });
        break;
      case 'cal':
        add({ type: 'calendars', ids: value.split(',').filter(Boolean) });
        break;
      case 'recurring':
        if (yn !== undefined) add({ type: 'recurring', value: yn });
        break;
      case 'allday':
        if (yn !== undefined) add({ type: 'allDay', value: yn });
        break;
      case 'hasguests':
        if (yn !== undefined) add({ type: 'hasGuests', value: yn });
        break;
      case 'mine':
        if (yn !== undefined) add({ type: 'iOrganize', value: yn });
        break;
      case 'cancelled':
        if (value === 'include' || value === 'only')
          add({ type: 'cancelled', value });
        break;
      case 'schedule':
        add({ type: 'schedule', name: value });
        break;
      case 'updated':
        add({ type: 'updatedSince', text: value });
        break;
      case 'copied':
        if (yn !== undefined) add({ type: 'copied', value: yn });
        break;
      default:
        if ((TEXT_FIELDS as readonly string[]).includes(key)) {
          add({ type: 'text', field: key as TextField, value });
        }
    }
  }
  return out;
}

/** Short human description of a condition, for chips and screen readers. */
export function describe(
  c: Condition,
  calendarName: (id: string) => string = (id) => id,
): string {
  switch (c.type) {
    case 'dates':
      return c.text || 'Any date';
    case 'calendars':
      return c.ids.length
        ? c.ids.map(calendarName).join(', ')
        : 'Selected calendars';
    case 'text': {
      const where = c.field === 'any' ? '' : `${c.field} `;
      return `${where}contains “${c.value}”`;
    }
    case 'recurring':
      return c.value ? 'Repeating' : 'Not repeating';
    case 'allDay':
      return c.value ? 'All-day' : 'Timed';
    case 'hasGuests':
      return c.value ? 'Has guests' : 'No guests';
    case 'iOrganize':
      return c.value ? 'I organize' : 'Someone else organizes';
    case 'cancelled':
      return c.value === 'only' ? 'Only deleted' : 'Including deleted';
    case 'schedule':
      return `Schedule: ${c.name}`;
    case 'updatedSince':
      return `Updated since ${c.text}`;
    case 'copied':
      return c.value ? 'Copied by 31cal' : 'Not copied by 31cal';
  }
}
