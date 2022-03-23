import React, { useCallback } from 'react';

import { useGoogleLogin, useGoogleLogout } from 'react-google-login';

import { GOOGLE_CLIENT_ID } from './config';

export const CALENDAR_READONLY =
  'https://www.googleapis.com/auth/calendar.readonly';
export const EVENTS_READONLY =
  'https://www.googleapis.com/auth/calendar.events.readonly';
export const EVENTS_READWRITE =
  'https://www.googleapis.com/auth/calendar.events';
export const SCOPES = [
  CALENDAR_READONLY, // not needed until feature for selecting calendar
  EVENTS_READONLY,
  EVENTS_READWRITE,
  'profile',
  'email',
].join(' ');

export const DRIVE_APPDATA = 'https://www.googleapis.com/auth/drive.appdata';
export const DRIVE_FILE = 'https://www.googleapis.com/auth/drive.file';

export function useGoogleButton(user: any, setUser: (arg0: any) => void) {
  const onLogoutSuccess = useCallback(() => {
    setUser(null);
  }, [setUser]);
  const onFailure = useCallback(() => {
    console.log('failure');
  }, []);
  const onSuccess = useCallback(
    (e: any) => {
      console.log('success', e);
      setUser(e);
    },
    [setUser],
  );

  console.log('Google', GOOGLE_CLIENT_ID);
  const { signIn, loaded } = useGoogleLogin({
    clientId: GOOGLE_CLIENT_ID,
    cookiePolicy: 'single_host_origin',
    discoveryDocs:
      'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
    isSignedIn: true,
    onFailure,
    onSuccess,
    scope: SCOPES,
  });

  const { signOut } = useGoogleLogout({
    clientId: GOOGLE_CLIENT_ID,
    onFailure,
    onLogoutSuccess,
  });

  if (!loaded) return <>Loading...</>;
  if (user) {
    const logoutText = user?.profileObj?.email
      ? `Logout (${user.profileObj.email})`
      : 'Logout';
    return (
      <a href="/" onClick={signOut}>
        {logoutText}
      </a>
    );
  } else {
    return (
      <a href="/" onClick={signIn}>
        Login
      </a>
    );
  }
}
