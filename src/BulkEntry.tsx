import React, { useState, useCallback, useEffect } from 'react';

import TextareaAutosize from 'react-textarea-autosize';

import parseEvent from './lib/parseEvent';

import EventList from './EventList';

import { compact, isEmpty } from 'lodash';
import useDefaultCalendar from './lib/useDefaultCalendar';

import saveEvents from './google/saveEvents';

import { ViewAttachment } from './Attachments';

import _ from 'lodash';

const placeholderEntry = 'Saturday 3pm rehearsal\n6pm-9pm concert';

function BulkEntry() {
  const defaultCalendar = useDefaultCalendar();
  const [events, setEvents] = useState<any>([]);
  const [eventsText, setEventsText] = useState('');
  const [description, setDescription] = useState('');
  const [prefix, setPrefix] = useState('');
  const [attachment, setAttachment] = useState(undefined as undefined | string);

  const handleAttachmentChange = useCallback(
    (e) => {
      const value = e.target.value;
      console.log('attachment change', e);
      if (_.isEmpty(_.trim(value))) {
        setAttachment(undefined);
      } else {
        setAttachment({ fileUrl: value });
      }
    },
    [setAttachment],
  );
  const attachmentEl = React.useRef(null);

  const onPaste = useCallback(
    (e) => {
      console.log('onPaste', e);
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target.isContentEditable
      ) {
        return;
      }

      const text = e.clipboardData.getData('text');
      if (!_.isEmpty(text)) {
        attachmentEl.current.value = text;
        setAttachment({ fileUrl: text });
      }
    },
    [setAttachment, attachmentEl],
  );

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
      if (parsed) {
        if (!isEmpty(prefix)) {
          parsed.summary = `${prefix}${parsed.summary}`;
        }
        if (attachment) {
          parsed.attachments = [attachment];
        }
        parsedEvents[i] = parsed;
      }
    });
    setEvents(compact(parsedEvents));
  }, [eventsText, prefix, attachment]);

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
    <div
      onPaste={onPaste}
      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}
    >
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
          name="prefix"
          type="text"
          placeholder="Prefix for all events"
          onChange={handlePrefixChange}
        />
        <EventList events={events} />
        <input
          ref={attachmentEl}
          name="attachment"
          type="text"
          size="80"
          placeholder="Attachment URL"
          onChange={handleAttachmentChange}
        />
        {attachment ? <ViewAttachment attachment={attachment} /> : null}
      </div>
    </div>
  );
}

export default BulkEntry;
