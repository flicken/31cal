import React, {
  useState,
  useCallback,
  useEffect,
  ClipboardEvent,
  useRef,
} from 'react';

import EventList from './EventList';

import saveEvents from './google/saveEvents';
import { userContext } from './userContext';

import { Attachment } from './models/types';
import { ViewAttachment } from './Attachments';
import { useRecoilValue } from 'recoil';
import { filteredEvents, allCalendars } from './lib/store';
import patchEvents, { EventPatch } from './google/patchEvents';

import { getEvents } from './google/useClientToFetch';

const placeholderEntry = 'Saturday 3pm rehearsal\n6pm-9pm concert';

function ModMany() {
  const calendars = useRecoilValue(allCalendars);
  const events = useRecoilValue(filteredEvents);
  const [eventsToShow, setEventsToShow] = useState(events);
  const user = React.useContext(userContext);

  const searchRef = useRef<HTMLInputElement | null>(null);
  const replaceRef = useRef<HTMLInputElement | null>(null);
  const attachmentRef = useRef<HTMLInputElement | null>(null);

  function updateFilters() {
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
  }

  useEffect(() => {}, [searchRef.current?.value, replaceRef.current?.value]);

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
          disabled={!replaceRef.current?.value || eventsToShow.length === 0}
          onClick={async () => {
            const patches: EventPatch[] = eventsToShow.map((e) => ({
              eventId: e.id,
              calendarId: e.calendarId,
              summary: e.summary,
            }));
            console.log(patches);
            await patchEvents(patches);
            const calendarIds = new Set(patches.map((p) => p.calendarId));
            await getEvents(
              user.user,
              calendars.filter((c) => calendarIds.has(c.id)),
            );
          }}
        >
          Modify {eventsToShow.length} events
        </button>
      </div>
      <EventList events={eventsToShow} />
    </div>
  );
}

export default ModMany;
