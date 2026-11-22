import PapaParse from 'papaparse';
import { parse } from 'chrono-node';
import { DateTime } from 'luxon';
import type { NewEvent } from '../google/writes';

export type ImportRow = {
  line: number;
  event?: NewEvent;
  errors: string[];
};

const parserOptions = {
  header: true,
  skipEmptyLines: true,
  transformHeader: (header: string) => header.toLowerCase().replace(/\W/g, ''),
};

type DateParts = { year: number; month: number; day: number };
type TimeParts = { hour: number; minute: number; second: number };

export function parseDate(text?: unknown): DateParts | undefined {
  if (text === undefined || text === null || `${text}`.trim() === '') return;
  const s = `${text}`.trim();
  const iso = DateTime.fromISO(s);
  if (iso.isValid && /^\d{4}-\d{2}-\d{2}/.test(s)) {
    return { year: iso.year, month: iso.month, day: iso.day };
  }
  const c: any = parse(s, new Date(), { forwardDate: true })[0]?.start;
  if (!c) return;
  const p = { ...c.impliedValues, ...c.knownValues };
  return { year: p.year, month: p.month, day: p.day };
}

export function parseTime(text?: unknown): TimeParts | undefined {
  if (text === undefined || text === null || `${text}`.trim() === '') return;
  let s = `${text}`.trim();
  if (/^\d{1,2}$/.test(s)) s = `${s}:00`;
  else if (/^\d{3}$/.test(s)) s = `${s.slice(0, 1)}:${s.slice(1)}`;
  else if (/^\d{4}$/.test(s)) s = `${s.slice(0, 2)}:${s.slice(2)}`;
  const c: any = parse(s, new Date(), { forwardDate: true })[0]?.start;
  if (!c) return;
  const p = { ...c.impliedValues, ...c.knownValues };
  return { hour: p.hour, minute: p.minute ?? 0, second: p.second ?? 0 };
}

const toIsoDate = (d: DateParts) => DateTime.fromObject(d).toISODate()!;

/** Convert one CSV row (Google Calendar / Outlook export headers) to an event. */
export function rowToEvent(row: Record<string, unknown>): {
  event?: NewEvent;
  errors: string[];
} {
  const errors: string[] = [];
  const str = (k: string) => {
    const v = row[k];
    return v === undefined || v === null || `${v}`.trim() === ''
      ? undefined
      : `${v}`;
  };

  const startDate = parseDate(row['startdate']);
  if (!startDate) {
    errors.push(
      row['startdate']
        ? `Can't read start date "${row['startdate']}"`
        : 'Missing start date',
    );
    return { errors };
  }
  const endDate = parseDate(row['enddate']) ?? startDate;
  const startTime = parseTime(row['starttime']);
  const endTime = parseTime(row['endtime']);
  if (row['starttime'] && !startTime)
    errors.push(`Can't read start time "${row['starttime']}"`);
  if (row['endtime'] && !endTime)
    errors.push(`Can't read end time "${row['endtime']}"`);
  if (errors.length) return { errors };

  const allDay =
    !startTime || `${str('alldayevent') ?? ''}`.toLowerCase() === 'true';

  let start: NewEvent['start'];
  let end: NewEvent['end'];
  if (allDay) {
    start = { date: toIsoDate(startDate) };
    // CSV end dates are inclusive; Google's all-day end is exclusive.
    let endDt = DateTime.fromObject(endDate).plus({ days: 1 });
    if (endDt <= DateTime.fromObject(startDate))
      endDt = DateTime.fromObject(startDate).plus({ days: 1 });
    end = { date: endDt.toISODate()! };
  } else {
    const s = DateTime.fromObject({ ...startDate, ...startTime });
    let e = endTime
      ? DateTime.fromObject({ ...endDate, ...endTime })
      : s.plus({ hours: 1 });
    if (e <= s) e = e.plus({ days: 1 });
    start = { dateTime: s.toISO()! };
    end = { dateTime: e.toISO()! };
  }

  return {
    event: {
      summary: str('subject') ?? str('summary') ?? '(no title)',
      description: str('description'),
      location: str('location'),
      start,
      end,
    },
    errors,
  };
}

/**
 * Stable Google event id (base32hex: hex is a subset) so importing the same
 * row into the same calendar twice is detected as a duplicate (409).
 */
export async function eventIdFor(calendarId: string, event: NewEvent) {
  const data = new TextEncoder().encode(
    JSON.stringify([
      calendarId,
      event.summary,
      event.start,
      event.end,
      event.description,
      event.location,
    ]),
  );
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash), (b) =>
    b.toString(16).padStart(2, '0'),
  )
    .join('')
    .slice(0, 40);
}

export function parseCsv(text: string): ImportRow[] {
  const parsed = PapaParse.parse<Record<string, unknown>>(text, parserOptions);
  return parsed.data.map((row, i) => ({ line: i + 2, ...rowToEvent(row) }));
}
