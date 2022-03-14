import React, { useState, useCallback, useEffect } from 'react';

import TextareaAutosize from 'react-textarea-autosize';

import parseEvent from './lib/parseEvent';

import ViewEvent from './ViewEvent';

import { compact, isEmpty } from 'lodash';
import useDefaultCalendar from './lib/useDefaultCalendar';

import saveEvents from './google/saveEvents';

const placeholderEntry = 'Saturday 3pm rehearsal\n6pm-9pm concert';

function BulkEntry() {
  const defaultCalendar = useDefaultCalendar();
  const [events, setEvents] = useState<any>([]);
  const [eventsText, setEventsText] = useState('');
  const [description, setDescription] = useState('');
  const [prefix, setPrefix] = useState('');

  const handlePrefixChange = useCallback(
    (e) => {
      setPrefix(e.target.value);
    },
    [setPrefix],
  );

  const handleEventsChange = useCallback(
    (e) => {
      setEventsText(e.target.value);
    },
    [setEventsText],
  );

  useEffect(() => {
    const lines = eventsText.match(/[^\r\n]+/g);
    const parsedEvents = new Array(lines?.length || 0);
    lines?.forEach((line: string, i: number) => {
      const parsed = parseEvent(line, compact(parsedEvents));
      console.log('prefix', prefix);
      if (parsed && !isEmpty(prefix)) {
        parsed.summary = `${prefix}${parsed.summary}`;
      }
      parsedEvents[i] = parsed;
    });
    setEvents(compact(parsedEvents));
  }, [eventsText, prefix]);

  const handleSaveEvents = useCallback(async () => {
    saveEvents(defaultCalendar, events, description);
  }, [defaultCalendar, events, description]);

  let saveButton = <button disabled>Set default calendar first</button>;
  if (isEmpty(events)) {
    saveButton = <button disabled>Enter events first</button>;
  } else if (defaultCalendar) {
    saveButton = (
      <button
        onClick={handleSaveEvents}
        disabled={!(events?.length > 0)}
        title={defaultCalendar?.id}
      >
        Save events to {defaultCalendar?.summary}
      </button>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      <div>
        <TextareaAutosize
          name="events"
          minRows={5}
          style={{ width: '40em' }}
          placeholder={placeholderEntry}
          onChange={handleEventsChange}
        />
        <br />
        <TextareaAutosize
          name="description"
          minRows={5}
          style={{ width: '40em' }}
          placeholder="Description for all events"
          onChange={(e) => setDescription(e.target.value)}
        />
        <br />
        {saveButton}
      </div>
      <div>
        <input
          type="text"
          placeholder="Prefix for all events"
          onChange={handlePrefixChange}
        />
        {events.map((event: any, i: number) => (
          <ViewEvent key={i} event={event} />
        ))}
      </div>
    </div>
  );
}

export default BulkEntry;
