import React, { useEffect, useState } from 'react';

import { db } from './models/db';
import { useLiveQuery } from 'dexie-react-hooks';

import { max } from './lib/utils';
import { DateTime } from 'luxon';

import { useInterval } from 'usehooks-ts';

import Error from './assets/error.svg';
import Loading from './assets/loading.svg';
import Ok from './assets/ok.svg';
import { showDate, toRelativeDate } from './utils';
import { UpdateState } from './models/types';
import { fetchResource } from './google/useClientToFetch';

function CalendarUpdateStatus() {
  const [asOf, setAsOf] = React.useState(DateTime.now());
  const updates = useLiveQuery(() => db.updateState.toArray());

  const requesting = updates?.find((u) => u.requesting)?.requesting;
  const error = updates?.find((u) => u.error)?.error;

  const updatedAt = max(updates?.map((u) => u.updatedAt));

  useInterval(() => {
    setAsOf(DateTime.now());
  }, 1000);

  return (
    <UpdateStatusIcon
      update={{ updatedAt: updatedAt ?? 0, error, requesting }}
    />
  );
}

export function UpdateStatusIcon({
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

export function UpdateStatus({ update }: { update?: UpdateState }) {
  if (!update) {
    return null;
  }
  if (update.error) {
    return (
      <>
        <button
          onClick={async () => {
            await db.updateState.update([update.account, update.resource], {
              nextSyncToken: undefined,
              nextPageToken: undefined,
              etag: undefined,
            });
            await fetchResource(update.account, update.resource);
          }}
        >
          <UpdateStatusIcon update={update} />
          {update.error}
        </button>
      </>
    );
  }

  return <UpdateStatusIcon update={update} />;
}

export default CalendarUpdateStatus;
