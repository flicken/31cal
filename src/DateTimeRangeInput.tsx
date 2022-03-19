import React from 'react';

import { DateTime, DateTimeUnit } from 'luxon';
import { parse, ParsedComponents } from 'chrono-node';
import { pick, isEmpty } from 'lodash';

export type DateTimeRange = {
  start?: DateTime;
  end?: DateTime;
};

type Props = {
  value: DateTimeRange;
  onChange: (arg0: DateTimeRange) => void;
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
  console.log('month', date.diffNow().as('months'));
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
  console.log('round to component', roundToComponent, components);
  if (roundToComponent) {
    return start
      ? date?.startOf(roundToComponent as DateTimeUnit)
      : date?.endOf(roundToComponent as DateTimeUnit);
  } else {
    return date;
  }
};

export default function DateTimeRangeInput({ value, onChange }: Props) {
  const parseDateRange = React.useCallback(
    (e) => {
      const text = e.target.value;
      console.log('text', text);
      if (isEmpty(text)) {
        onChange({});
      }
      if (text.match(/^[0-9]{4}$/)) {
        console.log('matched', text);
        const start = DateTime.local(parseInt(text));
        onChange({ start, text, end: start.endOf('year') });
        return;
      }

      let datetimes = parse(text, new Date(), { forwardDate: true });
      console.log('datetimes', datetimes);
      if (datetimes[0]) {
        const start = dateTimeFrom(true, datetimes[0].start, text);
        const end = dateTimeFrom(
          false,
          datetimes[0].end || datetimes[1]?.start || datetimes[0].start,
          text,
        );
        console.log({ start, text, end: start.endOf('year') });

        if (
          !datetimes[0].end &&
          (text.toLowerCase().startsWith('until ') ||
            text.toLowerCase().startsWith('to ') ||
            text.toLowerCase().startsWith('through ') ||
            text.toLowerCase().startsWith('thru '))
        ) {
          console.log('Until / to branch');
          console.log({ start: start, end: end });
          onChange({ start: DateTime.now(), end: end, text });
        } else if (start && end && start.diff(end).valueOf() > 0) {
          onChange({ start: end, end: start, text });
        } else {
          onChange({ start, end, text });
        }
      }
    },
    [onChange],
  );
  return (
    <>
      <input
        type="text"
        style={{ width: '40em' }}
        placeholder="next week"
        defaultValue={value?.text}
        onChange={parseDateRange}
      />
      <br />
    </>
  );
}
