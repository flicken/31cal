import React, { useEffect } from 'react';

import { useGoogleLogin, TokenResponse } from '@react-oauth/google';

import { useLocalStorage, useScript } from 'usehooks-ts';
import ensureClient from './google/ensureClient';
import { Link } from 'react-router-dom';

const CALENDAR_READONLY = 'https://www.googleapis.com/auth/calendar.readonly';
const EVENTS_READONLY =
  'https://www.googleapis.com/auth/calendar.events.readonly';
const EVENTS_READWRITE = 'https://www.googleapis.com/auth/calendar.events';
const SCOPES = [
  CALENDAR_READONLY, // not needed until feature for selecting calendar
  EVENTS_READONLY,
  EVENTS_READWRITE,
  'profile',
  'email',
].join(' ');

export type GoogleUser = {
  email: string;
  locale: string;
  name: string;
  picture: string;
  sub: string;
};

export function useGoogleButton(
  user: GoogleUser | null,
  setUser: (arg0: GoogleUser | null) => void,
) {
  const status = useScript('https://apis.google.com/js/api.js', {
    removeOnUnmount: false,
  });
  const [googleToken, setGoogleToken] = useLocalStorage<TokenResponse | null>(
    'googleToken',
    null,
  );

  useEffect(() => {
    async function t() {
      try {
        const gapi = (window as any).gapi;
        if (googleToken && status === 'ready') {
          await ensureClient();
          if (gapi?.client) {
            gapi?.client?.setToken({
              access_token: googleToken.access_token,
            });
          }

          console.log('User', user?.email);
        }
      } catch (e) {
        console.log('Error', e);
      }
    }
    t();
  }, [status, googleToken]);

  const googleLogin = useGoogleLogin({
    scope: SCOPES,
    // flow: 'implicit',
    onSuccess: async (tokenResponse) => {
      setGoogleToken(tokenResponse);
      const result = await fetch(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        },
      );
      const body = await result.text();
      const userInfo = JSON.parse(body);
      setUser(userInfo);
    },
    onError: (errorResponse) => console.log(errorResponse),
    hint: user?.email,
  });

  if (googleToken) {
    const logoutText = user?.email ? `Logout (${user.email})` : 'Logout';
    return (
      <Link
        to="/"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();

          setGoogleToken(null);
        }}
      >
        {logoutText}
      </Link>
    );
  } else {
    return (
      <Link
        to="#"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          googleLogin();
        }}
      >
        Login with Google
      </Link>
    );
  }
}
