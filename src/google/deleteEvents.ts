import { toast } from 'react-toastify';

import { db } from '../models/db';
import ensureClient from './ensureClient';
import { getEvents } from './useClientToFetch';

import { uniq } from 'lodash';
import { GoogleUser } from '../useGoogleButton';

type EventToDelete = {
  eventId: string;
  calendarId: string;
};

export default async function deleteEvents(
  user: GoogleUser | null,
  events: EventToDelete[],
) {
  toast(`Deleting ${events.length} events`, { hideProgressBar: true });

  await ensureClient();
  const gapi: any = (window as any).gapi;
  for (const event of events) {
    try {
      const response = await gapi.client.calendar.events.delete(event);
      console.log('Response', response);
      toast.info(`Deleted event ${JSON.stringify(event)}`, {
        hideProgressBar: true,
      });
      // optimistic update
      await db.events
        .where({ id: event.eventId, calendarId: event.calendarId })
        .modify({
          status: 'cancelled',
          dirty: true,
        });
      await db.calendars.update(event.calendarId, { dirty: true });
    } catch (e) {
      toast.error(`Error deleting event ${JSON.stringify(event)}`, {
        hideProgressBar: true,
      });
    }
  }

  const calendarIds = uniq(events.map((e) => e.calendarId));
  await getEvents(
    user,
    calendarIds.map((id) => {
      return { id: id };
    }),
  );
}
