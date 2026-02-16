import { DateTime, DateTimeUnit } from 'luxon';
import { parse, ParsedComponents } from 'chrono-node';
import { pick, isEmpty } from './utils';

export type ParsedSearch = {
  start?: DateTime;
  end?: DateTime;
  updatedSince?: DateTime;
};

const dateTimeFromAll = (components: any) => {
  if (!components) return undefined;
  const fields = pick(
    { ...components.knownValues, ...components.impliedValues },
    [
      'year',
      'month',
      'day',
      'ordinal',
      'weekYear',
      'weekNumber',
      'weekday',
      'hour',
      'minute',
      'second',
      'millisecond',
    ],
  );
  const date = DateTime.fromObject(fields);
  if (!components.isCertain('year') && date.diffNow().as('months') < -2) {
    fields.year += 1;
    return DateTime.fromObject(fields);
  }
  return date;
};

function roundTo(c: ParsedComponents, text: string) {
  if (c.isCertain('second')) {
    return 'second';
  } else if (c.isCertain('minute')) {
    return 'minute';
  } else if (c.isCertain('hour')) {
    return 'hour';
  } else if (c.isCertain('day') || c.isCertain('weekday')) {
    return 'day';
  } else if (c.isCertain('month')) {
    return 'month';
  } else if (c.isCertain('year')) {
    return 'year';
  } else if (text.includes('week')) {
    return 'week';
  }
}

const dateTimeFrom = (
  start: boolean,
  components: ParsedComponents | undefined,
  text: string,
) => {
  if (!components) return undefined;
  const date = dateTimeFromAll(components);
  const roundToComponent = roundTo(components, text);
  if (roundToComponent) {
    return start
      ? date?.startOf(roundToComponent as DateTimeUnit)
      : date?.endOf(roundToComponent as DateTimeUnit);
  } else {
    return date;
  }
};

function parseRange(text: string): { start?: DateTime; end?: DateTime } {
  if (isEmpty(text)) {
    return {};
  }
  if (text.match(/^[0-9]{4}$/)) {
    const start = DateTime.local(parseInt(text));
    return { start, end: start.endOf('year') };
  }

  const datetimes = parse(text, new Date(), { forwardDate: true });
  if (datetimes[0]) {
    const start = dateTimeFrom(true, datetimes[0].start, text);
    const end = dateTimeFrom(
      false,
      datetimes[0].end || datetimes[1]?.start || datetimes[0].start,
      text,
    );

    if (
      !datetimes[0].end &&
      (text.toLowerCase().startsWith('until ') ||
        text.toLowerCase().startsWith('to ') ||
        text.toLowerCase().startsWith('through ') ||
        text.toLowerCase().startsWith('thru '))
    ) {
      return { start: DateTime.now(), end: end };
    } else if (start && end && start.diff(end).valueOf() > 0) {
      return { start: end, end: start };
    } else {
      return { start, end };
    }
  }
  return {};
}

function parseSingleDate(text: string): DateTime | undefined {
  if (isEmpty(text)) return undefined;
  const datetimes = parse(text, new Date(), { forwardDate: false });
  if (datetimes[0]) {
    return dateTimeFrom(true, datetimes[0].start, text);
  }
  return undefined;
}

// Parse structured syntax like start:2025-01-01 end-of:2025-03-01 updated-since:2026-01-01
function parseStructured(text: string): ParsedSearch | null {
  const startMatch = text.match(/start:(\S+)/);
  const endMatch = text.match(/end-of:(\S+)/);
  const updatedMatch = text.match(/updated-since:(\S+)/);

  if (!startMatch && !endMatch && !updatedMatch) return null;

  const result: ParsedSearch = {};
  if (startMatch) {
    if (startMatch[1] === 'now') {
      result.start = DateTime.now();
    } else {
      const dt = DateTime.fromISO(startMatch[1]);
      if (dt.isValid) result.start = dt;
    }
  }
  if (endMatch) {
    const isYearMonth = /^\d{4}-\d{2}$/.test(endMatch[1]);
    const dt = DateTime.fromISO(endMatch[1]);
    if (dt.isValid) result.end = isYearMonth ? dt.endOf('month') : dt.endOf('day');
  }
  if (updatedMatch) {
    const dt = DateTime.fromISO(updatedMatch[1]);
    if (dt.isValid) result.updatedSince = dt;
  }
  return result;
}

export function parseSearchText(text: string): ParsedSearch {
  if (isEmpty(text)) return {};

  // Try structured syntax first
  const structured = parseStructured(text);
  if (structured) return structured;

  // Extract "updated since ..." portion
  const updatedSinceMatch = text.match(
    /updated[\s-]*since[\s:]+(.+?)(?:$)/i,
  );
  let rangeText = text;
  let updatedSince: DateTime | undefined;

  if (updatedSinceMatch) {
    updatedSince = parseSingleDate(updatedSinceMatch[1].trim());
    rangeText = text.slice(0, updatedSinceMatch.index).trim();
  }

  const range = parseRange(rangeText);
  return { ...range, updatedSince };
}

function isToday(dt: DateTime): boolean {
  return dt.hasSame(DateTime.now(), 'day');
}

function isStartOfMonth(dt: DateTime): boolean {
  return dt.day === 1;
}

function isEndOfMonth(dt: DateTime): boolean {
  return dt.day === dt.daysInMonth;
}

function formatYearMonth(dt: DateTime): string {
  return dt.toFormat('yyyy-MM');
}

export function toStructuredText(parsed: ParsedSearch): string {
  const parts: string[] = [];
  if (parsed.start) {
    const startStr = isToday(parsed.start) ? 'now'
      : isStartOfMonth(parsed.start) ? formatYearMonth(parsed.start)
      : parsed.start.toISODate();
    parts.push(`start:${startStr}`);
  }
  if (parsed.end) {
    const endStr = isEndOfMonth(parsed.end) ? formatYearMonth(parsed.end)
      : parsed.end.toISODate();
    parts.push(`end-of:${endStr}`);
  }
  if (parsed.updatedSince) {
    parts.push(`updated-since:${parsed.updatedSince.toISODate()}`);
  }
  return parts.join(' ');
}

export function formatDate(dt: DateTime | undefined): string {
  if (!dt) return 'none';
  if (isToday(dt)) return 'now';
  if (isStartOfMonth(dt)) return formatYearMonth(dt);
  if (isEndOfMonth(dt)) return formatYearMonth(dt);
  return dt.toISODate() ?? dt.toISO() ?? 'invalid';
}
