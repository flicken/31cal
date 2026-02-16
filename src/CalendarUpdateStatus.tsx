import React from 'react';

import { db } from './models/db';
import { useLiveQuery } from 'dexie-react-hooks';

import { max } from './lib/utils';
import { DateTime } from 'luxon';

import { useInterval } from 'usehooks-ts';

import { UpdateState } from './models/types';
import { fetchResource } from './google/useClientToFetch';
import UpdateStatusIcon from './UpdateStatusIcon';

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

export default CalendarUpdateStatus;
