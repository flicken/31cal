import React, { useState, useEffect, useRef, ChangeEventHandler } from 'react';

import { userContext } from './userContext';

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

type Action = {
  name: string;
  Component: (props: {
    events: CalendarEvent[];
    calendars: Calendar[];
  }) => JSX.Element;
};

const modEventFilters = atom<FilterValues & FilterInputs>({
  key: 'modEventFilters',
  default: {
    start: DateTime.now(),
    end: DateTime.now().plus({ months: 1 }).endOf('month'),
    showCancelled: false,
    calendarIds: [],
    rangeText: 'now to end of next month',
  },
});

const modFilteredEvents = selector({
  key: 'modFilteredEvents',
  get: ({ get }) => {
    const filters = get(modEventFilters);
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

  try {
    const globalFilters = useRecoilValue(allEventFilters);
    const [filters, setFilters] = useRecoilState(modEventFilters);

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

    console.log('Filters', filters);
    console.log('Events count', events.length);

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
        </div>
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

function EventCheckList({
  events,
  setChecked,
  isChecked,
  onAllCheckedSelected,
  calendars,
}: {
  events: CalendarEvent[];
  calendars: Record<string, Calendar>;
  setChecked: (event: CalendarEvent, checked: boolean) => void;
  isChecked: (event: CalendarEvent) => boolean;
  onAllCheckedSelected: () => void;
}) {
  if (!events) {
    return null;
  }

  const allChecked = events.length > 0 && events.every(isChecked);

  return (
    <div>
      <input
        type="checkbox"
        checked={allChecked}
        onChange={() => {
          onAllCheckedSelected();
        }}
      />
      {events.map((e, i) => {
        const checked = isChecked(e);
        return (
          <>
            <ViewCheckEvent
              key={keyFor(e)}
              event={e}
              calendar={calendars[e.calendarId]}
              checked={checked}
              onChange={() => {
                setChecked(e, !checked);
              }}
            />
          </>
        );
      })}
    </div>
  );
}

export function keyFor(event: CalendarEvent) {
  return `${event.calendarId}/${event.id}`;
}

function ViewCheckEvent({
  calendar,
  event,
  checked,
  onChange,
}: {
  calendar: Calendar;
  event: Partial<CalendarEvent>;
  checked: boolean;
  onChange: ChangeEventHandler;
}) {
  return (
    <div
      style={{ border: '2px dotted #bbb, padding: ', padding: '.5rem 1rem' }}
    >
      <span
        style={{
          color: calendar.foregroundColor,
          backgroundColor: calendar.backgroundColor,
        }}
      >
        &nbsp;
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <ViewStartAndEnd start={event.start} end={event.end} />{' '}
      <b style={{ display: 'inline' }}>{event.summary}</b>
    </div>
  );
}

export default ModMany;
