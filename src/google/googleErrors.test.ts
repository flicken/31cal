import { describe, expect, it, vi } from 'vitest';
import {
  callGoogle,
  isAuthError,
  isRetryable,
  AUTH_EXPIRED_EVENT,
} from './googleErrors';

const err = (code: number, reason?: string) => ({
  result: { error: { code, message: 'x', errors: reason ? [{ reason }] : [] } },
});

describe('classification', () => {
  it('treats 401 and scope 403s as auth errors, other 403s not', () => {
    expect(isAuthError(err(401))).toBe(true);
    expect(isAuthError(err(403, 'insufficientPermissions'))).toBe(true);
    expect(isAuthError(err(403, 'rateLimitExceeded'))).toBe(false);
    expect(isAuthError(err(403, 'forbidden'))).toBe(false);
  });

  it('retries rate limits and server errors only', () => {
    expect(isRetryable(err(429))).toBe(true);
    expect(isRetryable(err(503))).toBe(true);
    expect(isRetryable(err(403, 'userRateLimitExceeded'))).toBe(true);
    expect(isRetryable(err(404))).toBe(false);
  });
});

describe('callGoogle', () => {
  it('retries then succeeds', async () => {
    const fn = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(err(429))
      .mockResolvedValue('ok');
    await expect(callGoogle(fn, { baseDelayMs: 1 })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not retry auth errors and announces them', async () => {
    const listener = vi.fn<() => void>();
    document.addEventListener(AUTH_EXPIRED_EVENT, listener);
    const fn = vi.fn<() => Promise<never>>().mockRejectedValue(err(401));
    await expect(callGoogle(fn, { baseDelayMs: 1 })).rejects.toBeTruthy();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalled();
  });
});
