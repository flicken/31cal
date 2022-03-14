import React, { useCallback, useEffect, useState } from 'react';

import { db } from './models/db';
import { Attachment } from './models/types';
import { useLiveQuery } from 'dexie-react-hooks';

import useDefaultCalendar from './lib/useDefaultCalendar';
import { useScheduleList, eventSchedules } from './lib/useScheduleList';
import { useSetting } from './lib/settings';
import ViewEvent from './ViewEvent';
import DateTimeRangeInput, { DateTimeRange } from './DateTimeRangeInput';

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
    <div style={{ width: '50vw', float: 'right' }}>
      <h1>{attachment.title}</h1>
      <ViewAttachmentInner url={attachment.fileUrl} />
      <hr />
    </div>
  );
}

function Attachments() {
  const allEvents = useLiveQuery(() =>
    db.events.toArray().then((evts) => _.sortBy(evts, (e) => e.start.ms)),
  );

  let eventList = allEvents;
  if (!eventList || !allEvents) {
    return <div>Loading...</div>;
  }

  const eventsWithAttachments = allEvents.filter((e) => e.attachments);
  const attachments = eventsWithAttachments.flatMap((e) => e.attachments);
  return (
    <div>
      {attachments.map((a) => (
        <ViewAttachment attachment={a} />
      ))}
    </div>
  );
}

export default Attachments;
