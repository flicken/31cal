import React, { useEffect, useState } from 'react';

import { Calendar } from './models/types';
import { db } from './models/db';
import { useLiveQuery } from 'dexie-react-hooks';

import useDefaultCalendar from './lib/useDefaultCalendar';

import { keyBy } from 'lodash-es';

import MultiSelectSort from './MultiSelectSort';
import { StylesConfig } from 'react-select';
import makeAnimated from 'react-select/animated';

import { useRecoilValue, useSetRecoilState } from 'recoil';
import {
  selectedCalendarIds,
  selectedCalendars as selectedCalendarsState,
  allCalendars,
} from './lib/store';

const isDefault = (id: string, defaultId?: string) => {
  return id === defaultId ? { fontWeight: 'bold' } : null;
};

const animatedComponents = makeAnimated();

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

function Calendars({
  options,
  value,
  onChange,
}: {
  options: Calendar[];
  value: Calendar[] | undefined;
  onChange: (c: Calendar[]) => void;
}) {
  return (
    <MultiSelectSort
      getOptionValue={(c: Calendar) => c.id}
      getOptionLabel={(c: Calendar) => c.summary}
      components={animatedComponents}
      isClearable={true}
      value={value}
      options={options}
      onChange={onChange}
      styles={colorStyles}
    />
  );
}

export default Calendars;
