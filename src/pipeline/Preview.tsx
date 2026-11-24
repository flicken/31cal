import React from 'react';
import { Calendar } from '../models/types';
import RepeatMark from '../RepeatMark';
import { ViewStartAndEnd } from '../ViewStartAndEnd';
import type { Change, Plan } from './actions';
import { repeatingNote } from '../lib/events';

function show(v: unknown): string {
  if (v === undefined || v === null || v === '') return '—';
  if (typeof v === 'string') return v;
  return JSON.stringify(v);
}

function Fields({ values }: { values: Record<string, unknown> }) {
  const keys = Object.keys(values);
  if (keys.length === 0) return <span className="hint">—</span>;
  if (keys.length === 1 && keys[0] === 'summary')
    return <>{show(values.summary)}</>;
  return (
    <dl className="pipeline-fields">
      {keys.map((k) => (
        <React.Fragment key={k}>
          <dt>{k}</dt>
          <dd>{show(values[k])}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

const verbs: Record<Change['kind'], string> = {
  patch: 'Change',
  delete: 'Delete',
  insert: 'Add',
};

/** Step 4: every planned change, before → after, with per-row skip. */
export default function Preview({
  plan,
  calendars,
  skipped,
  onSkip,
}: {
  plan: Plan;
  calendars: Map<string, Calendar>;
  skipped: ReadonlySet<string>;
  onSkip: (key: string, skip: boolean) => void;
}) {
  if (plan.error) {
    return (
      <p role="alert" className="date-field-error">
        {plan.error}
      </p>
    );
  }
  if (plan.changes.length === 0) {
    return (
      <p className="hint">
        Nothing to change
        {plan.unchanged
          ? ` (${plan.unchanged} selected events would stay the same)`
          : ''}
        .
      </p>
    );
  }
  const note = repeatingNote(
    plan.changes.map((c) => c.event),
    { copying: plan.changes.every((c) => c.kind === 'insert') },
  );
  return (
    <div className="table-scroll">
      {note && (
        <p role="note" className="repeat-note">
          <span aria-hidden="true">↻</span> {note}
        </p>
      )}
      <table className="pipeline-preview">
        <thead>
          <tr>
            <th scope="col">Include</th>
            <th scope="col">Event</th>
            <th scope="col">Before</th>
            <th scope="col">After</th>
            <th scope="col">Notes</th>
          </tr>
        </thead>
        <tbody>
          {plan.changes.map((c) => {
            const included = !c.blocked && !skipped.has(c.key);
            return (
              <tr
                key={c.key}
                className={included ? undefined : 'pipeline-skipped'}
              >
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Include ${c.event.summary ?? 'event'}`}
                    checked={included}
                    disabled={!!c.blocked}
                    onChange={(e) => onSkip(c.key, !e.target.checked)}
                  />
                </td>
                <td>
                  <span className="hint">
                    {verbs[c.kind]} ·{' '}
                    {calendars.get(c.event.calendarId)?.summary}
                  </span>
                  <br />
                  <ViewStartAndEnd start={c.event.start} end={c.event.end} />
                  <br />
                  <RepeatMark event={c.event} />
                  {c.event.summary || '(no title)'}
                </td>
                <td data-label="Before">
                  <Fields values={c.before} />
                </td>
                <td data-label="After">
                  {c.kind === 'delete' ? (
                    <i>deleted</i>
                  ) : (
                    <Fields values={c.after} />
                  )}
                </td>
                <td className="pipeline-notes">
                  {c.blocked && (
                    <div className="date-field-error">{c.blocked}</div>
                  )}
                  {c.warnings.map((w) => (
                    <div key={w} className="hint">
                      {w}
                    </div>
                  ))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
