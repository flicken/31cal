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

export function notEmpty<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function asArray<T>(v: T | T[]): T[] {
  return Array.isArray(v) ? v : [v];
}
