import { CalendarEvent } from './models/types';
import { useEmptyState } from './EmptyState';
import React, { useMemo } from 'react';

import { useFilterState } from './lib/FilterStateContext';
import { useFilteredEvents, useSelectedCalendarIds } from './lib/hooks';
import { asArray } from './lib/utils';

import EventList from './EventList';

import { ViewAttachment } from './ViewAttachment';

function Attachments() {
  const { eventFilters } = useFilterState();
  const [selectedCalendarIds] = useSelectedCalendarIds();

  const filters = useMemo(
    () => ({ ...eventFilters, calendarIds: asArray(selectedCalendarIds) }),
    [eventFilters, selectedCalendarIds],
  );

  const events = useFilteredEvents(filters);
  const empty = useEmptyState(events, filters.calendarIds);
  if (empty || !events) return empty;
  const eventsWithAttachments = events.filter((e) => e.attachments);
  const attachmentUrl2Events = new Map<string, CalendarEvent[]>();
  eventsWithAttachments.forEach((e) => {
    (e.attachments ?? []).forEach((a) => {
      let forUrl = attachmentUrl2Events.get(a.fileUrl);
      if (!forUrl) {
        forUrl = [];
        attachmentUrl2Events.set(a.fileUrl, forUrl);
      }
      forUrl.push(e);
    });
  });

  return (
    <>
      <div>
        Showing {attachmentUrl2Events.size} attachments with{' '}
        {eventsWithAttachments.length} events.
      </div>
      <div>
        {Array.from(attachmentUrl2Events).map(([attachmentUrl, forUrl]) => (
          <div key={attachmentUrl} className="two-column">
            <div>
              <EventList events={forUrl} />
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
