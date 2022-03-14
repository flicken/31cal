import { toast } from 'react-toastify';

import { DateTime } from 'luxon';

import ensureClient from './ensureClient';

function googleTimeToDateTime(value: any, timeZone: any) {
  return DateTime.fromISO(value.dateTime || value.date, {
    zone: value.timeZone || timeZone,
  });
}

export default async function saveEvents(
  calendar: any,
  events: any[],
  description?: string,
) {
  toast(`Saving events to ${calendar.summary}`, { hideProgressBar: true });
  console.log('Saving events to calendar ', calendar?.id);
  await ensureClient();
  const gapi: any = (window as any).gapi;
  events.forEach(async (event: any) => {
    try {
      if (!event.end) {
        if (event.start.date) {
          event.end = event.start;
        } else {
          event.end = {
            dateTime: googleTimeToDateTime(event.start, calendar.timeZone)
              .plus({ hours: 1 })
              .toISO(),
          };
        }
      }
      const response = await gapi.client.calendar.events.insert({
        calendarId: calendar?.id,
        resource: { description: description, ...event },
      });
      console.log('Response', response);
      toast.info(`Saved event ${JSON.stringify(event)}`, {
        hideProgressBar: true,
      });
    } catch (e) {
      toast.error(`Error sending event ${JSON.stringify(event)}`, {
        hideProgressBar: true,
      });
    }
  });
}
