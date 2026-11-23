import { CalendarEvent, Calendar } from '../models/types';
import {
  copy,
  editableJson,
  json,
  newSummary,
  remove,
  rename,
  PlanContext,
} from './actions';

const cal = (
  id: string,
  accessRole: Calendar['accessRole'] = 'owner',
): Calendar => ({
  id,
  summary: id.toUpperCase(),
  selected: true,
  timeZone: 'UTC',
  foregroundColor: '#000',
  backgroundColor: '#fff',
  accessRole,
});
const ctx: PlanContext = {
  calendars: new Map([
    ['c1', cal('c1')],
    ['ro', cal('ro', 'reader')],
    ['c2', cal('c2')],
  ]),
};
const ev = (id: string, over: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id,
  calendarId: 'c1',
  summary: `Soccer ${id}`,
  status: 'confirmed',
  updated: '2026-01-01T00:00:00Z',
  start: { dateTime: '2026-03-12T10:00:00Z', ms: 1 },
  end: { dateTime: '2026-03-12T11:00:00Z', ms: 2 },
  ...over,
});

describe('rename', () => {
  it('replaces every match, adds prefix/suffix, skips unchanged', () => {
    expect(
      newSummary('soccer Soccer', {
        find: 'soccer',
        replace: 'Football',
        prefix: '',
        suffix: '',
      }),
    ).toBe('Football Football');
    const plan = rename.plan(
      [ev('a'), ev('b', { summary: 'Choir' })],
      { find: '/^soccer/', replace: 'Football', prefix: '[K] ', suffix: '' },
      ctx,
    );
    expect(plan.unchanged).toBe(0);
    expect(plan.changes.map((c) => c.after.summary)).toEqual([
      '[K] Football a',
      '[K] Choir',
    ]);
    expect(plan.changes[0].patch).toEqual({
      eventId: 'a',
      calendarId: 'c1',
      summary: '[K] Football a',
    });
    expect(
      rename.plan(
        [ev('a')],
        { find: 'xyz', replace: 'q', prefix: '', suffix: '' },
        ctx,
      ).unchanged,
    ).toBe(1);
  });

  it('defaults the search text from the filter', () => {
    const p = rename.defaultParams(
      {
        ...ctx,
        conditions: [{ type: 'text', field: 'summary', value: 'soc' }],
      },
      [],
    );
    expect(p.find).toBe('soc');
  });

  it('warns about repeating events and guests; blocks read-only calendars', () => {
    const [c] = rename.plan(
      [
        ev('a', {
          calendarId: 'ro',
          recurringEventId: 'r',
          attendees: [{ email: 'x@y' }],
        }),
      ],
      { find: '', replace: '', prefix: 'X', suffix: '' },
      ctx,
    ).changes;
    expect(c.warnings).toHaveLength(2);
    expect(c.blocked).toMatch(/can't edit/);
  });
});

test('delete skips already-deleted events', () => {
  const plan = remove.plan(
    [ev('a'), ev('b', { status: 'cancelled' })],
    {},
    ctx,
  );
  expect(plan.changes.map((c) => c.key)).toEqual(['c1/a']);
  expect(plan.unchanged).toBe(1);
});

describe('copy', () => {
  it('builds inserts with string copied-from properties', () => {
    const plan = copy.plan(
      [ev('a')],
      { calendarId: 'c2', prefix: 'Bob - ' },
      ctx,
    );
    const ins = plan.changes[0].insert!;
    expect(ins.calendarId).toBe('c2');
    expect(ins.event.summary).toBe('Bob - Soccer a');
    expect(ins.event.extendedProperties?.private).toEqual({
      '31cal.copiedFromId': 'a',
      '31cal.copiedFromCalendarId': 'c1',
    });
    expect((ins.event.start as any).ms).toBeUndefined();
  });

  it('blocks duplicates and read-only targets; errors without a target', () => {
    const withCopies = { ...ctx, copiedInto: () => new Set(['c1/a']) };
    expect(
      copy.plan([ev('a')], { calendarId: 'c2', prefix: '' }, withCopies)
        .changes[0].blocked,
    ).toMatch(/Already/);
    expect(
      copy.plan([ev('a')], { calendarId: 'ro', prefix: '' }, ctx).changes[0]
        .blocked,
    ).toMatch(/can't add/);
    expect(
      copy.plan([ev('a')], { calendarId: '', prefix: '' }, ctx).error,
    ).toBeTruthy();
  });
});

describe('json', () => {
  it('patches only changed fields and drops read-only ones', () => {
    const plan = json.plan(
      [ev('a', { location: 'Gym' })],
      { json: '{"location":"Field","id":"x","summary":"Soccer a"}' },
      ctx,
    );
    expect(plan.changes[0].patch).toEqual({
      eventId: 'a',
      calendarId: 'c1',
      location: 'Field',
    });
    expect(plan.changes[0].before).toEqual({ location: 'Gym' });
  });

  it('reports invalid JSON and warns about bulk time changes', () => {
    expect(json.plan([ev('a')], { json: '{' }, ctx).error).toMatch(/not valid/);
    expect(json.plan([ev('a')], { json: '[1]' }, ctx).error).toBeTruthy();
    const plan = json.plan(
      [ev('a'), ev('b')],
      { json: '{"start":{"dateTime":"2026-04-01T10:00:00Z"}}' },
      ctx,
    );
    expect(plan.changes[0].warnings.some((w) => /same start/.test(w))).toBe(
      true,
    );
  });

  it('editableJson omits identity and local fields', () => {
    const obj = JSON.parse(editableJson(ev('a', { _schedules: ['x'] })));
    expect(obj.id).toBeUndefined();
    expect(obj._schedules).toBeUndefined();
    expect(obj.start.ms).toBeUndefined();
  });
});
