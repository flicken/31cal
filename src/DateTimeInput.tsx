import React from 'react';

import { DateTime, DateTimeUnit } from 'luxon';
import { parse, ParsedComponents } from 'chrono-node';
import { pick, isEmpty } from 'lodash-es';

export type DateTimeRange = {
  start?: DateTime;
  end?: DateTime;
};

type ValueType = {
  text?: string;
  date?: DateTime;
};

type Props = {
  value: ValueType;
  onChange: (arg0: ValueType) => void;
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

export default function DateTimeInput({ value, onChange }: Props) {
  const parseDate = React.useCallback(
    (e) => {
      const text = e.target.value;
      if (isEmpty(text)) {
        onChange({});
      }
      let datetimes = parse(text, new Date(), { forwardDate: false });
      console.log('datetimes', datetimes);
      if (datetimes[0]) {
        const date = dateTimeFrom(true, datetimes[0].start, text);
        onChange({ date, text });
      }
    },
    [onChange],
  );

  return (
    <>
      <input
        type="text"
        defaultValue={value?.text}
        placeholder="e.g. last week"
        style={{ width: '20em' }}
        onChange={parseDate}
      />
      <br />
    </>
  );
}
