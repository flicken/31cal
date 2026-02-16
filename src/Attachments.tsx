import React, { useMemo } from 'react';

import { useFilterState } from './lib/FilterStateContext';
import { useFilteredEvents, useSelectedCalendarIds } from './lib/hooks';
import { asArray } from './utils';

import { db } from './models/db';
import { Attachment } from './models/types';
import { useLiveQuery } from 'dexie-react-hooks';

import useDefaultCalendar from './lib/useDefaultCalendar';
import { useScheduleList, eventSchedules } from './lib/useScheduleList';
import { useSetting } from './lib/settings';
import EventList from './EventList';

import { DateTime } from 'luxon';

function ViewAttachmentInner({ url }: { url: string }) {
  const [showAnyway, setShowAnyway] = React.useState(false);
  const viewShowAnyway = (
    <a
      style={{ cursor: 'pointer' }}
      onClick={(e) => {
        setShowAnyway(true);
        e.preventDefault();
      }}
    >
      show anyway
    </a>
  );
  if (url.startsWith('?') && !showAnyway) {
    const maybeUrl = `http://mail.google.com/?${url.replace(/.*\?/, '')}`;
    return (
      <div>
        Unlikely to be able to view Gmail attachment{' '}
        <a href={maybeUrl}>{url}</a>, {viewShowAnyway}?
      </div>
    );
  }
  if (url.startsWith('https://mail.google.com') && !showAnyway) {
    return (
      <div>
        Unlikely to be able to view Gmail attachment <a href={url}>{url}</a>,{' '}
        {viewShowAnyway}?
      </div>
    );
  }
  return (
    <iframe
      style={{ width: '50vw', height: '50vw' }}
      allowFullScreen={true}
      src={url.replaceAll('view', 'preview')}
      loading="lazy"
    />
  );
}

export function ViewAttachment({ attachment }: { attachment: Attachment }) {
  return (
    <div>
      {attachment.title ? <h1>{attachment.title}</h1> : undefined}
      <ViewAttachmentInner url={attachment.fileUrl} />
    </div>
  );
}

function Attachments() {
  const { eventFilters } = useFilterState();
  const [selectedCalendarIds] = useSelectedCalendarIds();

  const filters = useMemo(
    () => ({ ...eventFilters, calendarIds: asArray(selectedCalendarIds) }),
    [eventFilters, selectedCalendarIds],
  );

  const events = useFilteredEvents(filters);
  if (!events) return null;
  const eventsWithAttachments = events.filter((e) => e.attachments);
  const attachmentUrl2Events = new Map();
  eventsWithAttachments.forEach((e) => {
    e.attachments.forEach((a) => {
      let events = attachmentUrl2Events.get(a.fileUrl);
      if (!events) {
        events = [];
        attachmentUrl2Events.set(a.fileUrl, events);
      }
      events.push(e);
    });
  });

  return (
    <>
      <div>
        Showing {attachmentUrl2Events.size} attachments with{' '}
        {eventsWithAttachments.length} events.
      </div>
      <div>
        {Array.from(attachmentUrl2Events).map(([attachmentUrl, events]) => (
          <div
            key={attachmentUrl}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}
          >
            <div>
              <EventList events={events} />
            </div>
            <div>
              <ViewAttachment
                key={attachmentUrl}
                attachment={{ fileUrl: attachmentUrl }}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default Attachments;
