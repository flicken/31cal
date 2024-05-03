import React, { useState, useEffect, ChangeEventHandler } from 'react';

import { userContext } from './userContext';

import TextareaAutosize from 'react-textarea-autosize';

import { Calendar, CalendarEvent } from './models/types';
import { atom, selector, useRecoilState, useRecoilValue } from 'recoil';
import { allCalendars, allEvents, allEventFilters } from './lib/store';
import patchEvents, { EventPatch } from './google/patchEvents';

import { getEvents } from './google/useClientToFetch';

import { ViewStartAndEnd } from './ViewEvent';
import { keyBy, sortBy } from 'lodash-es';
import Filters2 from './Filters2';
import _ from 'lodash';
import { FilterInputs, FilterValues, filterForFilters } from './lib/filters';
import { DateTime } from 'luxon';
import VanillaJSONEditor from './VanillaJSONEditor';
import { Mode, Content } from 'vanilla-jsoneditor';
import { EventCheckList } from './EventCheckList';
import { keyFor } from './lib/events';

type Action = {
  name: string;
  Component: (props: {
    events: CalendarEvent[];
    calendars: Calendar[];
  }) => JSX.Element;
};

export const modEventFilters = atom<FilterValues & FilterInputs>({
  key: 'modEventFilters',
  default: {
    start: DateTime.now(),
    end: DateTime.now().plus({ months: 1 }).endOf('month'),
    showCancelled: false,
    calendarIds: [],
    rangeText: 'now to end of next month',
  },
});

export const modEventMods = atom<Partial<CalendarEvent>>({
  key: 'modEventMods',
  default: {},
});

export const modFilteredEvents = selector({
  key: 'modFilteredEvents',
  get: ({ get }) => {
    const filters = get(modEventFilters);
    const mods = get(modEventMods);
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
    const events = get(allEvents)
      .filter(filter)
      .filter(searchFilter)
      .map(modifications);
    return sortBy(events, (e) => [e.start.ms, e.end?.ms]);
  },
});

function ModMany() {
  const calendars = useRecoilValue(allCalendars);
  const events = useRecoilValue(modFilteredEvents);
  const [showEditor, setShowEditor] = useState(false);
  const [content, setContent] = useState<Content>({
    json: null,
  });

  try {
    const globalFilters = useRecoilValue(allEventFilters);
    const [filters, setFilters] = useRecoilState(modEventFilters);
    const [mods, setMods] = useRecoilState(modEventMods);

    useEffect(() => {
      // default to global filters
      setFilters(globalFilters);
    }, []);

    const user = React.useContext(userContext);

    const actions: {
      name: string;
      modifyEvents: (events: CalendarEvent[]) => CalendarEvent[];
      component: (props: {
        events: CalendarEvent[];
        calendars: Calendar[];
      }) => JSX.Element;
    }[] = [];

    const [checked, setChecked] = useState<Set<string>>(new Set());

    const isChecked = (event: CalendarEvent) => checked.has(keyFor(event));

    async function applyPatches(
      f: (e: CalendarEvent) => Omit<EventPatch, 'eventId' | 'calendarId'>,
    ) {
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
              setContent({
                json: _.omit(
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
              });
            }}
          >
            JSON
          </button>
          {showEditor ? (
            <button
              disabled={events.length === 0 || checked.size < 1}
              onClick={() => {
                const json =
                  'json' in content ? content.json : JSON.parse(content.text);

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
            <VanillaJSONEditor
              defaultMode={Mode.text}
              content={content}
              onChange={setContent}
            />
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
