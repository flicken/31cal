/**
 * Small accessible month calendar built on Luxon (already in the bundle), so
 * the date pickers add a few kB instead of a calendar library + date-fns.
 *
 * - mode "single": click (or Enter/Space) a day to pick it.
 * - mode "range": first pick sets the start, hovering/focusing previews the
 *   range, the second pick completes it (either order).
 * - Keyboard: arrows move a day/week, PageUp/PageDown a month (Shift: year),
 *   Home/End the start/end of the week. Only the focused day is tabbable.
 * - Weeks start on the locale's first day of the week.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DateTime, Info } from 'luxon';

type Props = {
  months?: 1 | 2;
  /** Month/day to show and focus first. */
  initial?: DateTime;
} & (
  | {
      mode: 'single';
      selected?: DateTime;
      onSelect: (day: DateTime) => void;
    }
  | {
      mode: 'range';
      selected?: { start: DateTime; end: DateTime };
      onSelect: (range: { start: DateTime; end: DateTime }) => void;
      /** Called with the first pick while a range is in progress. */
      onAnchor?: (start: DateTime | undefined) => void;
    }
);

const dayKey = (d: DateTime) => d.toISODate()!;

function weekStart(): number {
  try {
    return Info.getStartOfWeek(); // 1 = Monday … 7 = Sunday
  } catch {
    return 1;
  }
}

/** Weeks of a month as arrays of 7 days (null outside the month). */
export function monthWeeks(month: DateTime, firstWeekday = weekStart()) {
  const first = month.startOf('month');
  const lead = (first.weekday - firstWeekday + 7) % 7;
  const cells: (DateTime | null)[] = Array(lead).fill(null);
  for (let d = first; d.month === first.month; d = d.plus({ days: 1 })) {
    cells.push(d);
  }
  while (cells.length % 7) cells.push(null);
  const weeks: (DateTime | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export default function Calendar(props: Props) {
  const months = props.months ?? 1;
  const initial =
    props.initial ??
    (props.mode === 'single' ? props.selected : props.selected?.start) ??
    DateTime.now();
  const [visible, setVisible] = useState(initial.startOf('month'));
  const [focused, setFocused] = useState(initial.startOf('day'));
  const [anchor, setAnchor] = useState<DateTime | undefined>();
  const [hovered, setHovered] = useState<DateTime | undefined>();
  const gridRef = useRef<HTMLDivElement>(null);
  const moveFocus = useRef(false);
  const today = DateTime.now().startOf('day');
  const firstWeekday = weekStart();

  const weekdays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const wd = ((firstWeekday - 1 + i) % 7) + 1;
        return {
          short: Info.weekdays('short')[wd - 1],
          long: Info.weekdays('long')[wd - 1],
        };
      }),
    [firstWeekday],
  );

  /** Focus a day, scrolling the visible months to keep it on screen. */
  const focusDay = (day: DateTime) => {
    setFocused(day);
    setVisible((v) => {
      const last = v.plus({ months: months - 1 }).endOf('month');
      if (day < v) return day.startOf('month');
      if (day > last) return day.startOf('month').minus({ months: months - 1 });
      return v;
    });
  };

  // Give the focused day DOM focus after keyboard moves.
  useEffect(() => {
    if (moveFocus.current) {
      moveFocus.current = false;
      gridRef.current
        ?.querySelector<HTMLButtonElement>(`[data-day="${dayKey(focused)}"]`)
        ?.focus();
    }
  });

  // Range being shown: the selection, or anchor..hover while picking.
  let rangeStart: DateTime | undefined;
  let rangeEnd: DateTime | undefined;
  let previewing = false;
  if (props.mode === 'range') {
    if (anchor) {
      const other = hovered ?? focused;
      [rangeStart, rangeEnd] =
        other < anchor ? [other, anchor] : [anchor, other];
      previewing = true;
    } else if (props.selected) {
      rangeStart = props.selected.start.startOf('day');
      rangeEnd = props.selected.end.startOf('day');
    }
  }
  const singleKey =
    props.mode === 'single' && props.selected
      ? dayKey(props.selected)
      : undefined;

  const pick = (day: DateTime) => {
    setFocused(day);
    if (props.mode === 'single') {
      props.onSelect(day);
      return;
    }
    if (!anchor) {
      setAnchor(day);
      props.onAnchor?.(day);
      return;
    }
    const [s, e] = day < anchor ? [day, anchor] : [anchor, day];
    setAnchor(undefined);
    props.onAnchor?.(undefined);
    props.onSelect({ start: s.startOf('day'), end: e.endOf('day') });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const moves: Record<string, () => DateTime> = {
      ArrowLeft: () => focused.minus({ days: 1 }),
      ArrowRight: () => focused.plus({ days: 1 }),
      ArrowUp: () => focused.minus({ weeks: 1 }),
      ArrowDown: () => focused.plus({ weeks: 1 }),
      PageUp: () => focused.minus(e.shiftKey ? { years: 1 } : { months: 1 }),
      PageDown: () => focused.plus(e.shiftKey ? { years: 1 } : { months: 1 }),
      Home: () =>
        focused.minus({ days: (focused.weekday - firstWeekday + 7) % 7 }),
      End: () =>
        focused.plus({ days: 6 - ((focused.weekday - firstWeekday + 7) % 7) }),
    };
    const move = moves[e.key];
    if (move) {
      e.preventDefault();
      moveFocus.current = true;
      focusDay(move());
    } else if (e.key === 'Escape' && anchor) {
      // Cancel an in-progress range before the popover closes.
      e.stopPropagation();
      setAnchor(undefined);
      if (props.mode === 'range') props.onAnchor?.(undefined);
    }
  };

  const shiftMonths = (n: number) => {
    setVisible((v) => v.plus({ months: n }));
    setFocused((f) => f.plus({ months: n }));
  };

  return (
    <div className="cal" ref={gridRef} onKeyDown={onKeyDown}>
      <div className="cal-nav">
        <button
          type="button"
          aria-label="Show previous month"
          onClick={() => shiftMonths(-1)}
        >
          ‹
        </button>
        <button
          type="button"
          aria-label="Show next month"
          onClick={() => shiftMonths(1)}
        >
          ›
        </button>
      </div>
      <div className="cal-months">
        {Array.from({ length: months }, (_, i) => {
          const month = visible.plus({ months: i });
          const label = month.toLocaleString({
            month: 'long',
            year: 'numeric',
          });
          return (
            <table
              key={label}
              className="cal-month"
              role="grid"
              aria-label={label}
            >
              <caption>{label}</caption>
              <thead>
                <tr>
                  {weekdays.map((w) => (
                    <th key={w.long} scope="col" abbr={w.long}>
                      {w.short.slice(0, 2)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthWeeks(month, firstWeekday).map((week, wi) => (
                  <tr key={wi}>
                    {week.map((day, di) => {
                      if (!day) return <td key={di} />;
                      const k = dayKey(day);
                      const inRange =
                        !!rangeStart &&
                        !!rangeEnd &&
                        day >= rangeStart &&
                        day <= rangeEnd;
                      const isEdge =
                        inRange &&
                        (+day === +rangeStart! || +day === +rangeEnd!);
                      const selected =
                        k === singleKey ||
                        (isEdge && !previewing) ||
                        (!!anchor && +day === +anchor);
                      const cls = [
                        'cal-day',
                        selected && 'is-selected',
                        inRange && 'in-range',
                        inRange && previewing && 'is-preview',
                        +day === +today && 'is-today',
                      ]
                        .filter(Boolean)
                        .join(' ');
                      return (
                        <td
                          key={k}
                          role="gridcell"
                          aria-selected={selected || inRange}
                        >
                          <button
                            type="button"
                            className={cls}
                            data-day={k}
                            tabIndex={+day === +focused ? 0 : -1}
                            aria-label={day.toLocaleString(DateTime.DATE_HUGE)}
                            aria-current={+day === +today ? 'date' : undefined}
                            onClick={() => pick(day)}
                            onMouseEnter={() => setHovered(day)}
                            onMouseLeave={() => setHovered(undefined)}
                            onFocus={() => setFocused(day)}
                          >
                            {day.day}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        })}
      </div>
    </div>
  );
}
