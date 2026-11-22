import React, { useMemo, useState } from 'react';
import {
  useCalendars,
  useFilteredEvents,
  useSelectedCalendarIds,
} from './lib/hooks';
import { useFilterState, useSeedModFilters } from './lib/FilterStateContext';
import { Calendar, CalendarEvent } from './models/types';
import { keyBy, pick } from './lib/utils';
import { userContext } from './userContext';
import { authContext } from './authContext';
import Filters2 from './Filters2';
import { EventCheckList } from './EventCheckList';
import Calendars from './Calendars';
import { saveEvents } from './google/writes';
import useDefaultCalendar from './lib/useDefaultCalendar';
import { useEventSelection, useMatchingEvents } from './lib/useEventSelection';
import { toast } from 'react-toastify';

/** Private extended properties recording where a copy came from (values must be strings). */
export const COPIED_FROM_ID = '31cal.copiedFromId';
export const COPIED_FROM_CALENDAR = '31cal.copiedFromCalendarId';

const sourceKey = (calendarId: string, id: string) => `${calendarId}/${id}`;

function CopyFrom() {
  const calendars = useCalendars() ?? [];
  const user = React.useContext(userContext);
  const { ensureWriteAccess } = React.useContext(authContext);
  const { modEventFilters: filters, setModEventFilters: setFilters } =
    useFilterState();
  const [selectedCalendarIds, , loaded] = useSelectedCalendarIds();

  // Start from the global filters each time the page opens.
  useSeedModFilters(loaded ? selectedCalendarIds : undefined);

  const allEvents = useFilteredEvents(filters);
  const { events, regexError } = useMatchingEvents(allEvents ?? [], filters);
  const { isChecked, setChecked, toggleAll, selected, replace } =
    useEventSelection(events);
  const calendarsById = useMemo(() => keyBy(calendars, 'id'), [calendars]);

  const [prefix, setPrefix] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const defaultCalendar = useDefaultCalendar();
  const [chosenCalendar, setCopyToCalendar] = useState<Calendar | undefined>();
  // The default loads asynchronously, so fall back to it until the user picks.
  const copyToCalendar = chosenCalendar ?? defaultCalendar;

  /** Sources already copied into the target calendar, to avoid duplicates. */
  // Copies keep their source's times, so the same range covers them.
  const targetFilters = useMemo(
    () => ({
      ...filters,
      showCancelled: false,
      calendarIds: copyToCalendar ? [copyToCalendar.id] : [],
    }),
    [filters, copyToCalendar],
  );
  const targetEvents = useFilteredEvents(targetFilters);
  const alreadyCopied = useMemo(() => {
    const set = new Set<string>();
    for (const e of targetEvents ?? []) {
      const p = e.extendedProperties?.private;
      if (
        e.calendarId === copyToCalendar?.id &&
        e.status !== 'cancelled' &&
        p?.[COPIED_FROM_ID] &&
        p?.[COPIED_FROM_CALENDAR]
      ) {
        set.add(sourceKey(p[COPIED_FROM_CALENDAR], p[COPIED_FROM_ID]));
      }
    }
    return set;
  }, [targetEvents, copyToCalendar?.id]);

  async function copyEvents(calendar: Calendar, toCopy: CalendarEvent[]) {
    if (!(await ensureWriteAccess())) return;

    const fresh = toCopy.filter(
      (e) => !alreadyCopied.has(sourceKey(e.calendarId, e.id)),
    );
    const duplicates = toCopy.length - fresh.length;
    if (duplicates > 0) {
      toast.info(
        `Skipping ${duplicates} event${duplicates === 1 ? '' : 's'} already copied to ${calendar.summary}.`,
      );
    }

    const eventsToSave = fresh.map((e) => ({
      ...pick(
        e,
        'attachments',
        'end',
        'start',
        'description',
        'location',
        'transparency',
      ),
      summary: `${prefix}${e.summary ?? ''}`,
      extendedProperties: {
        private: {
          [COPIED_FROM_ID]: e.id,
          [COPIED_FROM_CALENDAR]: e.calendarId,
        },
      },
    }));

    setBusy(true);
    try {
      const { failed } = await saveEvents(calendar, eventsToSave, {
        account: user?.email,
      });
      // Keep only failures checked so they can be retried.
      const failedIds = new Set(
        failed.map((f) => f.item.extendedProperties?.private?.[COPIED_FROM_ID]),
      );
      replace(fresh.filter((e) => failedIds.has(e.id)));
    } finally {
      setBusy(false);
    }
  }

  const previewEvents = useMemo(
    () => events.map((e) => ({ ...e, summary: `${prefix}${e.summary ?? ''}` })),
    [events, prefix],
  );

  return (
    <div>
      <Filters2 {...{ setFilters, filters }} />
      {regexError && (
        <div role="alert" style={{ color: '#a00' }}>
          Search is not a valid pattern ({regexError}); matching it as plain
          text.
        </div>
      )}
      <label>
        Prefix for copies{' '}
        <input
          type="text"
          value={prefix}
          placeholder={`e.g. ${calendars.find((c) => filters.calendarIds.includes(c.id))?.summary ?? 'Bob'} - `}
          style={{ width: '30em', maxWidth: '100%' }}
          onChange={(e) => setPrefix(e.target.value)}
        />
      </label>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 4,
        }}
      >
        <button
          disabled={busy || selected.length === 0 || !copyToCalendar}
          onClick={() => copyEvents(copyToCalendar!, selected)}
        >
          Copy {selected.length || ''} to:
        </button>
        <div style={{ width: '20em', maxWidth: '100%' }}>
          <Calendars
            options={calendars.filter(
              (c) =>
                !c.accessRole ||
                c.accessRole === 'owner' ||
                c.accessRole === 'writer',
            )}
            value={copyToCalendar ? [copyToCalendar] : []}
            onChange={(e) => setCopyToCalendar(e.at(-1))}
          />
        </div>
        {busy && <span aria-live="polite">Copying…</span>}
      </div>
      {allEvents === undefined ? (
        <p>Loading events…</p>
      ) : (
        <EventCheckList
          calendars={calendarsById}
          events={previewEvents}
          setChecked={setChecked}
          isChecked={isChecked}
          onAllCheckedSelected={toggleAll}
        />
      )}
    </div>
  );
}

export default CopyFrom;
