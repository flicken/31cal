import React from 'react';

import { Calendar } from './models/types';
import { db } from './models/db';
import { useLiveQuery } from 'dexie-react-hooks';

import useDefaultCalendar from './lib/useDefaultCalendar';

import { keyBy } from 'lodash';

import { useRecoilState } from 'recoil';

import { defaultCalendar as defaultCalendarState } from './lib/store';

const isDefault = (id: string, defaultId?: string) => {
  return id === defaultId ? { fontWeight: 'bold' } : null;
};

function Calendars() {
  const [calendarState, setCalendarState] =
    useRecoilState(defaultCalendarState);
  const calList = useLiveQuery(() => db.calendars.orderBy('summary').toArray());
  const updateState = useLiveQuery(
    () =>
      db.updateState
        .toArray()
        .then((us) => us.filter((u) => u.resource.startsWith('calendar/'))),
    [],
  );
  const defaultCalendar = useDefaultCalendar();

  const updateById = keyBy(updateState, (u) => u.resource.split('/')[1]);

  const onClick = (c: Calendar) => {
    db.settings.put({ id: 'calendarDefault', value: c.id });
  };

  if (!calList) return null;

  return (
    <div>
      {calList
        .filter((c: any) => c.selected)
        .map((c: any) => {
          const update = updateById[c.id];
          return (
            <div
              key={c.id}
              className={update?.requestedAt ? 'loading' : undefined}
              style={{
                backgroundColor: c.backgroundColor,
                color: c.foregroundColor,
                ...isDefault(c.id, defaultCalendar?.id),
              }}
              onClick={() => {
                onClick(c);
              }}
            >
              {c.summary}
            </div>
          );
        })}
    </div>
  );
}

export default Calendars;
