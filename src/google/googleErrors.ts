import { trigger } from '../lib/dispatcher';
import type { GoogleErrorBody } from './calendarTypes';

/** Fired when Google rejects our token; useGoogleButton listens and re-auths. */
export const AUTH_EXPIRED_EVENT = 'google:auth-expired';

type GoogleErrorLike = {
  result?: { error?: GoogleErrorBody };
  status?: number;
};

function errorBody(e: unknown): GoogleErrorBody | undefined {
  return (e as GoogleErrorLike | undefined)?.result?.error;
}

export function statusOf(e: unknown): number | undefined {
  return errorBody(e)?.code ?? (e as GoogleErrorLike | undefined)?.status;
}

export function reasonsOf(e: unknown): string[] {
  return (errorBody(e)?.errors ?? [])
    .map((x) => x.reason)
    .filter((r): r is string => !!r);
}

/** The token is missing, expired or lacks a scope: re-authenticating can fix it. */
export function isAuthError(e: unknown): boolean {
  const status = statusOf(e);
  if (status === 401) return true;
  if (status === 403) {
    return reasonsOf(e).some((r) =>
      [
        'authError',
        'insufficientPermissions',
        'ACCESS_TOKEN_SCOPE_INSUFFICIENT',
      ].includes(r),
    );
  }
  return false;
}

/** Rate limits and transient server errors: retry with backoff. */
export function isRetryable(e: unknown): boolean {
  const status = statusOf(e);
  if (status === 429 || (status !== undefined && status >= 500)) return true;
  if (status === 403) {
    return reasonsOf(e).some((r) =>
      ['rateLimitExceeded', 'userRateLimitExceeded', 'quotaExceeded'].includes(
        r,
      ),
    );
  }
  return false;
}

export function errorMessage(e: unknown): string {
  const body = errorBody(e);
  if (body?.message) return body.message;
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return 'Unknown error';
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Call Google, retrying rate-limit and 5xx errors with exponential backoff
 * and jitter. Auth errors notify the login layer and are rethrown.
 */
export async function callGoogle<T>(
  fn: () => Promise<T>,
  { retries = 4, baseDelayMs = 500 } = {},
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (isAuthError(e)) {
        trigger(AUTH_EXPIRED_EVENT, { status: statusOf(e) });
        throw e;
      }
      if (attempt >= retries || !isRetryable(e)) throw e;
      const delay = baseDelayMs * 2 ** attempt * (0.5 + Math.random());
      await sleep(delay);
    }
  }
}
