/**
 * Date range control: a free-text box that keeps what you typed, plus Start
 * and End chips (each a popover with a text box and calendar), a range
 * popover with presets, ‹ › to shift the range by its own length, and an
 * optional "Updated since" chip. Used by the top bar and the bulk filters.
 */
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { DateTime } from 'luxon';
import { useMediaQuery, useOnClickOutside } from './lib/reactHooks';
import Calendar from './Calendar';
import { parseSearchText } from './lib/searchTextParser';
import {
  formatDay,
  nudge,
  presets,
  Range,
  rangeText,
  withUpdatedSince,
} from './lib/dateRange';
import { useEventBounds } from './lib/hooks';

export type DateRangeValue = {
  /** What the user typed (or the text a chip/preset wrote); re-parsed daily. */
  text: string;
  start: DateTime;
  end: DateTime;
  updatedSince?: DateTime;
};

type Which = 'start' | 'end' | 'range' | 'updated';

function Popover({
  label,
  onClose,
  children,
}: {
  label: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    const target =
      el?.querySelector<HTMLElement>('[data-autofocus]') ??
      el?.querySelector<HTMLElement>('button, input, [tabindex="0"]');
    target?.focus();
  }, []);
  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={label}
      className="date-popover"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <button
        type="button"
        className="date-popover-close"
        aria-label="Close"
        onClick={onClose}
      >
        ×
      </button>
      {children}
    </div>
  );
}

function SingleDatePanel({
  label,
  value,
  onSelect,
}: {
  label: string;
  value?: DateTime;
  onSelect: (d: DateTime) => void;
}) {
  const [text, setText] = useState('');
  const typed = useMemo(
    () => (text.trim() ? parseSearchText(text).start : undefined),
    [text],
  );
  const inputId = useId();
  return (
    <div className="date-panel">
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        type="text"
        value={text}
        placeholder="e.g. next friday, 3/15, Jan 3 2027"
        data-autofocus
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && typed) {
            e.preventDefault();
            onSelect(typed);
          }
        }}
      />
      <div className="date-panel-preview" aria-live="polite">
        {text.trim()
          ? typed
            ? `→ ${formatDay(typed)} (press Enter)`
            : "Can't read that date"
          : 'Type a date or pick one'}
      </div>
      <Calendar
        key={typed ? typed.toISODate() : 'value'}
        mode="single"
        selected={typed ?? value}
        onSelect={onSelect}
      />
    </div>
  );
}

function RangePanel({
  value,
  onSelect,
}: {
  value: Range;
  onSelect: (range: Range, text?: string) => void;
}) {
  const wide = useMediaQuery('(min-width: 640px)');
  const bounds = useEventBounds();
  const list = useMemo(() => presets(DateTime.now(), bounds), [bounds]);
  const [anchor, setAnchor] = useState<DateTime | undefined>();
  return (
    <div className="date-panel date-panel-range">
      <ul className="date-presets" aria-label="Presets">
        {list.map((p) => (
          <li key={p.label}>
            <button
              type="button"
              className="example-chip"
              onClick={() => onSelect(p.range, p.text)}
            >
              {p.label}
            </button>
          </li>
        ))}
      </ul>
      <div>
        <div className="date-panel-preview" aria-live="polite">
          {anchor
            ? `From ${formatDay(anchor)}: now pick the last day`
            : 'Pick the first day, then the last day'}
        </div>
        <Calendar
          mode="range"
          months={wide ? 2 : 1}
          selected={value}
          onAnchor={setAnchor}
          onSelect={(r) => onSelect(r)}
        />
      </div>
    </div>
  );
}

export default function DateRangeField({
  value,
  onChange,
  defaultText,
  showUpdatedSince = true,
  examples,
  label = 'Dates',
}: {
  value: DateRangeValue;
  onChange: (v: DateRangeValue) => void;
  /** Text to restore with the reset (×) button. */
  defaultText?: string;
  showUpdatedSince?: boolean;
  /** Clickable example phrases shown while the text box has focus. */
  examples?: string[];
  label?: string;
}) {
  const [draft, setDraft] = useState(value.text);
  const [unreadable, setUnreadable] = useState(false);
  const [open, setOpen] = useState<Which | undefined>();
  const [showExamples, setShowExamples] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggers = useRef<Partial<Record<Which, HTMLButtonElement | null>>>({});
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputId = useId();

  // Follow external changes (chips, presets, daily refresh) but never
  // rewrite text the user is typing.
  const [prevText, setPrevText] = useState(value.text);
  if (value.text !== prevText) {
    setPrevText(value.text);
    setDraft(value.text);
    setUnreadable(false);
  }

  useOnClickOutside(rootRef as React.RefObject<HTMLElement>, () => {
    setOpen(undefined);
    setShowExamples(false);
  });
  useEffect(() => () => clearTimeout(debounce.current), []);

  const close = (focusTrigger = true) => {
    const which = open;
    setOpen(undefined);
    if (focusTrigger && which) triggers.current[which]?.focus();
  };

  const applyText = (text: string) => {
    clearTimeout(debounce.current);
    const parsed = parseSearchText(text);
    if (parsed.start && parsed.end) {
      setUnreadable(false);
      onChange({
        text,
        start: parsed.start,
        end: parsed.end,
        updatedSince: parsed.updatedSince,
      });
    } else {
      setUnreadable(text.trim().length > 0);
    }
  };

  const setRange = (range: Range, text?: string) => {
    onChange({
      ...value,
      text: withUpdatedSince(text ?? rangeText(range), value.updatedSince),
      start: range.start,
      end: range.end,
    });
  };
  const setStart = (d: DateTime) => {
    const start = d.startOf('day');
    setRange({
      start,
      end: value.end < start ? start.endOf('day') : value.end,
    });
    close();
  };
  const setEnd = (d: DateTime) => {
    const end = d.endOf('day');
    setRange({
      start: value.start > end ? end.startOf('day') : value.start,
      end,
    });
    close();
  };
  const setUpdated = (d: DateTime | undefined) => {
    const since = d?.startOf('day');
    onChange({
      ...value,
      text: withUpdatedSince(value.text, since),
      updatedSince: since,
    });
  };

  const chip = (which: Which, text: React.ReactNode, aria: string) => (
    <button
      type="button"
      className="date-chip"
      aria-haspopup="dialog"
      aria-expanded={open === which}
      aria-label={aria}
      ref={(el) => {
        triggers.current[which] = el;
      }}
      onClick={() => setOpen((o) => (o === which ? undefined : which))}
    >
      {text}
    </button>
  );

  return (
    <div className="date-field" ref={rootRef}>
      <div className="date-field-input">
        <span aria-hidden="true">&#128197;</span>
        <label htmlFor={inputId} className="visually-hidden">
          {label} (type a range, e.g. next week, january to march, updated since
          monday)
        </label>
        <input
          id={inputId}
          type="text"
          value={draft}
          placeholder="next week, january to march, updated since monday…"
          onFocus={() => setShowExamples(!!examples)}
          onChange={(e) => {
            const text = e.target.value;
            setDraft(text);
            clearTimeout(debounce.current);
            debounce.current = setTimeout(() => applyText(text), 300);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              applyText(draft);
              setShowExamples(false);
            } else if (e.key === 'Escape') {
              setShowExamples(false);
            }
          }}
          onBlur={() => applyText(draft)}
          aria-describedby={unreadable ? `${inputId}-err` : undefined}
        />
        {defaultText !== undefined && draft !== defaultText && (
          <button
            type="button"
            className="date-field-reset"
            aria-label="Reset dates to default"
            title="Reset to default"
            onClick={() => {
              setDraft(defaultText);
              applyText(defaultText);
            }}
          >
            ×
          </button>
        )}
      </div>
      {unreadable && (
        <div id={`${inputId}-err`} className="date-field-error" role="status">
          Can't read that; still showing the dates below.
        </div>
      )}
      {showExamples && examples && (
        <div className="date-examples">
          Try:{' '}
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              className="example-chip"
              // Keep focus in the input so blur doesn't apply the old text.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setDraft(ex);
                applyText(ex);
                setShowExamples(false);
              }}
            >
              {ex}
            </button>
          ))}
        </div>
      )}
      <div className="date-chips">
        <button
          type="button"
          className="date-nudge"
          aria-label="Previous period"
          onClick={() => setRange(nudge(value, -1))}
        >
          ‹
        </button>
        {chip(
          'start',
          <>
            <span className="date-chip-label">From</span>{' '}
            {formatDay(value.start)}
          </>,
          `Start date: ${formatDay(value.start)}. Change`,
        )}
        {chip(
          'end',
          <>
            <span className="date-chip-label">to</span> {formatDay(value.end)}
          </>,
          `End date: ${formatDay(value.end)}. Change`,
        )}
        <button
          type="button"
          className="date-nudge"
          aria-label="Next period"
          onClick={() => setRange(nudge(value, 1))}
        >
          ›
        </button>
        {chip('range', 'Calendar…', 'Pick a range on a calendar or a preset')}
        {showUpdatedSince &&
          (value.updatedSince ? (
            <span className="date-chip-group">
              {chip(
                'updated',
                <>
                  <span className="date-chip-label">Updated since</span>{' '}
                  {formatDay(value.updatedSince)}
                </>,
                `Updated since ${formatDay(value.updatedSince)}. Change`,
              )}
              <button
                type="button"
                className="date-nudge"
                aria-label="Remove updated since filter"
                onClick={() => setUpdated(undefined)}
              >
                ×
              </button>
            </span>
          ) : (
            chip('updated', '+ Updated since', 'Add an updated since filter')
          ))}
      </div>
      {open === 'start' && (
        <Popover label="Start date" onClose={close}>
          <SingleDatePanel
            label="Start date"
            value={value.start}
            onSelect={setStart}
          />
        </Popover>
      )}
      {open === 'end' && (
        <Popover label="End date" onClose={close}>
          <SingleDatePanel
            label="End date"
            value={value.end}
            onSelect={setEnd}
          />
        </Popover>
      )}
      {open === 'range' && (
        <Popover label="Date range" onClose={close}>
          <RangePanel
            value={value}
            onSelect={(r, text) => {
              setRange(r, text);
              close();
            }}
          />
        </Popover>
      )}
      {open === 'updated' && (
        <Popover label="Updated since" onClose={close}>
          <SingleDatePanel
            label="Updated since"
            value={value.updatedSince}
            onSelect={(d) => {
              setUpdated(d);
              close();
            }}
          />
        </Popover>
      )}
    </div>
  );
}
