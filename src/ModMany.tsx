import React, { useState, useEffect, useMemo } from 'react';

import { userContext } from './userContext';
import { authContext } from './authContext';

import TextareaAutosize from 'react-textarea-autosize';

import { Calendar, CalendarEvent } from './models/types';
import { useCalendars, useEvents, useSelectedCalendarIds } from './lib/hooks';
import { useFilterState } from './lib/FilterStateContext';
import { asArray } from './utils';
import patchEvents, { EventPatch } from './google/patchEvents';

import { getEvents } from './google/useClientToFetch';

import { ViewStartAndEnd } from './ViewEvent';
import { omit } from 'lodash-es';
import { keyBy, sortBy } from './lib/utils';
import Filters2 from './Filters2';
import { FilterInputs, FilterValues, filterForFilters } from './lib/filters';
import { DateTime } from 'luxon';
import { toast } from 'react-toastify';
import JsonEditor from './JsonEditor';
import { EventCheckList } from './EventCheckList';
import { keyFor } from './lib/events';

type Action = {
  name: string;
  Component: (props: {
    events: CalendarEvent[];
    calendars: Calendar[];
  }) => JSX.Element;
};

function ModMany() {
  const calendars = useCalendars();
  const allEventsArray = useEvents();
  const { eventFilters, modEventFilters: filters, setModEventFilters: setFilters, modEventMods: mods, setModEventMods: setMods } = useFilterState();
  const [selectedCalendarIds] = useSelectedCalendarIds();

  const globalFilters = useMemo(
    () => ({ ...eventFilters, calendarIds: asArray(selectedCalendarIds) }),
    [eventFilters, selectedCalendarIds],
  );

  const events = useMemo(() => {
    const filter = filterForFilters(filters);
    const searchRegex = new RegExp(filters.searchText ?? '', 'i');
    const searchFilter = filters.searchText
      ? (e: CalendarEvent) => !!e.summary?.match(searchRegex)
      : () => true;
    const modifications = filters.replaceText
      ? (e: CalendarEvent) => {
          return {
            ...e,
            summary: e.summary?.replace(searchRegex, filters.replaceText!),
          };
        }
      : (e: CalendarEvent) => e;
    return sortBy(
      allEventsArray.filter(filter).filter(searchFilter).map(modifications),
      (e) => [e.start.ms, e.end?.ms],
    );
  }, [allEventsArray, filters]);

  const [showEditor, setShowEditor] = useState(false);
  const [jsonText, setJsonText] = useState('');

  try {
    useEffect(() => {
      // default to global filters
      setFilters(globalFilters);
    }, []);

    const user = React.useContext(userContext);
    const { hasWriteAccess, requestWriteAccess } = React.useContext(authContext);

    const [checked, setChecked] = useState<Set<string>>(new Set());

    const isChecked = (event: CalendarEvent) => checked.has(keyFor(event));

    async function applyPatches(
      f: (e: CalendarEvent) => Omit<EventPatch, 'eventId' | 'calendarId'>,
    ) {
      if (!hasWriteAccess) {
        toast('Write permission needed. Please grant access in the popup.');
        await requestWriteAccess();
      }

      const patches = events.filter(isChecked).map((e) => ({
        eventId: e.id,
        calendarId: e.calendarId,
        ...f(e),
      }));
      console.log(patches);
      await patchEvents(patches);

      const calendarIds = new Set(patches.map((p) => p.calendarId));
      await getEvents(
        user,
        calendars.filter((c) => calendarIds.has(c.id)),
      );
    }

    return (
      <div>
        <div>
          <Filters2 {...{ setFilters, filters }} />
        </div>
        <div>
          <input
            name="replace"
            type="text"
            size={80}
            placeholder="Replace"
            onChange={(e) => {
              setFilters((f) => ({ ...f, replaceText: e.target.value }));
            }}
          />
        </div>

        <div>
          <button
            disabled={
              !filters.replaceText || events.length === 0 || checked.size === 0
            }
            onClick={async () => {
              await applyPatches((e) => ({ summary: e.summary }));
            }}
          >
            Modify
          </button>

          <button
            disabled={events.length === 0 || checked.size < 1}
            onClick={async () => {
              await applyPatches(() => ({ status: 'cancelled' }));
            }}
          >
            Delete
          </button>
          <button
            disabled={events.length === 0 || checked.size < 1}
            onClick={() => {
              setShowEditor((show) => !show);
              const firstEvent = events.find(isChecked)!;
              setJsonText(
                JSON.stringify(
                  omit(
                    firstEvent as any,
                    'id',
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
                    'start.ms',
                    'end.ms',
                    'htmlLink',
                  ),
                  null,
                  2,
                ),
              );
            }}
          >
            JSON
          </button>
          {showEditor ? (
            <button
              disabled={events.length === 0 || checked.size < 1}
              onClick={() => {
                const json = JSON.parse(jsonText);

                applyPatches((e) => json);

                setShowEditor((show) => !show);
              }}
            >
              Save
            </button>
          ) : null}
        </div>
        {showEditor ? (
          <div>
            <JsonEditor value={jsonText} onChange={setJsonText} />
          </div>
        ) : null}
        <EventCheckList
          calendars={keyBy(calendars, 'id')}
          events={events}
          setChecked={(event, checked) => {
            setChecked((oldChecked) => {
              const newChecked = new Set(oldChecked);
              if (checked) {
                newChecked.add(keyFor(event));
              } else {
                newChecked.delete(keyFor(event));
              }
              return newChecked;
            });
          }}
          isChecked={isChecked}
          onAllCheckedSelected={() => {
            if (events.every((e) => checked.has(keyFor(e)))) {
              setChecked(new Set());
            } else {
              setChecked(new Set(events.map(keyFor)));
            }
          }}
        />
      </div>
    );
  } catch (e: any) {
    console.log(e);
    return (
      <div>
        Error {e.message} <pre>{JSON.stringify(e)}</pre>
      </div>
    );
  }
}

export default ModMany;
