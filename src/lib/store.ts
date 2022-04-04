import { atom, selector } from 'recoil';
import { db } from '../models/db';
import { CalendarEvent } from '../models/types';

import _ from 'lodash';

import { DateTime } from 'luxon';

export const allCalendars = atom({
  key: 'allCalendars',
  default: db.calendars.orderBy('summary').toArray(),
});

export const allEvents = atom({
  key: 'allEvents',
  default: db.events.orderBy(['start.ms', 'end.ms']).toArray(),
});

export const allEventsCount = selector({
  key: 'allEventsCount',
  get: ({ get }) => {
    const events = get(allEvents);
    return events.length;
  },
});

export const eventFilters = atom({
  key: 'eventFilters',
  default: {
    rangeText: 'now to end of next month',
    start: DateTime.now(),
    end: DateTime.now().plus({ months: 1 }).endOf('month'),
    updatedSince: undefined as DateTime | undefined,
    updatedSinceText: undefined as string | undefined,
    showCancelled: false,
    calendarId: undefined as string | undefined,
  },
});

export const allEventFilters = selector({
  key: 'allEventFilters',
  get: ({ get }) => {
    const otherFilters = get(eventFilters);
    return { ...otherFilters, selectedCalendarIds: get(selectedCalendarIds) };
  },
});

export const filteredEvents = selector({
  key: 'filteredEvents',
  get: ({ get }) => {
    const events = get(allEvents);
    const filters = get(allEventFilters);
    const startMs = filters.start.toMillis();
    const endMs = filters.end.toMillis();
    const updatedSinceString = filters.updatedSince?.toUTC()?.toISO();
    const filter = (e: CalendarEvent) => {
      return (
        (filters.showCancelled || e.status != 'cancelled') &&
        (!e.end?.ms || startMs < e.end?.ms) &&
        (!e.start?.ms || e.start?.ms <= endMs) &&
        (!filters.selectedCalendarIds ||
          filters.selectedCalendarIds.includes(e.calendarId)) &&
        (!updatedSinceString || e.updated > updatedSinceString)
      );
    };
    return _.sortBy(events.filter(filter), (e) => [e.start.ms, e.end?.ms]);
  },
});

const objectDiff = (a: object, b: object) =>
  _.fromPairs(_.differenceWith(_.toPairs(a), _.toPairs(b), _.isEqual));

export const settings = atom({
  key: 'settings',
  default: db.settings.toArray().then((s) => {
    const o = {} as any;
    s.forEach((s) => (o[s.id] = s.value));
    return o;
  }),
  effects: [
    ({ onSet, setSelf }) => {
      const updateFunction = (modifications: any, primKey: any) => {
        const newSetting = {} as any;
        newSetting[primKey] = modifications.value;
        console.log('Updating setting', newSetting);
        setSelf((old: object) => {
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

export const selectedCalendarIds = selector({
  key: 'selectedCalendarIds',
  get: ({ get }) => {
    const settingsObject = get(settings) as any;
    return settingsObject.selectedCalendars ?? [];
  },
});

export const selectedCalendars = selector({
  key: 'selectedCalendars',
  get: ({ get }) => {
    const calendarIds = get(selectedCalendarIds);
    const calendars = get(allCalendars);
    return calendarIds.map((id: string) => calendars.find((c) => c.id === id));
  },
});

export const defaultCalendarObject = selector({
  key: 'defaultCalendarObject',
  get: ({ get }) => {
    const id = get(defaultCalendar);
    return get(allCalendars).find((c) => c.id === id);
  },
});

export const defaultCalendar = selector({
  key: 'calendarDefault',
  get: ({ get }) => {
    const settingsObject = get(settings) as any;
    return settingsObject.selectedCalendars?.at(0);
  },
});

export const paperColumns = atom<string[]>({
  key: 'paperColumns',
  default: db.settings.get('paperColumns').then((obj) => obj?.value ?? []),
  effects: [
    ({ onSet, setSelf }) => {
      const updateFunction = (modifications: any, primKey: any) => {
        if (primKey == 'paperColumns') {
          setSelf((old: object) => modifications?.value ?? []);
        }
      };

      db.settings.hook('updating', updateFunction);

      onSet((newValue, oldValue, isReset) => {
        if (newValue !== oldValue) {
          db.settings.put({ id: 'paperColumns', value: newValue });
        }
      });

      return () => {
        db.settings.hook('updating').unsubscribe(updateFunction);
      };
    },
  ],
});
