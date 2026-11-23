/**
 * Experimental bulk-edit pipeline: Filter → Select → Act → Preview → Run.
 * The filter lives in the URL, so a view can link here with its filter.
 */
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { userContext } from './userContext';
import { authContext } from './authContext';
import { useCalendars, useSelectedCalendarIds } from './lib/hooks';
import { useFilterState } from './lib/FilterStateContext';
import { useScheduleList } from './lib/useScheduleList';
import { keyFor } from './lib/events';
import { useEmptyState } from './EmptyState';
import ConditionChips from './pipeline/ConditionChips';
import ResultsList from './pipeline/ResultsList';
import Preview from './pipeline/Preview';
import { ACTION_FORMS } from './pipeline/ActionForms';
import {
  ACTIONS,
  ACTION_LIST,
  ActionId,
  CopyParams,
  PlanContext,
} from './pipeline/actions';
import {
  Condition,
  fromSearchParams,
  toSearchParams,
} from './pipeline/filters';
import {
  searchedCalendars,
  useCopiedInto,
  usePipelineEvents,
} from './pipeline/query';
import {
  ALL,
  NONE,
  Selection,
  counts,
  countsText,
  isSelected,
  only,
} from './pipeline/selection';
import { runChanges } from './pipeline/run';

export default function Pipeline() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const conditions = useMemo(
    () => fromSearchParams(new URLSearchParams(search)),
    [search],
  );
  const setConditions = (next: Condition[]) => {
    const qs = toSearchParams(next).toString();
    navigate(`/pipeline${qs ? `?${qs}` : ''}`, { replace: true });
  };

  // First visit without a filter: start from the top bar's date range.
  const { eventFilters } = useFilterState();
  useEffect(() => {
    if (!search)
      setConditions([{ type: 'dates', text: eventFilters.rangeText }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const calendarList = useCalendars();
  const calendars = useMemo(
    () => new Map((calendarList ?? []).map((c) => [c.id, c])),
    [calendarList],
  );
  const [selectedIds, , loaded] = useSelectedCalendarIds();
  const user = useContext(userContext);
  const { ensureWriteAccess } = useContext(authContext);
  const matchCtx = useMemo(() => ({ userEmail: user?.email }), [user?.email]);
  const { list: scheduleList } = useScheduleList();
  const schedules = useMemo(
    () => (scheduleList ?? []).map(String),
    [scheduleList],
  );

  const events = usePipelineEvents(
    conditions,
    loaded ? selectedIds : undefined,
    matchCtx,
  );
  const empty = useEmptyState(
    events,
    searchedCalendars(conditions, selectedIds),
  );

  // ---- Select
  const [selection, setSelection] = useState<Selection>(ALL);
  const [selectedOnly, setSelectedOnly] = useState(false);
  const keys = useMemo(() => (events ?? []).map(keyFor), [events]);
  const count = counts(selection, keys);
  const selectedEvents = useMemo(
    () => (events ?? []).filter((e) => isSelected(selection, keyFor(e))),
    [events, selection],
  );

  // ---- Act
  const [actionId, setActionId] = useState<ActionId>('rename');
  const [paramsById, setParamsById] = useState<
    Partial<Record<ActionId, unknown>>
  >({});
  const baseCtx: PlanContext = useMemo(
    () => ({ calendars, userEmail: user?.email, conditions }),
    [calendars, user?.email, conditions],
  );
  const action = ACTIONS[actionId];
  const params =
    paramsById[actionId] ?? action.defaultParams(baseCtx, selectedEvents);
  const copyTarget =
    actionId === 'copy' ? (params as CopyParams).calendarId : undefined;
  const copied = useCopiedInto(copyTarget);
  const Form = ACTION_FORMS[actionId];

  // ---- Preview
  const plan = useMemo(
    () =>
      action.plan(selectedEvents, params as never, {
        ...baseCtx,
        copiedInto: () => copied ?? new Set(),
      }),
    [action, selectedEvents, params, baseCtx, copied],
  );
  const [skipped, setSkipped] = useState<ReadonlySet<string>>(new Set());
  const runnable = plan.changes.filter(
    (c) => !c.blocked && !skipped.has(c.key),
  );
  const [busy, setBusy] = useState(false);

  const onRun = async () => {
    if (!(await ensureWriteAccess())) return;
    setBusy(true);
    try {
      const failed = await runChanges(runnable, calendars, {
        account: user?.email,
        label: action.verb,
      });
      if (failed.length) setSelection(only(failed));
      setSkipped(new Set());
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pipeline">
      <h1>
        Bulk edit <span className="hint">(experimental)</span>
      </h1>

      <section aria-labelledby="pl-filter">
        <h2 id="pl-filter">1. Filter</h2>
        <ConditionChips
          conditions={conditions}
          onChange={setConditions}
          calendars={calendarList ?? []}
          schedules={schedules}
        />
      </section>

      <section aria-labelledby="pl-select">
        <h2 id="pl-select">2. Select</h2>
        {empty ?? (
          <>
            <div className="pipeline-toolbar">
              <span aria-live="polite">{countsText(count)}</span>{' '}
              <button type="button" onClick={() => setSelection(ALL)}>
                Select all
              </button>{' '}
              <button type="button" onClick={() => setSelection(NONE)}>
                Select none
              </button>{' '}
              <label>
                <input
                  type="checkbox"
                  checked={selectedOnly}
                  onChange={(e) => setSelectedOnly(e.target.checked)}
                />{' '}
                Show selected only
              </label>
              <span className="hint"> Shift-click to select a range.</span>
            </div>
            <ResultsList
              events={selectedOnly ? selectedEvents : (events ?? [])}
              calendars={calendars}
              selection={selection}
              onSelection={setSelection}
            />
          </>
        )}
      </section>

      <section aria-labelledby="pl-act">
        <h2 id="pl-act">3. Action</h2>
        <div role="radiogroup" aria-label="Action" className="pipeline-actions">
          {ACTION_LIST.map((a) => (
            <label key={a.id}>
              <input
                type="radio"
                name="pipeline-action"
                checked={actionId === a.id}
                onChange={() => setActionId(a.id)}
              />{' '}
              {a.label}
            </label>
          ))}
        </div>
        <Form
          params={params}
          onChange={(p: unknown) =>
            setParamsById((m) => ({ ...m, [actionId]: p }))
          }
          calendars={calendarList ?? []}
          onReset={() =>
            setParamsById((m) => ({
              ...m,
              [actionId]: action.defaultParams(baseCtx, selectedEvents),
            }))
          }
        />
      </section>

      <section aria-labelledby="pl-preview">
        <h2 id="pl-preview">4. Preview</h2>
        <p aria-live="polite">
          {runnable.length} change{runnable.length === 1 ? '' : 's'} to make
          {plan.changes.length - runnable.length > 0 &&
            ` · ${plan.changes.length - runnable.length} skipped`}
          {plan.unchanged > 0 && ` · ${plan.unchanged} unchanged`}
        </p>
        <Preview
          plan={plan}
          calendars={calendars}
          skipped={skipped}
          onSkip={(key, skip) =>
            setSkipped((s) => {
              const next = new Set(s);
              if (skip) next.add(key);
              else next.delete(key);
              return next;
            })
          }
        />
        <p>
          <button
            type="button"
            className="primary-button"
            disabled={busy || !!plan.error || runnable.length === 0}
            onClick={onRun}
          >
            {busy
              ? 'Working…'
              : `${action.verb} ${runnable.length} event${runnable.length === 1 ? '' : 's'}`}
          </button>
        </p>
      </section>
    </div>
  );
}
