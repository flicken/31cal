import { toast } from 'react-toastify';

import ensureClient from './ensureClient';

import { omit } from 'lodash-es';

export type EventPatch = {
  eventId: string;
  calendarId: string;
  [key: string]: any;
};
export default async function patchEvents(patches: EventPatch[]) {
  toast(`Updating ${patches.length} events`, { hideProgressBar: true });
  await ensureClient();
  const gapi: any = (window as any).gapi;
  for (const patch of patches) {
    try {
      const response = await gapi.client.calendar.events.patch({
        calendarId: patch.calendarId,
        eventId: patch.eventId,
        supportsAttachments: true,
        resource: omit(patch, ['eventId', 'calendarId']),
      });
      console.log('Response', response);
      toast.info(`Patched event ${JSON.stringify(patch)}`, {
        hideProgressBar: true,
      });
    } catch (e) {
      toast.error(`Error sending event ${JSON.stringify(patch)}`, {
        hideProgressBar: true,
      });
    }
  }
}
