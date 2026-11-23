import React, { useMemo, useRef } from 'react';
import { DateTime } from 'luxon';
import { Calendar, CalendarEvent } from '../models/types';
import RowList from '../RowList';
import RepeatMark from '../RepeatMark';
import { ViewStartAndEnd } from '../ViewStartAndEnd';
import { readableOn } from '../lib/contrast';
import { eventDays, keyFor } from '../lib/events';
import {
  Selection,
  groupState,
  isSelected,
  selectRange,
  toggle,
  toggleGroup,
} from './selection';

type Row =
  | { kind: 'day'; day: string; keys: string[] }
  | { kind: 'event'; event: CalendarEvent; key: string };

/** Day headers followed by their events, by each event's first day. */
export function groupByDay(events: CalendarEvent[]): Row[] {
  const rows: Row[] = [];
  let current: Extract<Row, { kind: 'day' }> | undefined;
  for (const e of events) {
    const day = eventDays(e)[0] ?? 'Unknown date';
    if (!current || current.day !== day) {
      current = { kind: 'day', day, keys: [] };
      rows.push(current);
    }
    const key = keyFor(e);
    current.keys.push(key);
    rows.push({ kind: 'event', event: e, key });
  }
  return rows;
}

function dayLabel(day: string) {
  const d = DateTime.fromISO(day);
  return d.isValid ? d.toLocaleString(DateTime.DATE_HUGE) : day;
}

export default function ResultsList({
  events,
  calendars,
  selection,
  onSelection,
}: {
  events: CalendarEvent[];
  calendars: Map<string, Calendar>;
  selection: Selection;
  onSelection: (s: Selection) => void;
}) {
  const rows = useMemo(() => groupByDay(events), [events]);
  const ordered = useMemo(() => events.map(keyFor), [events]);
  const anchor = useRef<string | undefined>(undefined);

  return (
    <div className="pipeline-results">
      <RowList
        items={rows}
        getKey={(r) => (r.kind === 'day' ? `day:${r.day}` : r.key)}
        renderItem={(r) => {
          if (r.kind === 'day') {
            const state = groupState(selection, r.keys);
            return (
              <label className="pipeline-day">
                <input
                  type="checkbox"
                  checked={state === 'all'}
                  ref={(el) => {
                    if (el) el.indeterminate = state === 'some';
                  }}
                  onChange={() => onSelection(toggleGroup(selection, r.keys))}
                />{' '}
                {dayLabel(r.day)}{' '}
                <span className="hint">({r.keys.length})</span>
              </label>
            );
          }
          const e = r.event;
          const cal = calendars.get(e.calendarId);
          return (
            <label className="pipeline-row">
              <input
                type="checkbox"
                checked={isSelected(selection, r.key)}
                onChange={(ev) => {
                  // A checkbox's change event wraps the native click, which
                  // carries shiftKey for range selection.
                  const shift = (ev.nativeEvent as MouseEvent).shiftKey;
                  const next =
                    shift && anchor.current
                      ? selectRange(selection, ordered, anchor.current, r.key)
                      : toggle(selection, r.key);
                  anchor.current = r.key;
                  onSelection(next);
                }}
              />
              <span
                className="pipeline-swatch"
                title={cal?.summary}
                aria-hidden="true"
                style={{
                  backgroundColor: cal?.backgroundColor,
                  color:
                    cal && readableOn(cal.backgroundColor, cal.foregroundColor),
                }}
              />
              <ViewStartAndEnd start={e.start} end={e.end} showDate={false} />{' '}
              <RepeatMark event={e} />
              <b>{e.summary || '(no title)'}</b>
              {e.status === 'cancelled' && (
                <span className="hint"> (deleted)</span>
              )}
              {cal && (
                <span className="hint pipeline-calname"> · {cal.summary}</span>
              )}
            </label>
          );
        }}
      />
    </div>
  );
}
