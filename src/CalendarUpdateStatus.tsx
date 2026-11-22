import React from 'react';

import { db } from './models/db';
import { useLiveQuery } from 'dexie-react-hooks';

import { max } from './lib/utils';
import { DateTime } from 'luxon';

import { useInterval } from 'usehooks-ts';

import UpdateStatusIcon from './UpdateStatusIcon';
import { authContext } from './authContext';

function CalendarUpdateStatus() {
  // Re-render every 30s so the relative time stays current.
  const [, setAsOf] = React.useState(DateTime.now());
  const updates = useLiveQuery(() => db.updateState.toArray());

  const requesting = updates?.find((u) => u.requesting)?.requesting;
  const backfilling = updates?.some((u) => u.backfilling && !u.disabled);
  const error = updates?.filter((u) => !u.disabled).find((u) => u.error)?.error;

  const updatedAt = max(updates?.map((u) => u.updatedAt));

  useInterval(() => {
    setAsOf(DateTime.now());
  }, 30 * 1000);

  const { isLoggedIn } = React.useContext(authContext);
  if (!isLoggedIn) return null;

  return (
    <UpdateStatusIcon
      showText
      update={{ updatedAt: updatedAt ?? 0, error, requesting, backfilling }}
    />
  );
}

export default CalendarUpdateStatus;
