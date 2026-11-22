import React from 'react';

import Error from './assets/error.svg';
import Loading from './assets/loading.svg';
import Ok from './assets/ok.svg';
import { toRelativeDate } from './lib/utils';
import { UpdateState } from './models/types';

export default function UpdateStatusIcon({
  update,
  showText = false,
}: {
  /** Show the status as visible text, not only to screen readers. */
  showText?: boolean;
  update?: Pick<
    UpdateState,
    'updatedAt' | 'requesting' | 'error' | 'nextPageToken' | 'backfilling'
  >;
}) {
  if (!update) {
    return null;
  }
  const label = statusLabel(update);
  const icon =
    update.requesting || update.nextPageToken || !update.updatedAt
      ? Loading
      : update.error
        ? Error
        : Ok;
  return (
    <span role="status" title={update.error ?? label}>
      <img
        alt=""
        aria-hidden="true"
        style={{ verticalAlign: 'middle', display: 'inline' }}
        height={20}
        width={20}
        src={icon}
      />
      {showText ? (
        <span className="status-text"> {label}</span>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </span>
  );
}

/** "Syncing…", "Sync error", "Synced 3 min. ago", or "Not synced yet". */
export function statusLabel(
  update: Pick<
    UpdateState,
    'updatedAt' | 'requesting' | 'error' | 'backfilling'
  >,
): string {
  if (update.requesting)
    return update.backfilling ? 'Loading older history…' : 'Syncing…';
  if (update.error) return 'Sync error';
  if (!update.updatedAt) return 'Not synced yet';
  if (update.backfilling) return 'Loading older history…';
  return `Synced ${toRelativeDate(update.updatedAt) ?? ''}`.trim();
}
