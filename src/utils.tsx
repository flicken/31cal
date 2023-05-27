import React from 'react';

import { DateTime } from 'luxon';

export function showDate(millis?: number) {
  if (!millis) return undefined;

  const date = DateTime.fromMillis(millis);
  return <span title={date.toString()}>{toRelativeDate(date)}</span>;
}

export function toRelativeDate(d: number | DateTime): string | null {
  if (!d) return null;

  const date = typeof d === 'number' ? DateTime.fromMillis(d) : d;
  return date.toRelative({ style: 'narrow' });
}
