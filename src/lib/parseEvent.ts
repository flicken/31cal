import { parse, ParsedComponents } from 'chrono-node';
import { DateTime } from 'luxon';

import { CalendarEvent, StartEnd, StartEndDate } from '../models/types';

import { pick } from 'lodash-es';

function dateTimeToGoogleTime(
  dateMaybeTime: DateTime,
  components: ParsedComponents,
): StartEnd {
  if (!components.isCertain('hour')) {
    return { date: dateMaybeTime.toISODate()! };
  }

  return {
    dateTime: dateMaybeTime.toString(),
    timeZone: dateMaybeTime.zoneName!,
  };
}

const dateTimeFromAll = (components: any) => {
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
  return DateTime.fromObject(fields);
};

const toGoogleTime = (components: ParsedComponents): StartEnd | undefined => {
  if (!components) return undefined;
  console.log('toGoogleTime', components);

  if (components.isCertain('weekday')) {
    const date = dateTimeFromAll(components);
    return dateTimeToGoogleTime(date, components);
  } else if (components.isCertain('month') && components.isCertain('day')) {
    const kv: any = (components as any).knownValues;
    console.log('kv', kv);
    const date = DateTime.fromObject({
      year: kv.year || (components as any).impliedValues.year,
      month: kv.month,
      day: kv.day,
      hour: kv.hour,
      minute: kv.minute,
      second: kv.second,
      millisecond: kv.millisecond,
    });
    return dateTimeToGoogleTime(date, components);
  } else if (components.isCertain('hour')) {
    const date = dateTimeFromAll(components);
    return dateTimeToGoogleTime(date, components);
  }

  return undefined;
};

function isStartEndDate(value: StartEnd): value is StartEndDate {
  return Object.prototype.hasOwnProperty.call(value, 'date');
}

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
  console.log('Last event', lastEvent);
  const referenceDatetime = toReferenceDatetime(lastEvent?.start);
  console.log('Reference datetime', referenceDatetime);

  let datetimes = parse(s, referenceDatetime, { forwardDate: true });
  console.log('parsed', datetimes);
  if (datetimes[0]) {
    let components: any = datetimes[0].start;
    console.log('components', components);

    let values = { ...components.impliedValues, ...components.knownValues };
    let rest = s.replace(datetimes[0].text, '').trim();
    console.log('values', values);
    const start = toGoogleTime(datetimes[0].start);
    const maybeEnd = toGoogleTime(datetimes[0].end ?? datetimes[0].start);
    // End of full-day calendar events must be on the next day.
    // For example, an event on "Saturday", would have e.g.
    //    start: {date: "2023-05-27"}
    //    end:   {date: "2023-05-28"}
    const end = maybeEnd && 'date' in maybeEnd ? addOneDay(maybeEnd) : maybeEnd;

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
