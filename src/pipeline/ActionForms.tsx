import React from 'react';
import { Calendar } from '../models/types';
import JsonEditor from '../JsonEditor';
import type { ActionId, CopyParams, JsonParams, RenameParams } from './actions';
import { textPattern } from './filters';

type FormProps<P> = {
  params: P;
  onChange: (p: P) => void;
  calendars: Calendar[];
  /** Reset Edit JSON from the first selected event. */
  onReset?: () => void;
};

function RenameForm({ params: p, onChange }: FormProps<RenameParams>) {
  const set =
    (k: keyof RenameParams) => (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ ...p, [k]: e.target.value });
  const { error } = textPattern(p.find);
  return (
    <div className="pipeline-form">
      <label>
        Find{' '}
        <input
          type="text"
          value={p.find}
          onChange={set('find')}
          placeholder="text, or /regex/"
        />
      </label>
      <label>
        Replace with{' '}
        <input type="text" value={p.replace} onChange={set('replace')} />
      </label>
      <label>
        Add prefix{' '}
        <input type="text" value={p.prefix} onChange={set('prefix')} />
      </label>
      <label>
        Add suffix{' '}
        <input type="text" value={p.suffix} onChange={set('suffix')} />
      </label>
      {error && (
        <p role="alert" className="date-field-error">
          Find is not a valid pattern ({error}); matching it as plain text.
        </p>
      )}
    </div>
  );
}

function DeleteForm() {
  return (
    <p className="hint">
      Deletes the selected events from Google Calendar. Undo is offered for a
      short while afterwards.
    </p>
  );
}

const writable = (c: Calendar) =>
  !c.accessRole || c.accessRole === 'owner' || c.accessRole === 'writer';

function CopyForm({ params: p, onChange, calendars }: FormProps<CopyParams>) {
  return (
    <div className="pipeline-form">
      <label>
        Copy to{' '}
        <select
          value={p.calendarId}
          onChange={(e) => onChange({ ...p, calendarId: e.target.value })}
        >
          <option value="">Choose a calendar…</option>
          {calendars.filter(writable).map((c) => (
            <option key={c.id} value={c.id}>
              {c.summary}
            </option>
          ))}
        </select>
      </label>
      <label>
        Prefix for copies{' '}
        <input
          type="text"
          value={p.prefix}
          placeholder="e.g. Bob - "
          onChange={(e) => onChange({ ...p, prefix: e.target.value })}
        />
      </label>
    </div>
  );
}

function JsonForm({ params: p, onChange, onReset }: FormProps<JsonParams>) {
  return (
    <div className="pipeline-form pipeline-form-json">
      <p className="hint">
        Fields here are set on every selected event; fields left out are not
        changed. Identity fields (id, created, organizer, …) are ignored.{' '}
        {onReset && (
          <button type="button" className="link-button" onClick={onReset}>
            Start from the first selected event
          </button>
        )}
      </p>
      <JsonEditor value={p.json} onChange={(json) => onChange({ json })} />
    </div>
  );
}

export const ACTION_FORMS: Record<
  ActionId,
  React.ComponentType<FormProps<any>>
> = {
  rename: RenameForm,
  delete: DeleteForm,
  copy: CopyForm,
  json: JsonForm,
};
