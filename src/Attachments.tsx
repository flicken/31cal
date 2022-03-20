import React, { useCallback, useEffect, useState } from 'react';

import { useRecoilValue } from 'recoil';
import { filteredEvents } from './lib/store';

import { db } from './models/db';
import { Attachment } from './models/types';
import { useLiveQuery } from 'dexie-react-hooks';

import useDefaultCalendar from './lib/useDefaultCalendar';
import { useScheduleList, eventSchedules } from './lib/useScheduleList';
import { useSetting } from './lib/settings';
import EventList from './EventList';

import { DateTime } from 'luxon';
import _ from 'lodash';

function ViewAttachmentInner({ url }: { url: string }) {
  const [showAnyway, setShowAnyway] = useState(false);
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
        Unlikely to be able to Gmail attachment <a href={maybeUrl}>{url}</a>,{' '}
        {viewShowAnyway}?
      </div>
    );
  }
  if (url.startsWith('https://mail.google.com') && !showAnyway) {
    return (
      <div>
        Unlikely to be able to Gmail attachment <a href={url}>{url}</a>,{' '}
        {viewShowAnyway}?
      </div>
    );
  }
  return (
    <iframe
      style={{ width: '50vw', height: '50vw' }}
      allowFullScreen={true}
      src={url.replaceAll('view', 'preview')}
    />
  );
}

export function ViewAttachment({ attachment }: { attachment: Attachment }) {
  return (
    <div>
      <h1>{attachment.title}</h1>
      <ViewAttachmentInner url={attachment.fileUrl} />
    </div>
  );
}

function Attachments() {
  const events = useRecoilValue(filteredEvents);
  const eventsWithAttachments = events.filter((e) => e.attachments);

  return (
    <>
      <div>
        Showing {eventsWithAttachments.length} events with{' '}
        {eventsWithAttachments.flatMap((e) => e.attachments).length}{' '}
        attachments.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        {eventsWithAttachments.map((e) => (
          <>
            <div>
              <EventList events={[e]} />
            </div>
            <div>
              {e.attachments.map((a, i) => (
                <ViewAttachment key={i} attachment={a} />
              ))}
            </div>
          </>
        ))}
      </div>
    </>
  );
}

export default Attachments;
