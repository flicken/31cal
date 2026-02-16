import { DateTime, Settings } from 'luxon';
import { parseSearchText, toStructuredText, formatDate } from './searchTextParser';

// Fix "now" to a known date for deterministic tests
const NOW = DateTime.local(2026, 2, 10, 12, 0, 0);
beforeEach(() => {
  Settings.now = () => NOW.toMillis();
});
afterEach(() => {
  Settings.now = () => Date.now();
});

describe('parseSearchText', () => {
  test('returns empty object for empty string', () => {
    expect(parseSearchText('')).toEqual({});
  });

  test('returns empty object for whitespace', () => {
    expect(parseSearchText('   ')).toEqual({});
  });

  describe('structured syntax', () => {
    test('parses start: with ISO date', () => {
      const result = parseSearchText('start:2025-06-01');
      expect(result.start?.toISODate()).toBe('2025-06-01');
    });

    test('parses start:now', () => {
      const result = parseSearchText('start:now');
      expect(result.start?.day).toBe(NOW.day);
      expect(result.start?.month).toBe(NOW.month);
      expect(result.start?.year).toBe(NOW.year);
    });

    test('parses end-of: with full date', () => {
      const result = parseSearchText('end-of:2025-06-15');
      expect(result.end?.toISODate()).toBe('2025-06-15');
      // Should be end of that day
      expect(result.end?.hour).toBe(23);
    });

    test('parses end-of: with year-month (end of month)', () => {
      const result = parseSearchText('end-of:2025-03');
      expect(result.end?.toISODate()).toBe('2025-03-31');
    });

    test('parses updated-since:', () => {
      const result = parseSearchText('updated-since:2026-01-01');
      expect(result.updatedSince?.toISODate()).toBe('2026-01-01');
    });

    test('parses all structured fields together', () => {
      const result = parseSearchText('start:2025-01-01 end-of:2025-03 updated-since:2026-01-01');
      expect(result.start?.toISODate()).toBe('2025-01-01');
      expect(result.end?.toISODate()).toBe('2025-03-31');
      expect(result.updatedSince?.toISODate()).toBe('2026-01-01');
    });

    test('returns null-ish fields for invalid ISO dates', () => {
      const result = parseSearchText('start:not-a-date');
      // parseStructured returns non-null (since the regex matches), but start is not set
      expect(result.start).toBeUndefined();
    });
  });

  describe('year-only input', () => {
    test('parses a 4-digit year', () => {
      const result = parseSearchText('2025');
      expect(result.start?.toISODate()).toBe('2025-01-01');
      expect(result.end?.year).toBe(2025);
      expect(result.end?.month).toBe(12);
      expect(result.end?.day).toBe(31);
    });
  });

  // Natural language ranges via chrono-node
  describe('natural language parsing', () => {
    test('parses a month name', () => {
      const result = parseSearchText('march');
      expect(result.start?.month).toBe(3);
      expect(result.start?.day).toBe(1);
      expect(result.end?.month).toBe(3);
    });

    test('parses "until" prefix — start is now', () => {
      const result = parseSearchText('until march');
      expect(result.start?.day).toBe(NOW.day);
      expect(result.end?.month).toBe(3);
    });

    test('parses "through" prefix — start is now', () => {
      const result = parseSearchText('through april');
      expect(result.start?.day).toBe(NOW.day);
      expect(result.end?.month).toBe(4);
    });
  });

  describe('updated since (natural language)', () => {
    test('extracts "updated since" from text', () => {
      const result = parseSearchText('updated since january');
      expect(result.updatedSince).toBeDefined();
      expect(result.updatedSince?.month).toBe(1);
    });

    test('handles "updated-since" with hyphen', () => {
      const result = parseSearchText('updated-since january');
      expect(result.updatedSince).toBeDefined();
      expect(result.updatedSince?.month).toBe(1);
    });
  });
});

describe('toStructuredText', () => {
  test('returns empty string for empty parsed search', () => {
    expect(toStructuredText({})).toBe('');
  });

  test('formats start as "now" when start is today', () => {
    const result = toStructuredText({ start: NOW });
    expect(result).toBe('start:now');
  });

  test('formats start-of-month as year-month', () => {
    const result = toStructuredText({ start: DateTime.local(2025, 3, 1) });
    expect(result).toBe('start:2025-03');
  });

  test('formats non-special start as ISO date', () => {
    const result = toStructuredText({ start: DateTime.local(2025, 3, 15) });
    expect(result).toBe('start:2025-03-15');
  });

  test('formats end-of-month as year-month', () => {
    const result = toStructuredText({ end: DateTime.local(2025, 3, 31).endOf('day') });
    expect(result).toBe('end-of:2025-03');
  });

  test('formats non-end-of-month as ISO date', () => {
    const result = toStructuredText({ end: DateTime.local(2025, 3, 15) });
    expect(result).toBe('end-of:2025-03-15');
  });

  test('formats updatedSince', () => {
    const result = toStructuredText({ updatedSince: DateTime.local(2026, 1, 1) });
    expect(result).toBe('updated-since:2026-01-01');
  });

  test('combines all fields', () => {
    const result = toStructuredText({
      start: DateTime.local(2025, 1, 1),
      end: DateTime.local(2025, 3, 31).endOf('day'),
      updatedSince: DateTime.local(2026, 1, 1),
    });
    expect(result).toBe('start:2025-01 end-of:2025-03 updated-since:2026-01-01');
  });
});

describe('formatDate', () => {
  test('returns "none" for undefined', () => {
    expect(formatDate(undefined)).toBe('none');
  });

  test('returns "now" for today', () => {
    expect(formatDate(NOW)).toBe('now');
  });

  test('returns year-month for start of month', () => {
    expect(formatDate(DateTime.local(2025, 6, 1))).toBe('2025-06');
  });

  test('returns year-month for end of month', () => {
    expect(formatDate(DateTime.local(2025, 6, 30))).toBe('2025-06');
  });

  test('returns ISO date for mid-month dates', () => {
    expect(formatDate(DateTime.local(2025, 6, 15))).toBe('2025-06-15');
  });
});
