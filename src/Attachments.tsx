import React, { useCallback, useEffect, useState } from 'react';

import { useRecoilValue } from 'recoil';
import {
  filteredEvents,
  allEventFilters,
  allEvents as allEventsState,
} from './lib/store';

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
  if (url.startsWith('?')) {
    const maybeUrl = `http://mail.google.com/?${url.replace(/.*\?/, '')}`;
    return (
      <div>
        Cannot show Gmail attachment <a href={maybeUrl}>{url}</a>
      </div>
    );
  }
  if (url.startsWith('https://mail.google.com')) {
    return (
      <div>
        Cannot show Gmail attachment <a href={url}>{url}</a>
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

function ViewAttachment({ attachment }: { attachment: Attachment }) {
  return (
    <div>
      <h1>{attachment.title}</h1>
      <ViewAttachmentInner url={attachment.fileUrl} />
    </div>
  );
}

function Attachments() {
  const allEvents = useRecoilValue(allEventsState);

  const eventsWithAttachments = allEvents.filter((e) => e.attachments);
  const attachments = eventsWithAttachments.flatMap((e) => e.attachments);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      {eventsWithAttachments.map((e) => (
        <>
          <div>
            <EventList events={[e]} />
          </div>
          <div>
            {e.attachments.map((a) => (
              <ViewAttachment attachment={a} />
            ))}
          </div>
        </>
      ))}
    </div>
  );
}

export default Attachments;
