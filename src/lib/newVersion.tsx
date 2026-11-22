/**
 * Recovering when a newer 31cal is deployed or opened in another tab:
 * - (safety net) a chunk from the old build is requested; the build is a
 *   single bundle, so this shouldn't happen,
 * - a newer tab upgraded the IndexedDB schema.
 * Reload automatically unless the user has unsaved work, or we reloaded
 * very recently (avoid loops); otherwise offer a Reload button.
 */
import React from 'react';
import { toast } from 'react-toastify';

const LAST_RELOAD_KEY = '31cal:lastAutoReload';
const MIN_RELOAD_INTERVAL_MS = 60 * 1000;

let unsavedWork = false;

/** Views with typed-but-unsaved input set this so we don't reload over it. */
export function setUnsavedWork(value: boolean) {
  unsavedWork = value;
}

/** Pure guard: reload unless the last automatic reload was < 60s ago. */
export function shouldAutoReload(
  now: number,
  lastReload: number | undefined,
  minIntervalMs = MIN_RELOAD_INTERVAL_MS,
): boolean {
  if (lastReload === undefined || Number.isNaN(lastReload)) return true;
  if (lastReload > now) return true; // clock went backwards
  return now - lastReload >= minIntervalMs;
}

function lastReload(): number | undefined {
  try {
    const v = sessionStorage.getItem(LAST_RELOAD_KEY);
    return v ? Number(v) : undefined;
  } catch {
    return undefined;
  }
}

export function showNewVersionToast(
  message = 'A new version of 31cal is available.',
) {
  toast.info(
    <div>
      {message}{' '}
      <button type="button" onClick={() => window.location.reload()}>
        Reload
      </button>
    </div>,
    { toastId: 'new-version', autoClose: false, closeOnClick: false },
  );
}

/** Returns true if the page is reloading. */
export function reloadForNewVersion(): boolean {
  const now = Date.now();
  if (unsavedWork || !shouldAutoReload(now, lastReload())) {
    showNewVersionToast();
    return false;
  }
  try {
    sessionStorage.setItem(LAST_RELOAD_KEY, String(now));
  } catch {
    // Without storage we can't guard against loops; ask instead.
    showNewVersionToast();
    return false;
  }
  window.location.reload();
  return true;
}
