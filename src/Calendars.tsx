import React, { useEffect, useState } from 'react';

import { Calendar } from './models/types';
import { db } from './models/db';
import { useLiveQuery } from 'dexie-react-hooks';

import useDefaultCalendar from './lib/useDefaultCalendar';

import { keyBy } from 'lodash';

import MultiSelectSort from './MultiSelectSort';
import { StylesConfig } from 'react-select';

import { useRecoilValue } from 'recoil';
import {
  selectedCalendars as selectedCalendarsState,
  allCalendars,
} from './lib/store';

import _ from 'lodash';

const isDefault = (id: string, defaultId?: string) => {
  return id === defaultId ? { fontWeight: 'bold' } : null;
};

const colorStyles: StylesConfig<Calendar, true> = {
  control: (styles) => ({ ...styles, backgroundColor: 'white' }),
  option: (styles, { data, isDisabled, isFocused, isSelected }) => {
    const color = data.foregroundColor;
    return {
      ...styles,
      backgroundColor: data.backgroundColor,
      color: data.foregroundColor,
      cursor: isDisabled ? 'not-allowed' : 'default',
      filter: isFocused ? 'brightness(110%)' : undefined,
      borderStyle: isFocused ? ('outset' as any) : undefined,

      ':active': {
        ...styles[':active'],
        color: data.foregroundColor,
        backgroundColor: data.backgroundColor,
        fontWeight: isFocused ? 'bold' : undefined,
        filter: isFocused ? 'brightness(125%)' : undefined,
      },
    };
  },
  menuList: (styles) => ({
    ...styles,
    minHeight: '80vw',
  }),
  multiValue: (styles, { data }) => {
    const color = data.foregroundColor;
    return {
      ...styles,
      color: data.foregroundColor,
      backgroundColor: data.backgroundColor,
    };
  },
  multiValueLabel: (styles, { data }) => ({
    ...styles,
    color: data.foregroundColor,
    backgroundColor: data.backgroundColor,
  }),
  multiValueRemove: (styles, { data }) => ({
    ...styles,
    color: data.foregroundColor,
    backgroundColor: data.backgroundColor,
    ':hover': {
      backgroundColor: data.foregroundColor,
      color: data.backgroundColor,
    },
  }),
};

function Calendars() {
  const calList = useRecoilValue(allCalendars);
  const selectedCalendars = useRecoilValue(selectedCalendarsState);

  const onChange = (calendars: Calendar[]) => {
    if (calendars.length > 0 && calendars[0]) {
      db.settings.put({ id: 'calendarDefault', value: calendars[0].id });
    }
    db.settings.put({
      id: 'selectedCalendars',
      value: calendars.filter((c) => c).map((c) => c?.id),
    });
  };

  return (
    <MultiSelectSort
      getOptionValue={(c: Calendar) => c.id}
      getOptionLabel={(c: Calendar) => c.summary}
      isClearable={true}
      defaultValue={selectedCalendars}
      options={calList}
      onChange={onChange}
      styles={colorStyles}
    />
  );
}

export default Calendars;
