import React, { useCallback, useEffect, useRef, useState } from 'react';

import {
  hasGrantedAllScopesGoogle,
  TokenResponse,
  useGoogleLogin,
} from '@react-oauth/google';

import { useLocalStorage, useScript } from 'usehooks-ts';
import ensureClient from './google/ensureClient';
import { Link } from 'wouter';

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

type TokenWithExp = TokenResponse & { exp?: number };

function isTokenExpired(token: TokenResponse | null): boolean {
  if (!token) return true;
  const exp = (token as TokenWithExp).exp;
  if (!exp) return false;
  return Date.now() > exp;
}

function use31CalGoogleLogin() {
  const [user, setUser] = useLocalStorage<GoogleUser | null>(
    'googleUser',
    null,
  );

  const [googleToken, setGoogleToken] = useLocalStorage<TokenResponse | null>(
    'googleToken',
    null,
  );

  const [oauthError, setOauthError] = useState(false);

  const status = useScript('https://apis.google.com/js/api.js', {
    removeOnUnmount: false,
  });

  // Initialize gapi client when token and script are ready
  useEffect(() => {
    async function initGapiClient() {
      if (googleToken?.error) {
        setOauthError(true);
        return;
      }

      setOauthError(false);

      try {
        const gapi = (window as any).gapi;
        if (googleToken?.access_token && status === 'ready') {
          await ensureClient();
          if (gapi?.client) {
            gapi.client.setToken({ access_token: googleToken.access_token });
          }
          console.log('User', user?.email);
        }
      } catch (e) {
        console.log('Error', e);
      }
    }

    initGapiClient();
  }, [status, googleToken]);

  const writeResolveRef = useRef<((value: void) => void) | null>(null);
  const writeRejectRef = useRef<((reason: any) => void) | null>(null);

  const handleSuccess = useCallback(
    async (tokenResponse: TokenResponse) => {
      setOauthError(false);
      if (tokenResponse.expires_in && !('exp' in tokenResponse)) {
        (tokenResponse as TokenWithExp).exp =
          Date.now() + tokenResponse.expires_in * 1000;
      }
      setGoogleToken(tokenResponse);
      const result = await fetch(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        },
      );
      const userInfo = JSON.parse(await result.text());
      console.log(`Have user info ${JSON.stringify(userInfo)}`);
      setUser(userInfo);
    },
    [setGoogleToken, setUser],
  );

  const handleError = useCallback((errorResponse: any) => {
    console.log(errorResponse);
    setOauthError(true);
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

  const needsReconnect =
    Boolean(googleToken?.access_token) &&
    (isTokenExpired(googleToken) || oauthError);

  // Proactively refresh token 5 minutes before expiry
  useEffect(() => {
    const exp = (googleToken as any)?.exp;
    if (!exp) return;

    const refreshMs = Math.max(exp - Date.now() - 5 * 60 * 1000, 0);
    const timer = setTimeout(() => {
      console.log('Proactively refreshing Google token');
      googleLogin({ prompt: 'none' });
    }, refreshMs);

    return () => clearTimeout(timer);
  }, [googleToken]);

  // Reactively refresh on oauth error
  useEffect(() => {
    if (oauthError) {
      googleLogin({ prompt: 'none' });
    }
  }, [oauthError]);

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

  const email = user?.email;

  function GoogleButton({
    onLogin,
    onReconnect,
    onLogout,
  }: {
    onLogin: () => void;
    onReconnect: () => void;
    onLogout: () => void;
  }) {
    if (!isLoggedIn) {
      return (
        <Link
          href="#"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onLogin();
          }}
        >
          Login with Google
        </Link>
      );
    }

    return (
      <>
        {needsReconnect && (
          <Link
            href="#"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onReconnect();
            }}
            style={{ color: '#c57000' }}
          >
            Reconnect
          </Link>
        )}
        {needsReconnect && ' - '}
        <Link
          href="/"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onLogout();
          }}
        >
          {email ? `Logout (${email})` : 'Logout'}
        </Link>
      </>
    );
  }

  const button = (
    <GoogleButton
      onLogin={googleLogin}
      onReconnect={googleLogin}
      onLogout={clearGoogleToken}
    />
  );

  return { button, hasWriteAccess, requestWriteAccess };
}
