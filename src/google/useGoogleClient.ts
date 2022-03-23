import { useEffect, useState, useCallback } from 'react';
import { GOOGLE_CLIENT_ID } from '../config';
import { useLocalStorage, useScript } from 'usehooks-ts';
import _ from 'lodash';

const asPromise = (create) => {
  return new Promise((resolve, reject) => {
    create({
      callback: () => {
        return resolve();
      },
      onerror: (e) => {
        reject(e);
      },
    });
  });
};

export type Status = 'idle' | 'loading' | 'ready' | 'error';
export type ScriptElt = HTMLScriptElement | null;

async function promiseFromScript(script: HtmlScriptElement) {
  const status = script.getAttribute('data-status') as Status;

  if (status == 'ready') {
    return Promise.resolve(script);
  } else if (status == 'error') {
    return Promise.reject(new Error(`already failed to load: ${script.src}`));
  } else {
    return new Promise((resolve, reject) => {
      // Add event listeners
      script.addEventListener('load', () => {
        resolve(script);
      });
      script.addEventListener('error', (e) => {
        reject(e);
      });
      const newStatus = script.getAttribute('data-status') as Status;
      if (newStatus == 'ready') {
        resolve(script);
      } else if (newStatus == 'error') {
        reject(new Error(`already failed to load: ${script.src}`));
      }
    });
  }
}

async function loadScript(src: string) {
  // Fetch existing script element by src
  // It may have been added by another instance of this hook
  let script: ScriptElt = document.querySelector(`script[src="${src}"]`);
  if (!script) {
    // Create script
    script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.setAttribute('data-status', 'loading');
    // Add script to document body
    document.body.appendChild(script);

    // Store status in attribute on script
    // This can be read by other instances of this hook
    const setAttributeFromEvent = (event: Event) => {
      script.setAttribute(
        'data-status',
        event.type === 'load' ? 'ready' : 'error',
      );
    };

    script.addEventListener('load', setAttributeFromEvent);
    script.addEventListener('error', setAttributeFromEvent);
  }
  return promiseFromScript(script);
}

const API_VERSIONS = {
  calendar: 'v3',
  drive: 'v3',
  people: 'v1',
};

const APIS = Object.keys(API_VERSIONS);

export async function ensureGoogleClient() {
  if (!window.gapi) {
    await loadScript('https://apis.google.com/js/api.js');
  }
  if (!window.gapi.client) {
    await asPromise((c) => window.gapi.load('client', c));
  }
}

async function loadGoogleClientApis(apis: string[] = APIS) {
  const promises = apis.flatMap((api) => {
    if (!apiLoaded(api)) {
      return [window.gapi.client.load(api, API_VERSIONS[api] ?? 'v1')];
    } else {
      return [];
    }
  });
  await Promise.all(promises);
}

async function apiLoaded(api: string): boolean {
  return Object.keys(window.gapi?.client).includes(api);
}

function setProfile(profile) {
  window.googleProfile = profile;
}

function getProfile() {
  return window.googleProfile;
}

export async function ensureAccess(
  api: string | string[],
  scope: string | string[],
) {
  await ensureGoogleClient();
  const apis = _.isString(api) ? [api] : api;
  if (!apis.every(apiLoaded)) {
    const apis = {};
    apis[api] = version;
    await loadGoogleClientApis(apis);
  }

  if (!window.google?.accounts) {
    await loadScript('https://accounts.google.com/gsi/client');
  }

  const scopes = _.isString(scope)
    ? scope.split(' ').filter((s) => !_.isEmpty(s))
    : scope;
  if (
    !google.accounts.oauth2.hasGrantedAllScopes(
      gapi.client.getToken(),
      ...scopes,
    )
  ) {
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      hint: getProfile()?.email,
      scope: scopes.join(' '),
      prompt: '',
      callback: (resp) => {
        resolve;
      },
    });
  }
}

export async function requestTokenForScopes(
  scopes: string[],
  profile = getProfile(),
) {
  return await new Promise((resolve, reject) => {
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      hint: profile?.email,
      scope: _.isString(scopes) ? scopes : scopes.join(' '),
      prompt: '',
      callback: (resp) => {
        if (resp.error !== undefined) {
          reject(resp);
        } else {
          // GIS has automatically updated gapi.client with the newly issued access token.
          resolve(gapi.client.getToken());
        }
      },
    });

    tokenClient.requestAccessToken({ hint: profile?.email });
  });
}

export function withGoogleScope(
  onNewToken: (token) => void = (_) => {},
  ...scopes: string[]
) {
  return async (callee: () => Promise<any>) => {
    try {
      return await callee();
    } catch (e) {
      if (
        e?.result?.error?.code == 401 ||
        (e?.result?.error?.code == 403 &&
          e?.result?.error?.status == 'PERMISSION_DENIED')
      ) {
        const token = await requestTokenForScopes(scopes);
        onNewToken(token);
        return await callee();
      } else {
        // Errors unrelated to authorization: server errors, exceeding quota, bad requests, and so on.
        throw new Error(err);
      }
    }
  };
}

export async function fetchProfile() {
  const token = gapi.client.getToken();
  if (token?.access_token) {
    return await fetch(
      `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token.access_token}`,
    )
      .then((r) => r.json())
      .then((json) => {
        window.localStorage.setItem('profile', JSON.stringify(json));
        return json;
      });
  }
}

export default function useGoogleClient(
  scopes:
    | string
    | string[] = 'https://www.googleapis.com/auth/calendar.readonly',
  apis: string[] = ['calendar'],
) {
  const [token, setToken] = useLocalStorage('token', undefined);
  const [profile, setLocalStorageProfile] = useLocalStorage(
    'profile',
    undefined,
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const doIt = async () => {
      await ensureAccess(apis, _.isString(scopes) ? scopes : scopes.join(' '));
      setToken(gapi.client.getToken());
      setLoaded(true);
    };
    doIt().catch((e) => console.log('failed', e));
  }, [scopes, setLoaded, apis]);

  useEffect(() => {
    const f = async () => {
      const p = fetchProfile();
      if (p) {
        setProfile(p);
      }
    };
    if (loaded && token) {
      f();
    }
  }, [token, loaded, setProfile]);

  useEffect(() => {
    setProfile(profile);
  }, [profile]);

  const call = useCallback(
    async (callee: () => any) => {
      const doCall = withGoogleScope(setToken, ...scopes);
      return await doCall(callee);
    },
    [scopes, setToken],
  );

  return {
    token,
    profile,
    call,
    loaded,
  };
}
