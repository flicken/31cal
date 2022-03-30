import React, { useState } from 'react';

import { useRecoilState } from 'recoil';
import { eventFilters } from './lib/store';
import { useLiveQuery } from 'dexie-react-hooks';

import Calendars from './Calendars';
import DateTimeRangeInput, { DateTimeRange } from './DateTimeRangeInput';
import DateTimeInput from './DateTimeInput';

import { DateTime } from 'luxon';

function Filters() {
  const [filters_, setFilters] = useRecoilState(eventFilters);

  const setRange = (newRange: DateTimeRange) => {
    setFilters((f: any) => {
      if (newRange && newRange.start && newRange.end) {
        return {
          ...f,
          ...{
            start: newRange?.start,
            end: newRange?.end,
            rangeText: newRange.text,
          },
        };
      } else {
        return f;
      }
    });
  };

  const setUpdatedSince = (newUpdatedSince: any) => {
    setFilters((f: any) => {
      return {
        ...f,
        updatedSince: newUpdatedSince?.date,
        updatedSinceText: newUpdatedSince?.text,
      };
    });
  };

  /*
    
    border-radius: calc(var(--unit) * 2);
    padding: calc(var(--unit) * 4.5);
    background: #fff;
*/
  return (
    <div
      style={{
        boxShadow:
          '0 0 0 1px rgba(136, 152, 170, 0.1), 0 15px 35px 0 rgba(49, 49, 93, 0.1), 0 5px 15px 0 rgba(0, 0, 0, 0.08)',
        background: '#fff',
      }}
    >
      <Calendars />
      <DateTimeRangeInput
        value={{ ...filters_, text: filters_.rangeText }}
        onChange={setRange}
      />
      Updated since{' '}
      <DateTimeInput
        value={{ text: filters_.updatedSinceText, date: filters_.updatedSince }}
        onChange={setUpdatedSince}
      />
      <br />
      {JSON.stringify(filters_)}
    </div>
  );
}

export default Filters;
