import React, { useCallback, useEffect, useRef, useState } from 'react';

import {
  hasGrantedAllScopesGoogle,
  TokenResponse,
  useGoogleLogin,
} from '@react-oauth/google';

import { useLocalStorage } from './lib/reactHooks';
import { toast } from 'react-toastify/unstyled';
import { AUTH_EXPIRED_EVENT } from './google/googleErrors';
import { on, off } from './lib/dispatcher';
import { clearLocalData } from './models/db';
import { debug } from './lib/log';

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

/** localStorage key recording whose data is in IndexedDB. */
const DATA_OWNER_KEY = '31cal:dataOwner';

export type GoogleUser = {
  email: string;
  locale: string;
  name: string;
  picture: string;
  sub: string;
};

type TokenWithExp = TokenResponse & { exp?: number };

/** The Google Identity Services global, loaded by @react-oauth/google. */
function googleAccounts() {
  return (
    window as {
      google?: {
        accounts?: {
          oauth2?: { revoke?: (token: string, done: () => void) => void };
        };
      };
    }
  ).google?.accounts;
}

function isTokenExpired(token: TokenResponse | null): boolean {
  if (!token) return true;
  const exp = (token as TokenWithExp).exp;
  if (!exp) return false;
  return Date.now() > exp;
}

/**
 * Make sure the local cache belongs to `sub`; wipe it if another account's
 * data is there (or if the owner is unknown and nobody is signed in).
 */
async function claimLocalData(sub: string | undefined) {
  const owner = localStorage.getItem(DATA_OWNER_KEY);
  if (owner !== (sub ?? null)) {
    if (owner || !sub) await clearLocalData();
    if (sub) localStorage.setItem(DATA_OWNER_KEY, sub);
    else localStorage.removeItem(DATA_OWNER_KEY);
  }
}

function use31CalGoogleLogin() {
  const [user, setUser, removeUser] = useLocalStorage<GoogleUser | null>(
    'googleUser',
    null,
  );
  const [googleToken, setGoogleToken, removeGoogleToken] =
    useLocalStorage<TokenResponse | null>('googleToken', null);

  const [oauthError, setOauthError] = useState(false);

  // On startup: adopt existing data for the signed-in user (pre-upgrade
  // installs), and clear anything left behind by a signed-out session.
  useEffect(() => {
    if (user?.sub && !localStorage.getItem(DATA_OWNER_KEY)) {
      localStorage.setItem(DATA_OWNER_KEY, user.sub);
    }
    if (!user) claimLocalData(undefined).catch((e) => debug(e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Google rejected the token during a sync or write: try to refresh it.
  useEffect(() => {
    const listener = () => setOauthError(true);
    on(AUTH_EXPIRED_EVENT, listener);
    return () => off(AUTH_EXPIRED_EVENT, listener);
  }, []);

  const writeResolveRef = useRef<((value: void) => void) | null>(null);
  const writeRejectRef = useRef<((reason: unknown) => void) | null>(null);

  const handleSuccess = useCallback(
    async (tokenResponse: TokenResponse) => {
      setOauthError(false);
      if (tokenResponse.expires_in && !('exp' in tokenResponse)) {
        (tokenResponse as TokenWithExp).exp =
          Date.now() + tokenResponse.expires_in * 1000;
      }
      const result = await fetch(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } },
      );
      const userInfo: GoogleUser = await result.json();
      await claimLocalData(userInfo.sub);
      setGoogleToken(tokenResponse);
      setUser(userInfo);
    },
    [setGoogleToken, setUser],
  );

  const handleError = useCallback((errorResponse: unknown) => {
    debug('OAuth error', errorResponse);
    setOauthError(true);
  }, []);

  const googleLogin = useGoogleLogin({
    scope: READ_SCOPES,
    onSuccess: handleSuccess,
    onError: handleError,
    hint: user?.email,
  });

  const settleWrite = (error?: unknown) => {
    if (error === undefined) writeResolveRef.current?.();
    else writeRejectRef.current?.(error);
    writeResolveRef.current = null;
    writeRejectRef.current = null;
  };

  const googleLoginWrite = useGoogleLogin({
    scope: WRITE_SCOPES,
    onSuccess: async (tokenResponse) => {
      try {
        await handleSuccess(tokenResponse);
        if (!hasGrantedAllScopesGoogle(tokenResponse, EVENTS_READWRITE)) {
          settleWrite(new Error('Editing permission was not granted'));
        } else {
          settleWrite();
        }
      } catch (e) {
        settleWrite(e);
      }
    },
    onError: (errorResponse) => {
      handleError(errorResponse);
      settleWrite(errorResponse);
    },
    // Popup closed or blocked: without this the promise never settles.
    onNonOAuthError: (nonOAuthError) => settleWrite(nonOAuthError),
    hint: user?.email,
  });

  const hasWriteAccess = googleToken
    ? hasGrantedAllScopesGoogle(googleToken, EVENTS_READWRITE)
    : false;

  const requestWriteAccess = useCallback((): Promise<void> => {
    // Reject any earlier request still waiting on a popup.
    settleWrite(new Error('Superseded'));
    return new Promise((resolve, reject) => {
      writeResolveRef.current = resolve;
      writeRejectRef.current = reject;
      googleLoginWrite();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleLoginWrite]);

  /**
   * Resolve true once we can write. Must be called directly from a click
   * handler (before any await) so the browser allows the consent popup.
   */
  const ensureWriteAccess = useCallback(async (): Promise<boolean> => {
    if (hasWriteAccess) return true;
    toast.info(
      '31cal starts read-only. To change your calendar, allow "View and edit events" in the Google popup.',
    );
    try {
      await requestWriteAccess();
      return true;
    } catch (e) {
      debug('Write access not granted', e);
      toast.error(
        'Editing permission was not granted, so nothing was changed.',
      );
      return false;
    }
  }, [hasWriteAccess, requestWriteAccess]);

  const logout = useCallback(async () => {
    const token = googleToken?.access_token;
    try {
      if (token) googleAccounts()?.oauth2?.revoke?.(token, () => {});
    } catch (e) {
      debug('Revoke failed', e);
    }
    removeGoogleToken();
    removeUser();
    localStorage.removeItem(DATA_OWNER_KEY);
    await clearLocalData();
    window.location.assign(import.meta.env.BASE_URL);
  }, [googleToken, removeGoogleToken, removeUser]);

  const needsReconnect =
    Boolean(googleToken?.access_token) &&
    (isTokenExpired(googleToken) || oauthError);

  // Proactively refresh token 5 minutes before expiry
  useEffect(() => {
    const exp = (googleToken as TokenWithExp | null)?.exp;
    if (!exp) return;
    const refreshMs = Math.max(exp - Date.now() - 5 * 60 * 1000, 0);
    const timer = setTimeout(() => googleLogin({ prompt: 'none' }), refreshMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleToken]);

  // Reactively refresh on oauth error
  useEffect(() => {
    if (oauthError) googleLogin({ prompt: 'none' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oauthError]);

  return {
    googleLogin,
    user,
    isLoggedIn: Boolean(googleToken?.access_token),
    hasWriteAccess,
    ensureWriteAccess,
    logout,
    needsReconnect,
  };
}

function linkHandler(fn: () => void) {
  return (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };
}

function GoogleButton({
  isLoggedIn,
  needsReconnect,
  email,
  onLogin,
  onLogout,
}: {
  isLoggedIn: boolean;
  needsReconnect: boolean;
  email?: string;
  onLogin: () => void;
  onLogout: () => void;
}) {
  if (!isLoggedIn) {
    return (
      <button
        type="button"
        className="link-button"
        onClick={linkHandler(onLogin)}
      >
        Sign in with Google
      </button>
    );
  }

  return (
    <>
      {needsReconnect && (
        <>
          <button
            type="button"
            className="link-button"
            onClick={linkHandler(onLogin)}
            style={{ color: '#a35d00' }}
          >
            Reconnect
          </button>
          {' - '}
        </>
      )}
      <button
        type="button"
        className="link-button"
        onClick={linkHandler(onLogout)}
      >
        {email ? `Sign out (${email})` : 'Sign out'}
      </button>
    </>
  );
}

export function useGoogleButton() {
  const {
    user,
    googleLogin,
    isLoggedIn,
    logout,
    hasWriteAccess,
    ensureWriteAccess,
    needsReconnect,
  } = use31CalGoogleLogin();

  const button = (
    <GoogleButton
      isLoggedIn={isLoggedIn}
      needsReconnect={needsReconnect}
      email={user?.email}
      onLogin={() => googleLogin()}
      onLogout={() => {
        if (
          window.confirm(
            'Sign out? This also removes the calendar data cached in this browser.',
          )
        ) {
          logout();
        }
      }}
    />
  );

  return {
    button,
    user,
    isLoggedIn,
    hasWriteAccess,
    ensureWriteAccess,
    login: () => googleLogin(),
  };
}
