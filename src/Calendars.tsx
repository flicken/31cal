/**
 * Accessible multi-select for calendars (replaces react-select).
 *
 * - Combobox input with a listbox (aria-activedescendant): type to filter,
 *   ↑/↓ to move, Enter toggles, Esc closes, Backspace on empty input removes
 *   the last calendar.
 * - Chips in the calendar's colors with a remove button. Order matters (the
 *   first calendar is the default for new events): drag a chip with mouse or
 *   touch, or focus it and press Alt+←/→.
 * - `compact` (top bar): one line with "+N more" while closed; expands over
 *   the page while open.
 */
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';

import { Calendar } from './models/types';
import { readableOn } from './lib/contrast';
import { useMediaQuery, useOnClickOutside } from './lib/reactHooks';
import { useSortableList } from './useSortableList';

const MAX_COLLAPSED_CHIPS_WIDE = 3;
const MAX_COLLAPSED_CHIPS_NARROW = 1;

/** Calendar text color, replaced with black/white if it isn't readable. */
const fg = (c: Calendar) => readableOn(c.backgroundColor, c.foregroundColor);

export function moveItem<T>(
  items: readonly T[],
  from: number,
  to: number,
): T[] {
  const next = items.slice();
  const [item] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(to, next.length)), 0, item);
  return next;
}

export function filterCalendars(
  options: Calendar[],
  query: string,
): Calendar[] {
  const q = query.trim().toLowerCase();
  return q
    ? options.filter((c) => c.summary?.toLowerCase().includes(q))
    : options;
}

function Chip({
  calendar,
  index,
  primary,
  register,
  onPointerDown,
  dropSide,
  onRemove,
  onMove,
}: {
  calendar: Calendar;
  index: number;
  primary: boolean;
  register: (index: number, el: HTMLElement | null) => void;
  onPointerDown: (e: React.PointerEvent) => void;
  dropSide?: 'left' | 'right';
  onRemove: () => void;
  onMove: (delta: number) => void;
}) {
  return (
    <span
      ref={(el) => register(index, el)}
      className={`ms-chip${primary ? ' ms-chip-primary' : ''}${dropSide ? ` ms-drop-${dropSide}` : ''}`}
      style={{ backgroundColor: calendar.backgroundColor, color: fg(calendar) }}
      onPointerDown={onPointerDown}
    >
      <span
        className="ms-chip-label"
        tabIndex={0}
        title={primary ? 'Default calendar for new events' : undefined}
        aria-label={`${calendar.summary}${primary ? ' (default)' : ''}, position ${index + 1}. Alt+arrow keys to reorder.`}
        onKeyDown={(e) => {
          if (!e.altKey) return;
          if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            onMove(-1);
          } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            onMove(1);
          }
        }}
      >
        {calendar.summary}
      </span>
      <button
        type="button"
        className="ms-chip-remove"
        aria-label={`Remove ${calendar.summary}`}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        ×
      </button>
    </span>
  );
}

function Calendars({
  options,
  value,
  onChange,
  compact,
  label = 'Calendars',
}: {
  options: Calendar[];
  value: Calendar[] | undefined;
  onChange: (c: Calendar[]) => void;
  compact?: boolean;
  label?: string;
}) {
  const selected = useMemo(() => value ?? [], [value]);
  const selectedIds = useMemo(
    () => new Set(selected.map((c) => c.id)),
    [selected],
  );
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const optionId = (i: number) => `${listId}-opt-${i}`;

  const isNarrow = useMediaQuery('(max-width: 640px)');
  const maxChips = isNarrow
    ? MAX_COLLAPSED_CHIPS_NARROW
    : MAX_COLLAPSED_CHIPS_WIDE;

  const filtered = useMemo(
    () => filterCalendars(options, query),
    [options, query],
  );
  const activeIndex = Math.min(active, Math.max(filtered.length - 1, 0));

  const { itemRefs, dragState, createPointerDownHandler } = useSortableList({
    ignoreSelector: 'button',
  });

  useOnClickOutside(rootRef, () => {
    setOpen(false);
    setQuery('');
  });

  // Keep the active option scrolled into view.
  useEffect(() => {
    if (!open) return;
    document
      .getElementById(optionId(activeIndex))
      ?.scrollIntoView({ block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeIndex]);

  const toggle = (c: Calendar) => {
    if (selectedIds.has(c.id)) {
      onChange(selected.filter((s) => s.id !== c.id));
      setAnnouncement(`${c.summary} removed`);
    } else {
      onChange([...selected, c]);
      setAnnouncement(`${c.summary} added`);
    }
  };

  const reorder = (from: number, to: number) => {
    if (to < 0 || to >= selected.length || from === to) return;
    onChange(moveItem(selected, from, to));
    setAnnouncement(
      `${selected[from].summary} moved to position ${to + 1}${to === 0 ? ', now the default calendar' : ''}`,
    );
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!open) setOpen(true);
        else setActive(Math.min(activeIndex + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!open) setOpen(true);
        else setActive(Math.max(activeIndex - 1, 0));
        break;
      case 'Home':
        if (open) {
          e.preventDefault();
          setActive(0);
        }
        break;
      case 'End':
        if (open) {
          e.preventDefault();
          setActive(filtered.length - 1);
        }
        break;
      case 'Enter':
        if (open && filtered[activeIndex]) {
          e.preventDefault();
          toggle(filtered[activeIndex]);
        }
        break;
      case 'Escape':
        if (open || query) {
          e.preventDefault();
          setOpen(false);
          setQuery('');
        }
        break;
      case 'Backspace':
        if (!query && selected.length > 0) {
          toggle(selected[selected.length - 1]);
        }
        break;
      case 'Tab':
        setOpen(false);
        setQuery('');
        break;
    }
  };

  const collapsed = compact && !open;
  const visible = collapsed ? selected.slice(0, maxChips) : selected;
  const hidden = selected.length - visible.length;

  return (
    <div
      ref={rootRef}
      className={`ms${compact ? ' ms-compact' : ''}${open ? ' ms-open' : ''}`}
    >
      <div
        className="ms-control"
        onMouseDown={(e) => {
          // Clicking empty space in the control focuses the input.
          if (e.target === e.currentTarget) {
            e.preventDefault();
            inputRef.current?.focus();
            setOpen(true);
          }
        }}
      >
        {visible.map((c, i) => (
          <Chip
            key={c.id}
            calendar={c}
            index={i}
            primary={i === 0}
            register={(index, el) => {
              if (el) itemRefs.current.set(index, el);
              else itemRefs.current.delete(index);
            }}
            onPointerDown={createPointerDownHandler(i, reorder)}
            dropSide={
              dragState?.overIndex === i
                ? dragState.fromIndex > i
                  ? 'left'
                  : 'right'
                : undefined
            }
            onRemove={() => toggle(c)}
            onMove={(delta) => reorder(i, i + delta)}
          />
        ))}
        {hidden > 0 && (
          <button
            type="button"
            className="ms-more"
            title={selected
              .slice(visible.length)
              .map((c) => c.summary)
              .join(', ')}
            onClick={() => {
              setOpen(true);
              inputRef.current?.focus();
            }}
          >
            +{hidden} more
          </button>
        )}
        <input
          ref={inputRef}
          className="ms-input"
          role="combobox"
          aria-label={label}
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && filtered.length ? optionId(activeIndex) : undefined
          }
          placeholder={selected.length ? '' : 'Select calendars…'}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {selected.length > 0 && (
          <button
            type="button"
            className="ms-clear"
            aria-label={`Clear all ${label.toLowerCase()}`}
            onClick={() => {
              onChange([]);
              setAnnouncement('All calendars removed');
              inputRef.current?.focus();
            }}
          >
            ×
          </button>
        )}
      </div>
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          aria-multiselectable="true"
          className="ms-list"
        >
          {filtered.length === 0 && (
            <li className="ms-empty">No matching calendars</li>
          )}
          {filtered.map((c, i) => {
            const isSelected = selectedIds.has(c.id);
            return (
              <li
                key={c.id}
                id={optionId(i)}
                role="option"
                aria-selected={isSelected}
                className={`ms-option${i === activeIndex ? ' ms-option-active' : ''}`}
                onMouseDown={(e) => e.preventDefault() /* keep input focus */}
                onMouseMove={() => i !== activeIndex && setActive(i)}
                onClick={() => toggle(c)}
              >
                <span
                  className="ms-swatch"
                  aria-hidden="true"
                  style={{ backgroundColor: c.backgroundColor, color: fg(c) }}
                >
                  {isSelected ? '✓' : ''}
                </span>
                {c.summary}
              </li>
            );
          })}
        </ul>
      )}
      <div className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </div>
    </div>
  );
}

export default Calendars;
