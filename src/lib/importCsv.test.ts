import { describe, expect, it } from 'vitest';
import { eventIdFor, isImportable, parseCsv } from './importCsv';

describe('parseCsv', () => {
  it('creates all-day events for date-only rows with inclusive end dates', () => {
    const [row] = parseCsv(
      'Subject,Start Date,End Date\nTrip,2026-03-01,2026-03-03\n',
    );
    expect(row.errors).toEqual([]);
    expect(row.event?.start).toEqual({ date: '2026-03-01' });
    expect(row.event?.end).toEqual({ date: '2026-03-04' });
  });

  it('timed events default to one hour and roll past midnight', () => {
    const rows = parseCsv(
      'Subject,Start Date,Start Time,End Time\nA,2026-03-01,10:00,\nB,2026-03-01,23:00,01:00\n',
    );
    const [a, b] = rows.map((r) => r.event!);
    expect(
      Date.parse((a.end as any).dateTime) -
        Date.parse((a.start as any).dateTime),
    ).toBe(3600e3);
    expect(
      Date.parse((b.end as any).dateTime) -
        Date.parse((b.start as any).dateTime),
    ).toBe(2 * 3600e3);
  });

  it('reports rows it cannot parse with their line numbers', () => {
    const rows = parseCsv(
      'Subject,Start Date\nNo date,\nBad,not a date at all\n',
    );
    expect(rows.map((r) => r.line)).toEqual([2, 3]);
    expect(rows.every((r) => r.errors.length === 1 && !r.event)).toBe(true);
  });
});

describe('eventIdFor', () => {
  it('is stable, base32hex-compatible and calendar-specific', async () => {
    const e = {
      summary: 'x',
      start: { date: '2026-03-01' },
      end: { date: '2026-03-02' },
    };
    const a = await eventIdFor('c1', e);
    expect(a).toMatch(/^[0-9a-v]{5,1024}$/);
    expect(await eventIdFor('c1', e)).toBe(a);
    expect(await eventIdFor('c2', e)).not.toBe(a);
  });
});

describe('isImportable', () => {
  it('accepts .csv and .tsv in any case, nothing else', () => {
    expect(isImportable({ name: 'a.CSV' })).toBe(true);
    expect(isImportable({ name: 'b.tsv' })).toBe(true);
    expect(isImportable({ name: 'c.xlsx' })).toBe(false);
    expect(isImportable({ name: 'csv' })).toBe(false);
  });
});
