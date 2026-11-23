import React from 'react';
import { CalendarEvent } from './models/types';
import { isRecurring } from './lib/events';

/** "↻" before a repeating event's title; screen readers hear "(repeats)". */
export default function RepeatMark({
  event,
}: {
  event: Partial<Pick<CalendarEvent, 'recurringEventId'>>;
}) {
  if (!isRecurring(event)) return null;
  return (
    <span className="repeat-mark" title="Repeats">
      <span aria-hidden="true">↻</span>
      <span className="sr-only">(repeats)</span>{' '}
    </span>
  );
}
