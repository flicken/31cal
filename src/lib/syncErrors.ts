import type { UpdateState } from '../models/types';

type Failure = Pick<UpdateState, 'error' | 'errorStatus'>;

/**
 * A plain-language explanation of a sync failure and what to do about it.
 * The raw Google message stays available as `detail`.
 */
export function describeSyncError(f: Failure): {
  summary: string;
  hint?: string;
  detail?: string;
} {
  const detail = f.error;
  const raw = (f.error ?? '').toLowerCase();
  switch (true) {
    case f.errorStatus === 0 || raw === 'not signed in':
      return { summary: 'Not signed in', hint: 'Sign in with Google.', detail };
    case f.errorStatus === 401:
      return {
        summary: 'Google sign-in expired',
        hint: 'Click Reconnect in the top bar.',
        detail,
      };
    case f.errorStatus === 403 && /rate|quota|usage limit/.test(raw):
      return {
        summary: 'Google rate limit',
        hint: 'It will retry automatically in a few minutes.',
        detail,
      };
    case f.errorStatus === 403:
      return {
        summary: 'Google refused access',
        hint: 'The calendar may no longer be shared with you; try Reconnect.',
        detail,
      };
    case f.errorStatus === 404:
      return {
        summary: 'Calendar not found',
        hint: 'It may have been deleted or unshared. Untick it to stop syncing.',
        detail,
      };
    case f.errorStatus === 429:
      return {
        summary: 'Google rate limit',
        hint: 'It will retry automatically in a few minutes.',
        detail,
      };
    case (f.errorStatus ?? 0) >= 500:
      return {
        summary: 'Google is having problems',
        hint: 'It will retry automatically.',
        detail,
      };
    case f.errorStatus === -1 ||
      /failed to fetch|network|load failed/.test(raw):
      return {
        summary: "Can't reach Google",
        hint: 'Check your connection; it will retry when you are back online.',
        detail,
      };
    default:
      return { summary: f.error || 'Sync failed', detail: undefined };
  }
}
