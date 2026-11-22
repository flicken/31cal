/**
 * Pure date-range helpers for the date pickers: presets, nudging a range by
 * its own length, and human-readable labels / re-parseable range text.
 */
import { DateTime, DateTimeUnit } from 'luxon';

export type Range = { start: DateTime; end: DateTime };

/** Weeks follow the user's locale (Sunday in the US, Monday in most of Europe). */
const LOCALE_WEEKS = { useLocaleWeeks: true } as const;

export function startOfUnit(d: DateTime, unit: DateTimeUnit): DateTime {
  return unit === 'week' ? d.startOf('week', LOCALE_WEEKS) : d.startOf(unit);
}

export function endOfUnit(d: DateTime, unit: DateTimeUnit): DateTime {
  return unit === 'week' ? d.endOf('week', LOCALE_WEEKS) : d.endOf(unit);
}

/** The whole unit (day/week/month/year) `offset` units away from `now`. */
export function unitRange(
  now: DateTime,
  unit: DateTimeUnit,
  offset = 0,
): Range {
  const start = startOfUnit(now.plus({ [unit]: offset }), unit);
  return { start, end: endOfUnit(start, unit) };
}

/** From the start of today through `count` units (exclusive), e.g. next 7 days. */
export function nextUnits(
  now: DateTime,
  count: number,
  unit: 'days' | 'weeks' | 'months' | 'years',
): Range {
  const start = now.startOf('day');
  return {
    start,
    end: start
      .plus({ [unit]: count })
      .minus({ days: 1 })
      .endOf('day'),
  };
}

/** The `count` units up to and including today, e.g. past 30 days. */
export function pastUnits(
  now: DateTime,
  count: number,
  unit: 'days' | 'weeks' | 'months' | 'years',
): Range {
  const end = now.endOf('day');
  return {
    start: end
      .minus({ [unit]: count })
      .plus({ days: 1 })
      .startOf('day'),
    end,
  };
}

export type Preset = {
  label: string;
  /** Text stored in rangeText; re-parsed when the date changes. */
  text: string;
  range: Range;
};

/**
 * Preset ranges. `bounds` are the earliest event start / latest event end
 * in the local cache (all history is synced), used by "All upcoming" and
 * "Everything".
 */
export function presets(
  now: DateTime,
  bounds?: { first?: number; last?: number },
): Preset[] {
  const today = now.startOf('day');
  const last = bounds?.last ? DateTime.fromMillis(bounds.last) : undefined;
  const first = bounds?.first ? DateTime.fromMillis(bounds.first) : undefined;
  const upcomingEnd =
    last && last > today ? last.endOf('day') : today.plus({ years: 1 });
  const everything = {
    start: (first && first < today ? first : today).startOf('day'),
    end: upcomingEnd,
  };
  return [
    { label: 'Today', text: 'today', range: unitRange(now, 'day') },
    { label: 'This week', text: 'this week', range: unitRange(now, 'week') },
    {
      label: 'Next 7 days',
      text: 'next 7 days',
      range: nextUnits(now, 7, 'days'),
    },
    { label: 'This month', text: 'this month', range: unitRange(now, 'month') },
    {
      label: 'Next month',
      text: 'next month',
      range: unitRange(now, 'month', 1),
    },
    {
      label: 'Next 3 months',
      text: 'next 3 months',
      range: nextUnits(now, 3, 'months'),
    },
    { label: 'This year', text: 'this year', range: unitRange(now, 'year') },
    {
      label: 'All upcoming',
      text: rangeText({ start: today, end: upcomingEnd }),
      range: { start: today, end: upcomingEnd },
    },
    {
      label: 'Everything',
      text: rangeText(everything),
      range: everything,
    },
  ];
}

const isStartOf = (d: DateTime, unit: DateTimeUnit) =>
  +d === +startOfUnit(d, unit);
const isEndOf = (d: DateTime, unit: DateTimeUnit) => +d === +endOfUnit(d, unit);

/** Whole calendar units the range spans exactly, or undefined. */
function wholeUnits(
  { start, end }: Range,
  unit: 'year' | 'month' | 'week' | 'day',
): number | undefined {
  if (!isStartOf(start, unit) || !isEndOf(end, unit)) return undefined;
  const plural = `${unit}s` as const;
  const n = Math.round(
    end.plus({ milliseconds: 1 }).diff(start, plural).get(plural),
  );
  return n >= 1 ? n : undefined;
}

/**
 * Shift a range by its own length. Calendar-aligned ranges stay aligned:
 * a month moves to the next month (whatever its length), a week to the next
 * week, N days by N calendar days (DST-safe).
 */
export function nudge(range: Range, direction: 1 | -1): Range {
  for (const unit of ['year', 'month', 'week', 'day'] as const) {
    const n = wholeUnits(range, unit);
    if (n) {
      const start = range.start.plus({ [`${unit}s`]: n * direction });
      return {
        start,
        end: start.plus({ [`${unit}s`]: n }).minus({ milliseconds: 1 }),
      };
    }
  }
  const days = range.end.diff(range.start, 'days').days;
  if (days >= 1) {
    const shift = Math.round(days) * direction;
    return {
      start: range.start.plus({ days: shift }),
      end: range.end.plus({ days: shift }),
    };
  }
  const ms = +range.end - +range.start;
  return {
    start: range.start.plus({ milliseconds: ms * direction }),
    end: range.end.plus({ milliseconds: ms * direction }),
  };
}

/** Short label for one end of a range: "Sun, Nov 22" (+ year if not this year). */
export function formatDay(d: DateTime, now = DateTime.now()): string {
  return d.toLocaleString(
    d.year === now.year
      ? { weekday: 'short', month: 'short', day: 'numeric' }
      : { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' },
  );
}

/** Text that parseSearchText turns back into this range (day precision). */
export function rangeText({ start, end }: Range): string {
  const startDay = start.startOf('day');
  if (
    isStartOf(startDay, 'month') &&
    isEndOf(end, 'month') &&
    start.hasSame(end, 'month')
  ) {
    return start.toFormat('MMMM yyyy');
  }
  return `${start.toFormat('MMM d, yyyy')} to ${end.toFormat('MMM d, yyyy')}`;
}

/** Text for a single date: "Nov 22, 2026". */
export function dayText(d: DateTime): string {
  return d.toFormat('MMM d, yyyy');
}
