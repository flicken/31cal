import React, { useState, useEffect, useRef, ChangeEventHandler } from 'react';

import { userContext } from './userContext';

import { Calendar, CalendarEvent } from './models/types';
import { useRecoilValue } from 'recoil';
import { filteredEvents, allCalendars } from './lib/store';
import patchEvents, { EventPatch } from './google/patchEvents';

import { getEvents } from './google/useClientToFetch';

import { ViewStartAndEnd } from './ViewEvent';
import { keyBy } from 'lodash-es';

type Action = {
  name: string;
  Component: (props: {
    events: CalendarEvent[];
    calendars: Calendar[];
  }) => JSX.Element;
};

function ModMany() {
  const calendars = useRecoilValue(allCalendars);
  const events = useRecoilValue(filteredEvents);
  const [eventsToShow, setEventsToShow] = useState(events);
  const user = React.useContext(userContext);

  const [count, setCount] = useState(0);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const replaceRef = useRef<HTMLInputElement | null>(null);
  const attachmentRef = useRef<HTMLInputElement | null>(null);

  const actions: {
    name: string;
    modifyEvents: (events: CalendarEvent[]) => CalendarEvent[];
    component: (props: {
      events: CalendarEvent[];
      calendars: Calendar[];
    }) => JSX.Element;
  }[] = [];

  useEffect(() => {
    const searchText = searchRef.current?.value;
    const replaceText = replaceRef.current?.value;
    const attachmentUrl = attachmentRef.current?.value;

    if (searchText && searchText.length) {
      const searchRegex = new RegExp(searchText, 'i');

      const eventsMatchingSearch = events.filter(
        (e) => !!e.summary?.match(searchRegex),
      );
      const eventsWithPossibleReplacements = eventsMatchingSearch.map((e) => {
        const r = { ...e };

        if (replaceText) {
          r.summary = e.summary?.replace(searchRegex, replaceText);
        }

        if (attachmentUrl) {
          r.attachments = [...r.attachments, { fileUrl: attachmentUrl }];
        }

        return r;
      });
      setEventsToShow(eventsWithPossibleReplacements);
    } else {
      setEventsToShow(events);
    }
  }, [
    events,
    count,
    searchRef.current?.value,
    replaceRef.current?.value,
    attachmentRef.current?.value,
  ]);

  const [checked, setChecked] = useState<Set<string>>(new Set());

  const isChecked = (event: CalendarEvent) => checked.has(keyFor(event));

  async function applyPatches(
    f: (e: CalendarEvent) => Omit<EventPatch, 'eventId' | 'calendarId'>,
  ) {
    const patches = eventsToShow.filter(isChecked).map((e) => ({
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

  function updateFilters() {
    setCount((oldCount) => oldCount + 1);
  }

  return (
    <div>
      <div>
        <input
          ref={searchRef}
          name="search"
          type="text"
          size={80}
          placeholder="Search"
          onChange={(e) => {
            updateFilters();
          }}
        />
      </div>
      <div>
        <input
          ref={replaceRef}
          name="replace"
          type="text"
          size={80}
          placeholder="Replace"
          onChange={(e) => {
            updateFilters();
          }}
        />
      </div>
      <div>
        <input
          ref={attachmentRef}
          name="attachment"
          type="text"
          size={80}
          placeholder="attachment"
          onChange={(e) => {
            updateFilters();
          }}
        />
      </div>

      <div>
        <button
          disabled={
            !replaceRef.current?.value ||
            eventsToShow.length === 0 ||
            checked.size === 0
          }
          onClick={async () => {
            await applyPatches((e) => ({ summary: e.summary }));
          }}
        >
          Modify
        </button>

        <button
          disabled={eventsToShow.length === 0 || checked.size < 1}
          onClick={async () => {
            await applyPatches(() => ({ status: 'cancelled' }));
          }}
        >
          Delete
        </button>
      </div>
      <EventCheckList
        calendars={keyBy(calendars, 'id')}
        events={eventsToShow}
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
          if (eventsToShow.every((e) => checked.has(keyFor(e)))) {
            setChecked(new Set());
          } else {
            setChecked(new Set(eventsToShow.map(keyFor)));
          }
        }}
      />
    </div>
  );
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
