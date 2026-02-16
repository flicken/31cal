import React, { useCallback, useEffect, useRef, useState } from 'react';

import {
  useGoogleLogin,
  hasGrantedAllScopesGoogle,
  TokenResponse,
} from '@react-oauth/google';

import { useLocalStorage, useScript } from 'usehooks-ts';
import ensureClient from './google/ensureClient';
import { Link } from 'react-router';

const CALENDAR_READONLY = 'https://www.googleapis.com/auth/calendar.readonly';
const EVENTS_READONLY =
  'https://www.googleapis.com/auth/calendar.events.readonly';
const EVENTS_READWRITE = 'https://www.googleapis.com/auth/calendar.events';

const READ_SCOPES = [
  CALENDAR_READONLY,
  EVENTS_READONLY,
  'profile',
  'email',
].join(' ');

const WRITE_SCOPES = [
  CALENDAR_READONLY,
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

function use31CalGoogleLogin() {
  const [user, setUser] = useLocalStorage<GoogleUser | null>(
    'googleUser',
    null,
  );

  const [googleToken, setGoogleToken] = useLocalStorage<TokenResponse | null>(
    'googleToken',
    null,
  );

  const [error, setError] = useState<boolean>(false);
  const [needsReconnect, setNeedsReconnect] = useState<boolean>(false);

  const status = useScript('https://apis.google.com/js/api.js', {
    removeOnUnmount: false,
  });

  useEffect(() => {
    async function requestGoogleAccessToken() {
      if (googleToken?.error) {
        setError(true);
        return;
      }

      setError(false);

      try {
        const gapi = (window as any).gapi;
        if (googleToken?.access_token && status === 'ready') {
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

    requestGoogleAccessToken();
  }, [status, googleToken]);

  useEffect(() => {
    async function t() {
      try {
        const gapi = (window as any).gapi;
        if (googleToken?.access_token && status === 'ready') {
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

  const writeResolveRef = useRef<((value: void) => void) | null>(null);
  const writeRejectRef = useRef<((reason: any) => void) | null>(null);

  const handleSuccess = useCallback(
    async (tokenResponse: TokenResponse) => {
      setNeedsReconnect(false);
      setGoogleToken(tokenResponse);
      const result = await fetch(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        },
      );
      const body = await result.text();
      const userInfo = JSON.parse(body);
      console.log(`Have user info ${JSON.stringify(userInfo)}`);
      setUser(userInfo);
    },
    [setGoogleToken, setUser],
  );

  const handleError = useCallback((errorResponse: any) => {
    console.log(errorResponse);
    setNeedsReconnect(true);
  }, []);

  const googleLogin = useGoogleLogin({
    scope: READ_SCOPES,
    onSuccess: handleSuccess,
    onError: handleError,
    hint: user?.email,
  });

  const googleLoginWrite = useGoogleLogin({
    scope: WRITE_SCOPES,
    onSuccess: async (tokenResponse) => {
      await handleSuccess(tokenResponse);
      writeResolveRef.current?.(undefined);
      writeResolveRef.current = null;
      writeRejectRef.current = null;
    },
    onError: (errorResponse) => {
      handleError(errorResponse);
      writeRejectRef.current?.(errorResponse);
      writeResolveRef.current = null;
      writeRejectRef.current = null;
    },
    hint: user?.email,
  });

  const hasWriteAccess = googleToken
    ? hasGrantedAllScopesGoogle(googleToken, EVENTS_READWRITE)
    : false;

  const requestWriteAccess = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      writeResolveRef.current = resolve;
      writeRejectRef.current = reject;
      googleLoginWrite();
    });
  }, [googleLoginWrite]);

  // Proactively refresh token before it expires
  useEffect(() => {
    if (!googleToken?.expires_in) return;

    // Refresh 5 minutes before expiry (or immediately if less than 5 min left)
    const refreshMs = Math.max((googleToken.expires_in - 300) * 1000, 0);
    const refreshScopes = hasWriteAccess ? WRITE_SCOPES : READ_SCOPES;
    const timer = setTimeout(() => {
      console.log('Proactively refreshing Google token');
      googleLogin({ prompt: 'none' });
    }, refreshMs);

    return () => clearTimeout(timer);
  }, [googleToken]);

  // Reactively refresh on error
  useEffect(() => {
    if (error) {
      googleLogin({ prompt: 'none' });
    }
  }, [error]);

  return {
    googleLogin,
    user,
    googleToken,
    clearGoogleToken: () => setGoogleToken(null),
    isLoggedIn: Boolean(googleToken?.access_token),
    hasWriteAccess,
    requestWriteAccess,
    needsReconnect,
  };
}

export function useGoogleButton() {
  const {
    user,
    googleLogin,
    isLoggedIn,
    clearGoogleToken,
    hasWriteAccess,
    requestWriteAccess,
    needsReconnect,
  } = use31CalGoogleLogin();

  const button = isLoggedIn ? (
    <>
      {needsReconnect && (
        <Link
          to="#"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            googleLogin();
          }}
          style={{ color: '#c57000' }}
        >
          Reconnect
        </Link>
      )}{needsReconnect && ' - '}
      <Link
        to="/"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();

          clearGoogleToken();
        }}
      >
        {user?.email ? `Logout (${user.email})` : 'Logout'}
      </Link>
    </>
  ) : (
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

  return { button, hasWriteAccess, requestWriteAccess };
}
