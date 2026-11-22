import { DateTime } from 'luxon';
import { describe, expect, test } from 'vitest';
import { CalendarEvent } from '../models/types';
import parseEvent from './parseEvent';
import { parseSearchText } from './searchTextParser';
import { BULK_EXAMPLES, SEARCH_EXAMPLES } from './syntaxExamples';

const isUpdatedSince = (t: string) => t.startsWith('updated since');

describe('search range examples parse to a range', () => {
  test.each(SEARCH_EXAMPLES.filter((t) => !isUpdatedSince(t)))('%s', (text) => {
    const r = parseSearchText(text);
    expect(r.start?.isValid).toBe(true);
    expect(r.end?.isValid).toBe(true);
    expect(+r.end!).toBeGreaterThan(+r.start!);
  });
});

describe('search "updated since" examples parse', () => {
  test.each(SEARCH_EXAMPLES.filter(isUpdatedSince))('%s', (text) => {
    expect(parseSearchText(text).updatedSince?.isValid).toBe(true);
  });
});

describe('bulk entry examples do what the help says', () => {
  // Parse in order, like the textarea: each line uses the previous as context.
  const parsed: Partial<CalendarEvent>[] = [];
  for (const { text } of BULK_EXAMPLES) {
    const r = parseEvent(text, parsed as CalendarEvent[]);
    parsed.push(r!);
  }
  const byText = Object.fromEntries(
    BULK_EXAMPLES.map((e, i) => [e.text, parsed[i]]),
  );
  const ms = (v: any) =>
    DateTime.fromISO(v.dateTime, { setZone: true }).toMillis();

  test('every example parses with a title', () => {
    parsed.forEach((p) => expect(p?.summary).toBeTruthy());
  });
  test('single time is one hour', () => {
    const r = byText['Sat 3pm Soccer practice'];
    expect(r.summary).toBe('Soccer practice');
    expect(ms(r.end) - ms(r.start)).toBe(3600e3);
  });
  test('time range', () => {
    const r = byText['Oct 3 7-9pm Concert'];
    expect(ms(r.end) - ms(r.start)).toBe(2 * 3600e3);
  });
  test('no date continues after the previous line', () => {
    const prev = byText['Oct 3 7-9pm Concert'] as any;
    const r = byText['9:30pm Drinks'] as any;
    expect(r.start.dateTime.slice(0, 10)).toBe(
      prev.start.dateTime.slice(0, 10),
    );
    expect(ms(r.start)).toBeGreaterThan(ms(prev.start));
  });
  test('no time is all day', () => {
    const r = byText['tomorrow Trip'] as any;
    expect(r.start.date).toBeTruthy();
    expect(r.end.date).toBe(
      DateTime.fromISO(r.start.date).plus({ days: 1 }).toISODate(),
    );
  });
  test('crossing midnight ends the next day', () => {
    const r = byText['Friday 11pm-1am Party'];
    expect(ms(r.end) - ms(r.start)).toBe(2 * 3600e3);
  });
  test('explicit time zone', () => {
    const r = byText['March 3 3pm EST Call'] as any;
    expect(r.start.dateTime).toMatch(/T15:00:00\.000-05:00$/);
    expect(r.start.timeZone).toBeUndefined();
  });
});
