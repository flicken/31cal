import React, { useEffect } from 'react';
import useGoogleClient from './google/useGoogleClient';

export default function GoogleButton() {
  const { profile, call, loaded } = useGoogleClient(
    'https://www.googleapis.com/auth/calendar.readonly',
  );

  /* useEffect(() => {
   *   if (!loaded) {
   *     return;
   *   }
   *   const doIt = async () => {
   *     const events = await call(() =>
   *       window.gapi.client.calendar.events.list({ calendarId: 'primary' }),
   *     );
   *   };
   *   doIt();
   * }, [call, loaded]);
   */

  if (profile) {
    return <span>{profile.email}</span>;
  } else {
    return <span>Loading...</span>;
  }
}
