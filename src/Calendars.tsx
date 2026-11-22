import { readableOn } from './lib/contrast';
import React from 'react';

import { Calendar } from './models/types';

import MultiSelectSort from './MultiSelectSort';
import {
  components as rsComponents,
  StylesConfig,
  MultiValueProps,
} from 'react-select';
import makeAnimated from 'react-select/animated';
import { useMediaQuery } from 'usehooks-ts';

const animatedComponents = makeAnimated();

const MAX_COLLAPSED_CHIPS_WIDE = 3;
const MAX_COLLAPSED_CHIPS_NARROW = 1;

function CompactMultiValue(props: MultiValueProps<Calendar, true>) {
  const { index, getValue, selectProps } = props;
  const isOpen = selectProps.menuIsOpen;
  const maxChips = (selectProps as any).__maxChips ?? MAX_COLLAPSED_CHIPS_WIDE;

  // Bold the primary (first) chip
  if (isOpen || index < maxChips) {
    if (index === 0) {
      return (
        <rsComponents.MultiValue
          {...props}
          innerProps={{
            ...props.innerProps,
            style: { ...props.innerProps?.style, fontWeight: 'bold' },
          }}
        />
      );
    }
    return <rsComponents.MultiValue {...props} />;
  }

  // Only render the "+N" badge on the chip right after the cutoff
  if (index === maxChips) {
    const overflow = getValue().length - maxChips;
    const hiddenNames = getValue()
      .slice(maxChips)
      .map((c) => c.summary)
      .join(', ');
    return (
      <span
        title={hiddenNames}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const onMenuOpen = (selectProps as any).onMenuOpen;
          if (onMenuOpen) onMenuOpen();
        }}
        style={{
          padding: '2px 6px',
          fontSize: '0.85em',
          color: '#666',
          whiteSpace: 'nowrap',
          cursor: 'pointer',
        }}
      >
        +{overflow} more
      </span>
    );
  }

  return null;
}

/** Calendar text color, replaced with black/white if it isn't readable. */
const fg = (c: Calendar) => readableOn(c.backgroundColor, c.foregroundColor);

const colorStyles: StylesConfig<Calendar, true> = {
  control: (styles) => ({ ...styles, backgroundColor: 'white' }),
  option: (styles, { data, isDisabled, isFocused }) => {
    return {
      ...styles,
      backgroundColor: data.backgroundColor,
      color: fg(data),
      cursor: isDisabled ? 'not-allowed' : 'default',
      // Outline instead of a brightness filter, which could break contrast.
      boxShadow: isFocused ? `inset 0 0 0 2px ${fg(data)}` : undefined,

      ':active': {
        ...styles[':active'],
        color: fg(data),
        backgroundColor: data.backgroundColor,
        fontWeight: isFocused ? 'bold' : undefined,
      },
    };
  },
  multiValue: (styles, { data }) => {
    return {
      ...styles,
      color: fg(data),
      backgroundColor: data.backgroundColor,
    };
  },
  multiValueLabel: (styles, { data }) => ({
    ...styles,
    color: fg(data),
    backgroundColor: data.backgroundColor,
  }),
  multiValueRemove: (styles, { data }) => ({
    ...styles,
    color: fg(data),
    backgroundColor: data.backgroundColor,
    ':hover': {
      backgroundColor: fg(data),
      color: data.backgroundColor,
    },
  }),
};

const compactStyles: StylesConfig<Calendar, true> = {
  ...colorStyles,
  container: (styles, state) => ({
    ...styles,
    ...(state.selectProps.menuIsOpen
      ? { position: 'absolute' as const, top: 0, left: 0, right: 0, zIndex: 12 }
      : {}),
  }),
  control: (styles, state) => ({
    ...colorStyles.control!(styles, state),
    minHeight: '38px',
    ...(state.menuIsOpen ? {} : { height: '38px', overflow: 'hidden' }),
  }),
  valueContainer: (styles, state) => ({
    ...styles,
    ...(state.selectProps.menuIsOpen
      ? {}
      : { flexWrap: 'nowrap' as const, overflow: 'hidden' }),
  }),
};

function Calendars({
  options,
  value,
  onChange,
  compact,
}: {
  options: Calendar[];
  value: Calendar[] | undefined;
  onChange: (c: Calendar[]) => void;
  compact?: boolean;
}) {
  const isNarrow = useMediaQuery('(max-width: 640px)');
  const maxChips = isNarrow
    ? MAX_COLLAPSED_CHIPS_NARROW
    : MAX_COLLAPSED_CHIPS_WIDE;

  const extraComponents = compact ? { MultiValue: CompactMultiValue } : {};

  return (
    <MultiSelectSort
      getOptionValue={(c: Calendar) => c.id}
      getOptionLabel={(c: Calendar) => c.summary}
      components={{ ...animatedComponents, ...extraComponents }}
      isClearable={true}
      value={value}
      options={options}
      onChange={onChange}
      styles={compact ? compactStyles : colorStyles}
      __maxChips={maxChips}
    />
  );
}

export default Calendars;
