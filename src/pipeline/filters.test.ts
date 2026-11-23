import { DateTime, Settings } from 'luxon';
import { CalendarEvent } from '../models/types';
import {
  Condition,
  compile,
  describe as describeCondition,
  fromSearchParams,
  matches,
  textPattern,
  toSearchParams,
} from './filters';

const NOW = DateTime.local(2026, 3, 10, 12);
beforeEach(() => {
  Settings.now = () => NOW.toMillis();
});
afterEach(() => {
  Settings.now = () => Date.now();
});

function ev(over: Partial<CalendarEvent> = {}): CalendarEvent {
  const s = DateTime.local(2026, 3, 12, 10);
  return {
    id: 'e1',
    calendarId: 'c1',
    summary: 'Soccer practice',
    status: 'confirmed',
    updated: '2026-03-01T00:00:00Z',
    start: { dateTime: s.toISO()!, ms: s.toMillis() },
    end: {
      dateTime: s.plus({ hours: 1 }).toISO()!,
      ms: s.plus({ hours: 1 }).toMillis(),
    },
    ...over,
  };
}

describe('matches', () => {
  it('excludes cancelled events unless asked', () => {
    const e = ev({ status: 'cancelled' });
    expect(matches(e, [])).toBe(false);
    expect(matches(e, [{ type: 'cancelled', value: 'include' }])).toBe(true);
    expect(matches(ev(), [{ type: 'cancelled', value: 'only' }])).toBe(false);
  });

  it('filters by date range text and calendars', () => {
    expect(matches(ev(), [{ type: 'dates', text: 'this week' }])).toBe(true);
    expect(matches(ev(), [{ type: 'dates', text: 'next month' }])).toBe(false);
    expect(matches(ev(), [{ type: 'calendars', ids: ['c2'] }])).toBe(false);
    expect(matches(ev(), [{ type: 'calendars', ids: ['c1', 'c2'] }])).toBe(
      true,
    );
  });

  it('matches text plainly or as /regex/, per field', () => {
    const e = ev({
      location: 'Field 3 (north)',
      attendees: [{ email: 'coach@x.org' }],
    });
    const t = (field: any, value: string) =>
      matches(e, [{ type: 'text', field, value }]);
    expect(t('summary', 'soccer')).toBe(true);
    expect(t('summary', 'field')).toBe(false);
    expect(t('location', '(north)')).toBe(true); // literal, not a broken regex
    expect(t('any', '/^soc+er/')).toBe(true);
    expect(t('guests', 'coach@')).toBe(true);
  });

  it('handles the yes/no conditions', () => {
    const rec = ev({ recurringEventId: 'r1' });
    expect(matches(rec, [{ type: 'recurring', value: true }])).toBe(true);
    expect(matches(ev(), [{ type: 'recurring', value: true }])).toBe(false);
    const allDay = ev({
      start: { date: '2026-03-12', ms: 1 },
      end: { date: '2026-03-13', ms: 2 },
    });
    expect(matches(allDay, [{ type: 'allDay', value: true }])).toBe(true);
    const guests = ev({
      attendees: [{ email: 'a@x' }],
      organizer: { email: 'me@x', self: true },
    });
    expect(matches(guests, [{ type: 'hasGuests', value: true }])).toBe(true);
    expect(matches(guests, [{ type: 'iOrganize', value: true }])).toBe(true);
    expect(
      matches(
        ev({ organizer: { email: 'me@x' } }),
        [{ type: 'iOrganize', value: true }],
        {
          userEmail: 'me@x',
        },
      ),
    ).toBe(true);
    expect(matches(ev(), [{ type: 'iOrganize', value: true }])).toBe(false);
  });

  it('matches schedules, copies and updated-since', () => {
    expect(
      matches(ev({ _schedules: ['Choir'] }), [
        { type: 'schedule', name: 'Choir' },
      ]),
    ).toBe(true);
    const copy = ev({
      extendedProperties: {
        private: {
          '31cal.copiedFromId': 'x',
          '31cal.copiedFromCalendarId': 'c9',
        },
      },
    });
    expect(matches(copy, [{ type: 'copied', value: true }])).toBe(true);
    expect(matches(ev(), [{ type: 'copied', value: true }])).toBe(false);
    expect(matches(ev(), [{ type: 'updatedSince', text: 'march 5' }])).toBe(
      false,
    );
    expect(matches(ev(), [{ type: 'updatedSince', text: 'february 20' }])).toBe(
      true,
    );
  });

  it('ANDs conditions', () => {
    const conds: Condition[] = [
      { type: 'text', field: 'summary', value: 'soccer' },
      { type: 'recurring', value: true },
    ];
    expect(compile(conds)(ev())).toBe(false);
    expect(compile(conds)(ev({ recurringEventId: 'r' }))).toBe(true);
  });
});

describe('URL round-trip', () => {
  it('keeps order and values', () => {
    const conds: Condition[] = [
      { type: 'dates', text: 'next month' },
      { type: 'calendars', ids: ['a@group', 'b'] },
      { type: 'text', field: 'summary', value: '/soc+er/' },
      { type: 'text', field: 'any', value: 'field 3' },
      { type: 'recurring', value: false },
      { type: 'allDay', value: true },
      { type: 'hasGuests', value: true },
      { type: 'iOrganize', value: false },
      { type: 'cancelled', value: 'include' },
      { type: 'schedule', name: 'Choir' },
      { type: 'updatedSince', text: 'yesterday' },
      { type: 'copied', value: true },
    ];
    const qs = toSearchParams(conds).toString();
    expect(fromSearchParams(new URLSearchParams(qs))).toEqual(conds);
  });

  it('ignores unknown or malformed params and duplicate singletons', () => {
    const p = new URLSearchParams(
      'recurring=maybe&foo=1&dates=today&dates=tomorrow&summary=a&summary=b',
    );
    expect(fromSearchParams(p)).toEqual([
      { type: 'dates', text: 'today' },
      { type: 'text', field: 'summary', value: 'a' },
      { type: 'text', field: 'summary', value: 'b' },
    ]);
  });
});

test('textPattern treats plain text literally', () => {
  expect(textPattern('a.b').regex.test('axb')).toBe(false);
  expect(textPattern('/a.b/').regex.test('axb')).toBe(true);
  expect(textPattern('/(/').error).toBeTruthy();
});

test('describe gives readable chip text', () => {
  expect(
    describeCondition({ type: 'text', field: 'summary', value: 'x' }),
  ).toBe('summary contains “x”');
  expect(
    describeCondition({ type: 'calendars', ids: ['a'] }, () => 'Home'),
  ).toBe('Home');
});
