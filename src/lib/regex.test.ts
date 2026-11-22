import { describe, expect, it } from 'vitest';
import { safeRegExp } from './regex';

describe('safeRegExp', () => {
  it('keeps valid patterns', () => {
    expect(safeRegExp('a.c').regex.test('ABC')).toBe(true);
  });
  it('falls back to a literal match for invalid patterns', () => {
    const { regex, error } = safeRegExp('(x');
    expect(error).toBeTruthy();
    expect(regex.test('a(x')).toBe(true);
  });
});
