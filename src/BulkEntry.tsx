import React, { useState, useCallback, useEffect, ClipboardEvent } from 'react';

import TextareaAutosize from 'react-textarea-autosize';

import parseEvent from './lib/parseEvent';

import EventList from './EventList';

import { isEmpty } from './lib/utils';
import useDefaultCalendar from './lib/useDefaultCalendar';

import saveEvents from './google/saveEvents';
import { userContext } from './userContext';
import { authContext } from './authContext';

import { Attachment } from './models/types';
import { ViewAttachment } from './Attachments';
import { toast } from 'react-toastify';

const placeholderEntry = 'Saturday 3pm rehearsal\n6pm-9pm concert';

function BulkEntry() {
  const defaultCalendar = useDefaultCalendar();
  const [events, setEvents] = useState<any>([]);
  const [eventsText, setEventsText] = useState('');
  const [description, setDescription] = useState('');
  const [prefix, setPrefix] = useState('');
  const [attachment, setAttachment] = useState(
    undefined as undefined | Attachment,
  );
  const user = React.useContext(userContext);
  const { hasWriteAccess, requestWriteAccess } = React.useContext(authContext);

  const handleAttachmentChange = useCallback(
    (
      e: React.FormEvent<HTMLInputElement> & {
        target: HTMLInputElement;
      },
    ) => {
      const value = e.target.value;
      console.log('attachment change', e);
      if (isEmpty(value.trim())) {
        setAttachment(undefined);
      } else {
        setAttachment({ fileUrl: value });
      }
    },
    [setAttachment],
  );
  const attachmentEl = React.useRef<HTMLInputElement>(null);

  const onPaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      console.log('onPaste', e);
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      const text = e.clipboardData.getData('text');
      if (!isEmpty(text) && attachmentEl.current) {
        attachmentEl.current.value = text;
        setAttachment({ fileUrl: text });
      }
    },
    [setAttachment, attachmentEl],
  );

  const handlePrefixChange = useCallback(
    (
      e: React.FormEvent<HTMLInputElement> & {
        target: HTMLInputElement;
      },
    ) => {
      setPrefix(e.target.value);
    },
    [setPrefix],
  );

  const handleEventsChange = useCallback(
    (
      e: React.FormEvent<HTMLTextAreaElement> & {
        target: HTMLTextAreaElement;
      },
    ) => {
      setEventsText(e.target.value);
    },
    [setEventsText],
  );

  useEffect(() => {
    const lines = eventsText.match(/[^\r\n]+/g);
    const parsedEvents = new Array(lines?.length || 0);
    lines?.forEach((line: string, i: number) => {
      const parsed = parseEvent(line, parsedEvents.filter(Boolean));
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
    setEvents(parsedEvents.filter(Boolean));
  }, [eventsText, prefix, attachment]);

  const handleSaveEvents = useCallback(async () => {
    if (!user?.email) {
      toast(`Must be logged in to save. ${JSON.stringify(user)}`);
      return;
    }

    if (!hasWriteAccess) {
      toast('Write permission needed. Please grant access in the popup.');
      await requestWriteAccess();
    }

    await saveEvents(defaultCalendar!, events, description, user);
  }, [defaultCalendar, events, description, user, hasWriteAccess, requestWriteAccess]);

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
          size={80}
          placeholder="Attachment URL"
          onChange={handleAttachmentChange}
        />
        {attachment ? <ViewAttachment attachment={attachment} /> : null}
      </div>
    </div>
  );
}

export default BulkEntry;
