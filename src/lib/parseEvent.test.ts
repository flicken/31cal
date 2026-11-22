import { DateTime } from 'luxon';
import parseEvent from './parseEvent';

const ms = (v: any) =>
  DateTime.fromISO(v.dateTime, { setZone: true }).toMillis();

test('parses a time with an empty summary', () => {
  const result = parseEvent('tomorrow at 4pm', []);
  expect(result).toHaveProperty('summary', '');
  expect(result).toHaveProperty('start.dateTime');
  expect(result).toHaveProperty('end.dateTime');
});

test('ranges that cross midnight end the next day', () => {
  const r = parseEvent('Friday 11pm-1am party', [])!;
  expect(r.summary).toBe('party');
  expect(ms(r.end) - ms(r.start)).toBe(2 * 3600e3);
});

test('end never precedes start', () => {
  const r = parseEvent('Friday 3pm - 2pm x', [])!;
  expect(ms(r.end)).toBeGreaterThan(ms(r.start));
});

test('explicit time zones are honored and not sent as a zone name', () => {
  const r = parseEvent('March 3 2027 3pm EST call', [])!;
  const start = r.start as { dateTime: string; timeZone?: string };
  expect(DateTime.fromISO(start.dateTime).toUTC().hour).toBe(20);
  expect(start.timeZone).toBeUndefined();
});

test('all-day events end the next day', () => {
  const r = parseEvent('March 3 2027 holiday', [])!;
  expect(r.start).toEqual({ date: '2027-03-03' });
  expect(r.end).toEqual({ date: '2027-03-04' });
});
