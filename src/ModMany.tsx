import { useEmptyState } from './EmptyState';
import React, { useState, useMemo } from 'react';

import { userContext } from './userContext';
import { authContext } from './authContext';

import { CalendarEvent } from './models/types';
import {
  useCalendars,
  useFilteredEvents,
  useSelectedCalendarIds,
} from './lib/hooks';
import { useFilterState, useSeedModFilters } from './lib/FilterStateContext';
import { deleteEvents, EventPatch, patchEvents } from './google/writes';

import { keyBy } from './lib/utils';
import BulkFilters from './BulkFilters';
import { toast } from 'react-toastify';
import JsonEditor from './JsonEditor';
import { EventCheckList } from './EventCheckList';
import { useEventSelection, useMatchingEvents } from './lib/useEventSelection';

/** Fields that identify or are derived for an event and must not be bulk-applied. */
const READ_ONLY_FIELDS = [
  'id',
  'calendarId',
  'eventId',
  'iCalUID',
  'recurringEventId',
  'originalStartTime',
  'sequence',
  'created',
  'updated',
  '_schedules',
  'eventType',
  'etag',
  'kind',
  'htmlLink',
  'creator',
  'organizer',
];

function editableJson(event: CalendarEvent) {
  const copy: Record<string, any> = { ...event };
  READ_ONLY_FIELDS.forEach((f) => delete copy[f]);
  for (const k of ['start', 'end']) {
    if (copy[k]) {
      const { ms: _ms, ...rest } = copy[k];
      copy[k] = rest;
    }
  }
  return JSON.stringify(copy, null, 2);
}

function ModMany() {
  const calendars = useCalendars() ?? [];
  const { modEventFilters: filters, setModEventFilters: setFilters } =
    useFilterState();
  const [selectedCalendarIds, , loaded] = useSelectedCalendarIds();
  const user = React.useContext(userContext);
  const { ensureWriteAccess } = React.useContext(authContext);

  // Start from the global filters each time the page opens.
  useSeedModFilters(loaded ? selectedCalendarIds : undefined);

  const allEvents = useFilteredEvents(filters);
  const { events, regexError } = useMatchingEvents(allEvents ?? [], filters);
  const emptyState = useEmptyState(allEvents, filters.calendarIds);
  const { isChecked, setChecked, toggleAll, selected, replace } =
    useEventSelection(events);
  const calendarsById = useMemo(() => keyBy(calendars, 'id'), [calendars]);

  const [busy, setBusy] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [jsonText, setJsonText] = useState('');

  /** Run a write with write access, a busy state, and failed rows left checked. */
  async function run(
    write: () => Promise<{
      failed: { item: { calendarId: string; eventId: string } }[];
    }>,
  ) {
    if (!(await ensureWriteAccess())) return;
    setBusy(true);
    try {
      const { failed } = await write();
      const failedKeys = new Set(
        failed.map(({ item }) => `${item.calendarId}/${item.eventId}`),
      );
      replace(
        selected.filter((e) => failedKeys.has(`${e.calendarId}/${e.id}`)),
      );
    } finally {
      setBusy(false);
    }
  }

  const patchSelected = (
    f: (e: CalendarEvent) => Omit<EventPatch, 'eventId' | 'calendarId'>,
  ) =>
    run(() =>
      patchEvents(
        selected.map((e) => ({
          ...f(e),
          eventId: e.id,
          calendarId: e.calendarId,
        })),
        user?.email,
      ),
    );

  const onDelete = () => {
    const calendarCount = new Set(selected.map((e) => e.calendarId)).size;
    if (
      !window.confirm(
        `Delete ${selected.length} event${selected.length === 1 ? '' : 's'} from ${calendarCount} calendar${calendarCount === 1 ? '' : 's'}? This cannot be undone here.`,
      )
    )
      return;
    run(() =>
      deleteEvents(
        selected.map((e) => ({
          eventId: e.id,
          calendarId: e.calendarId,
          summary: e.summary,
        })),
        user?.email,
      ),
    );
  };

  const onSaveJson = () => {
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(jsonText);
    } catch (e) {
      toast.error(`The JSON is not valid: ${(e as Error).message}`);
      return;
    }
    if (
      selected.length > 1 &&
      ('start' in json || 'end' in json) &&
      !window.confirm(
        `This sets the same start and end time on all ${selected.length} selected events. Continue?`,
      )
    )
      return;
    READ_ONLY_FIELDS.forEach((f) => delete json[f]);
    setShowEditor(false);
    patchSelected(() => json);
  };

  const nothingSelected = selected.length === 0;

  return (
    <div>
      <BulkFilters {...{ setFilters, filters }} />
      {regexError && (
        <div role="alert" style={{ color: '#a00' }}>
          Search is not a valid pattern ({regexError}); matching it as plain
          text.
        </div>
      )}
      <div>
        <label>
          Replace matches with{' '}
          <input
            name="replace"
            type="text"
            size={60}
            style={{ maxWidth: '100%' }}
            value={filters.replaceText ?? ''}
            onChange={(e) => {
              setFilters((f) => ({ ...f, replaceText: e.target.value }));
            }}
          />
        </label>
      </div>

      <div>
        <button
          disabled={busy || !filters.replaceText || nothingSelected}
          onClick={() => patchSelected((e) => ({ summary: e.summary }))}
        >
          Rename {selected.length || ''}
        </button>{' '}
        <button disabled={busy || nothingSelected} onClick={onDelete}>
          Delete {selected.length || ''}
        </button>{' '}
        <button
          disabled={busy || nothingSelected}
          onClick={() => {
            if (!showEditor) setJsonText(editableJson(selected[0]));
            setShowEditor((show) => !show);
          }}
        >
          Edit JSON
        </button>
        {showEditor && (
          <button disabled={busy || nothingSelected} onClick={onSaveJson}>
            Apply JSON to {selected.length}
          </button>
        )}
        {busy && <span aria-live="polite"> Working…</span>}
      </div>
      {showEditor && <JsonEditor value={jsonText} onChange={setJsonText} />}
      {emptyState ?? (
        <EventCheckList
          calendars={calendarsById}
          events={events}
          setChecked={setChecked}
          isChecked={isChecked}
          onAllCheckedSelected={toggleAll}
        />
      )}
    </div>
  );
}

export default ModMany;
