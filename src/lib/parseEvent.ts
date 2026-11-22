import { debug } from './log';
import { parse, ParsedComponents } from 'chrono-node';
import { DateTime } from 'luxon';
import { componentsToDateTime } from './chrono';

import {
  CalendarEvent,
  isStartEndDate,
  StartEnd,
  StartEndDate,
} from '../models/types';

function dateTimeToGoogleTime(
  dateMaybeTime: DateTime,
  components: ParsedComponents,
): StartEnd {
  if (!components.isCertain('hour')) {
    return { date: dateMaybeTime.toISODate()! };
  }

  // Google needs an IANA zone name; fixed offsets ("3pm EST") stay in the
  // dateTime's offset only.
  return dateMaybeTime.zone.type === 'iana'
    ? { dateTime: dateMaybeTime.toISO()!, timeZone: dateMaybeTime.zoneName! }
    : { dateTime: dateMaybeTime.toISO()! };
}

const toGoogleTime = (components: ParsedComponents): StartEnd | undefined => {
  if (!components) return undefined;
  debug('toGoogleTime', components);

  if (
    components.isCertain('weekday') ||
    (components.isCertain('month') && components.isCertain('day')) ||
    components.isCertain('hour')
  ) {
    return dateTimeToGoogleTime(componentsToDateTime(components), components);
  }

  return undefined;
};

const toReferenceDatetime = (startEnd: StartEnd) => {
  if (!startEnd) return new Date();
  if (isStartEndDate(startEnd)) {
    return DateTime.fromISO(startEnd.date).toJSDate();
  } else {
    return DateTime.fromISO(startEnd.dateTime, {
      zone: startEnd.timeZone,
    }).toJSDate();
  }
};

const parseInput = (
  s: string,
  context: CalendarEvent[] = [],
): Partial<CalendarEvent> | undefined => {
  const lastEvent = context[context.length - 1];
  debug('Last event', lastEvent);
  const referenceDatetime = toReferenceDatetime(lastEvent?.start);
  debug('Reference datetime', referenceDatetime);

  let datetimes = parse(s, referenceDatetime, { forwardDate: true });
  debug('parsed', datetimes);
  if (datetimes[0]) {
    debug('components', datetimes[0].start);
    const rest = s.replace(datetimes[0].text, '').trim();
    const start = toGoogleTime(datetimes[0].start);
    const maybeEnd = toGoogleTime(datetimes[0].end ?? datetimes[0].start);
    // End of full-day calendar events must be on the next day.
    // For example, an event on "Saturday", would have e.g.
    //    start: {date: "2023-05-27"}
    //    end:   {date: "2023-05-28"}
    let end = maybeEnd && 'date' in maybeEnd ? addOneDay(maybeEnd) : maybeEnd;
    // "11pm-1am" ends the next day; Google rejects ends before starts.
    if (start && end && 'dateTime' in start && 'dateTime' in end) {
      const startDt = DateTime.fromISO(start.dateTime, { setZone: true });
      let endDt = DateTime.fromISO(end.dateTime, { setZone: true });
      if (!datetimes[0].end) {
        // A single time ("Sat 3pm Soccer") is a one-hour event.
        endDt = startDt.plus({ hours: 1 });
      }
      while (endDt <= startDt) endDt = endDt.plus({ days: 1 });
      end = { ...end, dateTime: endDt.toISO()! };
    }

    return {
      summary: rest,
      start,
      end,
    };
  } else {
    return undefined;
  }
};

function addOneDay(maybeEnd: StartEndDate): StartEndDate {
  return {
    ...maybeEnd,
    date: DateTime.fromISO(maybeEnd.date).plus({ days: 1 }).toISODate()!,
  };
}

export default parseInput;
