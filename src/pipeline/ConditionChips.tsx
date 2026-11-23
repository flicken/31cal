import React, { useId, useMemo, useState } from 'react';
import { DateTime } from 'luxon';
import { Calendar } from '../models/types';
import Calendars from '../Calendars';
import DateRangeField from '../DateRangeField';
import { SEARCH_EXAMPLES } from '../lib/syntaxExamples';
import {
  Condition,
  ConditionType,
  SINGLETONS,
  TEXT_FIELDS,
  TextField,
  dateRangeOf,
  describe,
  textPattern,
  updatedSinceOf,
} from './filters';

/** What the "+ Add filter" menu offers, with a starting value for each. */
const ADDABLE: { type: ConditionType; label: string; make: () => Condition }[] =
  [
    {
      type: 'dates',
      label: 'Dates',
      make: () => ({ type: 'dates', text: 'next month' }),
    },
    {
      type: 'calendars',
      label: 'Calendars',
      make: () => ({ type: 'calendars', ids: [] }),
    },
    {
      type: 'text',
      label: 'Text',
      make: () => ({ type: 'text', field: 'summary', value: '' }),
    },
    {
      type: 'recurring',
      label: 'Repeating',
      make: () => ({ type: 'recurring', value: true }),
    },
    {
      type: 'allDay',
      label: 'All-day',
      make: () => ({ type: 'allDay', value: true }),
    },
    {
      type: 'hasGuests',
      label: 'Has guests',
      make: () => ({ type: 'hasGuests', value: true }),
    },
    {
      type: 'iOrganize',
      label: 'I organize',
      make: () => ({ type: 'iOrganize', value: true }),
    },
    {
      type: 'cancelled',
      label: 'Deleted events',
      make: () => ({ type: 'cancelled', value: 'include' }),
    },
    {
      type: 'schedule',
      label: 'Schedule',
      make: () => ({ type: 'schedule', name: '' }),
    },
    {
      type: 'updatedSince',
      label: 'Updated since',
      make: () => ({ type: 'updatedSince', text: 'last week' }),
    },
    {
      type: 'copied',
      label: 'Copied by 31cal',
      make: () => ({ type: 'copied', value: true }),
    },
  ];

const FIELD_LABELS: Record<TextField, string> = {
  any: 'Anywhere',
  summary: 'Title',
  description: 'Description',
  location: 'Location',
  guests: 'Guests',
};

function YesNo({
  value,
  onChange,
  yes,
  no,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  yes: string;
  no: string;
}) {
  const name = useId();
  return (
    <span role="radiogroup">
      <label>
        <input
          type="radio"
          name={name}
          checked={value}
          onChange={() => onChange(true)}
        />{' '}
        {yes}
      </label>{' '}
      <label>
        <input
          type="radio"
          name={name}
          checked={!value}
          onChange={() => onChange(false)}
        />{' '}
        {no}
      </label>
    </span>
  );
}

function Editor({
  condition: c,
  onChange,
  calendars,
  schedules,
}: {
  condition: Condition;
  onChange: (c: Condition) => void;
  calendars: Calendar[];
  schedules: string[];
}) {
  const listId = useId();
  switch (c.type) {
    case 'dates': {
      const range = dateRangeOf([c]) ?? {
        start: DateTime.now().startOf('day'),
        end: DateTime.now().endOf('day'),
      };
      return (
        <DateRangeField
          label="Dates"
          value={{ text: c.text, start: range.start, end: range.end }}
          onChange={(v) => onChange({ type: 'dates', text: v.text })}
          showUpdatedSince={false}
          examples={SEARCH_EXAMPLES}
        />
      );
    }
    case 'calendars':
      return (
        <Calendars
          label="Calendars to search"
          options={calendars}
          value={c.ids
            .map((id) => calendars.find((x) => x.id === id))
            .filter((x): x is Calendar => !!x)}
          onChange={(cs) =>
            onChange({ type: 'calendars', ids: cs.map((x) => x.id) })
          }
        />
      );
    case 'text': {
      const { error } = textPattern(c.value);
      return (
        <span className="cond-text">
          <label>
            <span className="sr-only">Search in</span>
            <select
              value={c.field}
              onChange={(e) =>
                onChange({ ...c, field: e.target.value as TextField })
              }
            >
              {TEXT_FIELDS.map((f) => (
                <option key={f} value={f}>
                  {FIELD_LABELS[f]}
                </option>
              ))}
            </select>
          </label>{' '}
          <label>
            <span className="sr-only">contains</span>
            <input
              type="text"
              value={c.value}
              autoFocus
              placeholder="text, or /regex/"
              onChange={(e) => onChange({ ...c, value: e.target.value })}
            />
          </label>
          {error && (
            <span role="alert" className="date-field-error">
              {' '}
              Not a valid pattern ({error}); matching it as plain text.
            </span>
          )}
        </span>
      );
    }
    case 'recurring':
      return (
        <YesNo
          value={c.value}
          onChange={(value) => onChange({ ...c, value })}
          yes="Repeating"
          no="Not repeating"
        />
      );
    case 'allDay':
      return (
        <YesNo
          value={c.value}
          onChange={(value) => onChange({ ...c, value })}
          yes="All-day"
          no="Timed"
        />
      );
    case 'hasGuests':
      return (
        <YesNo
          value={c.value}
          onChange={(value) => onChange({ ...c, value })}
          yes="Has guests"
          no="No guests"
        />
      );
    case 'iOrganize':
      return (
        <YesNo
          value={c.value}
          onChange={(value) => onChange({ ...c, value })}
          yes="I organize"
          no="Someone else organizes"
        />
      );
    case 'copied':
      return (
        <YesNo
          value={c.value}
          onChange={(value) => onChange({ ...c, value })}
          yes="Copied by 31cal"
          no="Not copied"
        />
      );
    case 'cancelled':
      return (
        <label>
          Deleted events{' '}
          <select
            value={c.value}
            onChange={(e) =>
              onChange({ ...c, value: e.target.value as 'include' | 'only' })
            }
          >
            <option value="include">Include them</option>
            <option value="only">Only them</option>
          </select>
        </label>
      );
    case 'schedule':
      return (
        <label>
          Schedule{' '}
          <input
            type="text"
            list={listId}
            value={c.name}
            autoFocus
            onChange={(e) => onChange({ ...c, name: e.target.value })}
          />
          <datalist id={listId}>
            {schedules.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
      );
    case 'updatedSince': {
      const since = updatedSinceOf([c]);
      return (
        <label>
          Updated since{' '}
          <input
            type="text"
            value={c.text}
            autoFocus
            onChange={(e) => onChange({ ...c, text: e.target.value })}
          />{' '}
          <span className="hint">
            {since
              ? `→ ${since.toLocaleString(DateTime.DATE_MED)}`
              : "Can't read that date"}
          </span>
        </label>
      );
    }
  }
}

/** Filter step: one chip per condition (click to edit, × to remove), plus an add menu. */
export default function ConditionChips({
  conditions,
  onChange,
  calendars,
  schedules,
}: {
  conditions: Condition[];
  onChange: (next: Condition[]) => void;
  calendars: Calendar[];
  schedules: string[];
}) {
  const [editing, setEditing] = useState<number | undefined>();
  const [adding, setAdding] = useState(false);
  const calendarName = useMemo(() => {
    const byId = new Map(calendars.map((c) => [c.id, c.summary]));
    return (id: string) => byId.get(id) ?? id;
  }, [calendars]);

  const present = new Set(conditions.map((c) => c.type));
  const addable = ADDABLE.filter(
    (a) => !(SINGLETONS.includes(a.type) && present.has(a.type)),
  );

  const update = (i: number, c: Condition) =>
    onChange(conditions.map((x, j) => (j === i ? c : x)));
  const removeAt = (i: number) => {
    onChange(conditions.filter((_, j) => j !== i));
    setEditing(undefined);
  };

  return (
    <div className="cond">
      <ul className="cond-chips" aria-label="Filters">
        {conditions.map((c, i) => (
          <li key={i} className="cond-chip">
            <button
              type="button"
              className="cond-chip-label"
              aria-expanded={editing === i}
              onClick={() => setEditing(editing === i ? undefined : i)}
            >
              {describe(c, calendarName)}
            </button>
            <button
              type="button"
              className="cond-chip-remove"
              aria-label={`Remove filter: ${describe(c, calendarName)}`}
              onClick={() => removeAt(i)}
            >
              ×
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            className="cond-add"
            aria-expanded={adding}
            onClick={() => setAdding((a) => !a)}
          >
            + Add filter
          </button>
        </li>
      </ul>
      {adding && (
        <div
          className="cond-menu"
          role="group"
          aria-label="Add a filter"
          onKeyDown={(e) => e.key === 'Escape' && setAdding(false)}
        >
          {addable.map((a) => (
            <button
              key={a.type}
              type="button"
              className="example-chip"
              onClick={() => {
                onChange([...conditions, a.make()]);
                setEditing(conditions.length);
                setAdding(false);
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
      {editing !== undefined && conditions[editing] && (
        <div
          className="cond-editor"
          role="group"
          aria-label={`Edit filter: ${describe(conditions[editing], calendarName)}`}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setEditing(undefined);
          }}
        >
          <Editor
            condition={conditions[editing]}
            onChange={(c) => update(editing, c)}
            calendars={calendars}
            schedules={schedules}
          />{' '}
          <button type="button" onClick={() => setEditing(undefined)}>
            Done
          </button>
        </div>
      )}
    </div>
  );
}
