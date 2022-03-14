import { parse, ParsedComponents } from 'chrono-node';
import { DateTime } from 'luxon';

import { CalendarEvent, StartEnd, StartEndDate } from '../models/types';

import { pick } from 'lodash';

function dateTimeToGoogleTime(
  dateMaybeTime: DateTime,
  components: ParsedComponents,
) {
  if (!components.isCertain('hour')) {
    return { date: dateMaybeTime.toISODate() };
  }

  return {
    dateTime: dateMaybeTime.toString(),
    timeZone: dateMaybeTime.zoneName,
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

const toGoogleTime = (components?: ParsedComponents) => {
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
  return !!value.date;
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

const parseInput = (s: string, context: CalendarEvent[] = []) => {
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
    return {
      summary: rest,
      start: toGoogleTime(datetimes[0].start),
      end: toGoogleTime(datetimes[0].end),
    };
  } else {
    return undefined;
  }
};

export default parseInput;
