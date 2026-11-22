import { debug } from './lib/log';
import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  ClipboardEvent,
} from 'react';
import { setUnsavedWork } from './lib/newVersion';

import TextareaAutosize from 'react-textarea-autosize';

import parseEvent from './lib/parseEvent';

import EventList from './EventList';

import { isEmpty } from './lib/utils';
import { useDefaultCalendar } from './lib/hooks';

import { saveEvents } from './google/writes';
import { Link } from 'wouter';
import { userContext } from './userContext';
import { authContext } from './authContext';

import { Attachment } from './models/types';
import { ViewAttachment } from './ViewAttachment';
import { toast } from 'react-toastify';

const placeholderEntry = 'Saturday 3pm rehearsal\n6pm-9pm concert';

function BulkEntry() {
  const defaultCalendar = useDefaultCalendar();
  const [eventsText, setEventsText] = useState('');
  // Don't auto-reload for a new version while there's typed text.
  useEffect(() => {
    setUnsavedWork(eventsText.trim() !== '');
    return () => setUnsavedWork(false);
  }, [eventsText]);
  const [description, setDescription] = useState('');
  const [prefix, setPrefix] = useState('');
  const [attachment, setAttachment] = useState(
    undefined as undefined | Attachment,
  );
  const user = React.useContext(userContext);
  const { ensureWriteAccess } = React.useContext(authContext);
  const [busy, setBusy] = useState(false);

  const handleAttachmentChange = useCallback(
    (
      e: React.FormEvent<HTMLInputElement> & {
        target: HTMLInputElement;
      },
    ) => {
      const value = e.target.value;
      debug('attachment change', e);
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
      debug('onPaste', e);
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

  const events = useMemo(() => {
    const lines = eventsText.match(/[^\r\n]+/g);
    const parsedEvents = new Array(lines?.length || 0);
    lines?.forEach((line: string, i: number) => {
      const parsed = parseEvent(line, parsedEvents.filter(Boolean));
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
    return parsedEvents.filter(Boolean);
  }, [eventsText, prefix, attachment]);

  const handleSaveEvents = useCallback(async () => {
    if (!user?.email) {
      toast('Sign in with Google to save events.');
      return;
    }
    if (!(await ensureWriteAccess())) return;
    setBusy(true);
    try {
      await saveEvents(defaultCalendar!, events, {
        description,
        account: user.email,
      });
    } finally {
      setBusy(false);
    }
  }, [defaultCalendar, events, description, user, ensureWriteAccess]);

  let saveButton = (
    <span>
      <button disabled>Save</button> Choose a calendar in the calendar picker
      above (or on the <Link href="/status">status</Link> page); the first
      selected calendar is where new events are saved.
    </span>
  );
  if (isEmpty(events)) {
    saveButton = <button disabled>Enter events first</button>;
  } else if (defaultCalendar) {
    saveButton = (
      <button
        onClick={handleSaveEvents}
        disabled={busy || !(events?.length > 0)}
        title={defaultCalendar?.id}
      >
        Save events to {defaultCalendar?.summary}
      </button>
    );
  }

  return (
    <div onPaste={onPaste} className="two-column">
      <div>
        <TextareaAutosize
          name="events"
          minRows={5}
          style={{ width: '40em', maxWidth: '100%' }}
          placeholder={placeholderEntry}
          aria-label="Events, one per line (e.g. Saturday 3pm rehearsal)"
          onChange={handleEventsChange}
        />
        <br />
        <TextareaAutosize
          name="description"
          minRows={5}
          style={{ width: '40em', maxWidth: '100%' }}
          placeholder="Description for all events"
          aria-label="Description for all events"
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
          aria-label="Prefix for all event titles"
          onChange={handlePrefixChange}
        />
        <EventList events={events} />
        <input
          ref={attachmentEl}
          name="attachment"
          type="text"
          size={80}
          placeholder="Attachment URL"
          aria-label="Attachment URL for all events"
          onChange={handleAttachmentChange}
        />
        {attachment ? <ViewAttachment attachment={attachment} /> : null}
      </div>
    </div>
  );
}

export default BulkEntry;
