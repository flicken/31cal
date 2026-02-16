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
    'updatedAt' | 'requesting' | 'error' | 'nextPageToken'
  >;
}) {
  if (!update) {
    return null;
  }
  return (
    <img
      title={`${update.updatedAt ? toRelativeDate(update.updatedAt) : null}`}
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
