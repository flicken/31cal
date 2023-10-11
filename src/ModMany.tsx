import React, {
  useState,
  useCallback,
  useEffect,
  ClipboardEvent,
  useRef,
} from 'react';

import TextareaAutosize from 'react-textarea-autosize';

import parseEvent from './lib/parseEvent';

import EventList from './EventList';

import { compact, isEmpty, pick, trim } from 'lodash-es';
import useDefaultCalendar from './lib/useDefaultCalendar';

import saveEvents from './google/saveEvents';
import { userContext } from './userContext';

import { Attachment } from './models/types';
import { ViewAttachment } from './Attachments';
import { useRecoilValue } from 'recoil';
import { filteredEvents } from './lib/store';
import patchEvents, { EventPatch } from './google/patchEvents';

const placeholderEntry = 'Saturday 3pm rehearsal\n6pm-9pm concert';

function ModMany() {
  const defaultCalendar = useDefaultCalendar();
  const events = useRecoilValue(filteredEvents);
  const [eventsToShow, setEventsToShow] = useState(events);
  const user = React.useContext(userContext);

  const searchRef = useRef<HTMLInputElement | null>(null);
  const replaceRef = useRef<HTMLInputElement | null>(null);

  function updateFilters() {
    const searchText = searchRef.current?.value;
    const replaceText = replaceRef.current?.value;

    if (searchText && searchText.length) {
      const searchRegex = new RegExp(searchText, 'i');

      const eventsMatchingSearch = events.filter(
        (e) => !!e.summary?.match(searchRegex),
      );
      const eventsWithPossibleReplacements = replaceText
        ? eventsMatchingSearch.map((e) => ({
            ...e,
            summary: e.summary?.replace(searchRegex, replaceText),
          }))
        : eventsMatchingSearch;
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
            console.log(e);
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
            console.log(e);
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
