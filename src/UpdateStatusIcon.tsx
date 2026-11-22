import React from 'react';

import Error from './assets/error.svg';
import Loading from './assets/loading.svg';
import Ok from './assets/ok.svg';
import { toRelativeDate } from './utils';
import { UpdateState } from './models/types';

export default function UpdateStatusIcon({
  update,
}: {
  update?: Pick<
    UpdateState,
    'updatedAt' | 'requesting' | 'error' | 'nextPageToken' | 'backfilling'
  >;
}) {
  if (!update) {
    return null;
  }
  return (
    <img
      title={
        update.backfilling
          ? 'Loading older history…'
          : `${update.updatedAt ? toRelativeDate(update.updatedAt) : null}`
      }
      alt={
        update.requesting ? 'Syncing' : update.error ? 'Sync error' : 'Synced'
      }
      style={{ verticalAlign: 'middle', display: 'inline' }}
      height={20}
      width={20}
      src={
        update.requesting || update.nextPageToken
          ? Loading
          : update.error
            ? Error
            : Ok
      }
    />
  );
}
