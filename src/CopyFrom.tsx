import React, { useEffect, useState } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { allCalendars, allEventFilters } from './lib/store';
import { Calendar, CalendarEvent } from './models/types';
import { keyBy } from 'lodash-es';
import { modEventFilters, modEventMods, modFilteredEvents } from './ModMany';
import { userContext } from './userContext';
import Filters2 from './Filters2';
import { EventCheckList } from './EventCheckList';
import { keyFor } from './lib/events';
import { getEvents } from './google/useClientToFetch';
import { DateTime } from 'luxon';
import { useInterval } from 'usehooks-ts';
import Calendars from './Calendars';
import saveEvents from './google/saveEvents';
import _ from 'lodash';
import useDefaultCalendar from './lib/useDefaultCalendar';

function CopyFrom() {
  const calendars = useRecoilValue(allCalendars);
  const events = useRecoilValue(modFilteredEvents);
  const user = React.useContext(userContext);
  const globalFilters = useRecoilValue(allEventFilters);
  const [filters, setFilters] = useRecoilState(modEventFilters);
  const [mods, setMods] = useRecoilState(modEventMods);
  const [lastFetchDate, setLastFetchDate] = React.useState(DateTime.now());
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [prefix, setPrefix] = useState<string>('');
  const defaultCalendar = useDefaultCalendar();
  const [copyToCalendar, setCopyToCalendar] = useState<Calendar | undefined>(
    defaultCalendar,
  );

  useEffect(() => {
    // default to global filters
    setFilters(globalFilters);
  }, []);

  useInterval(
    () => {
      setLastFetchDate(DateTime.now());
    },
    5 * 60 * 1000,
  );

  useEffect(() => {
    getEvents(
      user,
      filters.calendarIds.map((id) => ({
        id,
      })),
    ).catch(console.error);
  }, [user, filters.calendarIds, lastFetchDate]);

  async function copyEvents(calendar: Calendar, events: CalendarEvent[]) {
    const eventsToSave = events.map((e) => ({
      ..._.pick(
        e,
        'attachments',
        'end',
        'start',
        'description',
        'transparency',
      ),
      summary: `${prefix ?? ''}${e.summary ?? ''}`,
      extendedProperties: {
        private: {
          original: _.pick(
            e,
            'id',
            'calendarId',
            'creator',
            'organizer',
            'updated',
          ),
        },
      },
    }));

    await saveEvents(calendar, eventsToSave);

    setLastFetchDate(DateTime.now());
  }

  try {
    const isChecked = (event: CalendarEvent) => checked.has(keyFor(event));

    return (
      <div>
        <div>
          <Filters2 {...{ setFilters, filters }} />
          <input
            title={'Prefix'}
            type="text"
            defaultValue={prefix}
            placeholder={`e.g. ${calendars.find((c) => filters.calendarIds.includes(c.id))?.summary ?? 'Bob'}  - `}
            style={{ width: '40em' }}
            onChange={(e) => {
              setPrefix(e.target.value);
            }}
          />
        </div>
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <button
              disabled={
                events.length === 0 || checked.size < 1 || !copyToCalendar
              }
              onClick={async () => {
                await copyEvents(
                  copyToCalendar!,
                  events.filter((e) => checked.has(keyFor(e))),
                );
              }}
            >
              Copy {events.length === 0 ? '' : `(${checked.size})`} to:
            </button>
            <div style={{ width: '20em' }}>
              <Calendars
                options={calendars}
                value={copyToCalendar ? [copyToCalendar] : []}
                onChange={(e) => setCopyToCalendar(e.at(-1))}
              />
            </div>
          </div>
        </div>
        <EventCheckList
          calendars={keyBy(calendars, 'id')}
          events={events.map((e) => ({
            ...e,
            summary: `${prefix ?? ''}${e.summary ?? ''}`,
          }))}
          setChecked={(event, checked) => {
            setChecked((oldChecked) => {
              const newChecked = new Set(oldChecked);
              if (checked) {
                newChecked.add(keyFor(event));
              } else {
                newChecked.delete(keyFor(event));
              }
              return newChecked;
            });
          }}
          isChecked={isChecked}
          onAllCheckedSelected={() => {
            if (events.every((e) => checked.has(keyFor(e)))) {
              setChecked(new Set());
            } else {
              setChecked(new Set(events.map(keyFor)));
            }
          }}
        />
      </div>
    );
  } catch (e: any) {
    console.log(e);
    return (
      <div>
        Error {e.message}
        <pre>{JSON.stringify(e)}</pre>
      </div>
    );
  }
}

export default CopyFrom;
