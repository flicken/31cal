import { atom, selector } from 'recoil';
import { db } from '../models/db';

import _ from 'lodash';

import { DateTime } from 'luxon';

export const allEvents = atom({
  key: 'allEvents',
  default: db.events.toArray(),
});

export const eventFilters = atom({
  key: 'eventFilters',
  default: {
    start: DateTime.now(),
    end: DateTime.now().plus({ months: 1 }).endOf('month'),
    calendars: undefined,
  },
});

export const allEventFilters = selector({
  key: 'allEventFilters',
  get: ({ get }) => {
    const otherFilters = get(eventFilters);
    const calendarId = get(defaultCalendar);
    return { ...otherFilters, calendarId };
  },
});

export const filteredEvents = selector({
  key: 'filteredEvents',
  get: ({ get }) => {
    const events = get(allEvents);
    const filters = get(allEventFilters);
    const startMs = filters.start.toMillis();
    const endMs = filters.end.toMillis();
    const filter = (e: CalendarEvent) => {
      return (
        (!e.end?.ms || startMs < e.end?.ms) &&
        (!e.start?.ms || e.start?.ms <= endMs) &&
        (!filters.calendars || filters.calendars.includes(e.calendarId))
      );
    };
    return events.filter(filter);
  },
});

const objectDiff = (a, b) =>
  _.fromPairs(_.differenceWith(_.toPairs(a), _.toPairs(b), _.isEqual));

export const settings = atom({
  key: 'settings',
  default: db.settings.toArray().then((s) => {
    const o = {};
    s.forEach((s) => (o[s.id] = s.value));
    return o;
  }),
  effects: [
    ({ onSet, setSelf }) => {
      const updateFunction = (modifications, primKey, obj, transaction) => {
        const newSetting = {};
        newSetting[primKey] = modifications.value;
        console.log('Updating setting', newSetting);
        setSelf((old) => {
          return { ...old, ...newSetting };
        });
      };

      db.settings.hook('updating', updateFunction);

      onSet((newValue, oldValue, isReset) => {
        console.log('TODO Set value in database', newValue, oldValue, isReset);
        console.log('TODO obj diff', objectDiff(newValue, oldValue));
      });

      return () => {
        db.settings.hook('updating').unsubscribe(updateFunction);
      };
    },
  ],
});

export const defaultCalendar = selector({
  key: 'calendarDefault',
  get: ({ get }) => {
    const settingsObject = get(settings);
    return settingsObject.calendarDefault;
  },
});
