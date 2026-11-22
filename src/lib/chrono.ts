import type { ParsedComponents } from 'chrono-node';
import { DateTime, FixedOffsetZone } from 'luxon';

/**
 * A Luxon DateTime from chrono components (known values, falling back to
 * implied ones). An explicit zone in the text ("3pm EST") becomes a fixed
 * offset; otherwise the local zone is used.
 */
export function componentsToDateTime(c: ParsedComponents): DateTime {
  const get = (k: Parameters<ParsedComponents['get']>[0]) =>
    c.get(k) ?? undefined;
  const offset = c.isCertain('timezoneOffset') ? c.get('timezoneOffset') : null;
  return DateTime.fromObject(
    {
      year: get('year'),
      month: get('month'),
      day: get('day'),
      hour: get('hour'),
      minute: get('minute'),
      second: get('second'),
      millisecond: get('millisecond'),
    },
    typeof offset === 'number'
      ? { zone: FixedOffsetZone.instance(offset) }
      : {},
  );
}
