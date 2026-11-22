import { expect, test } from 'vitest';
import { shouldAutoReload } from './newVersion';

test('reloads when there was no earlier automatic reload', () => {
  expect(shouldAutoReload(1_000_000, undefined)).toBe(true);
  expect(shouldAutoReload(1_000_000, NaN)).toBe(true);
});

test('does not reload twice within 60 seconds', () => {
  expect(shouldAutoReload(1_000_000, 1_000_000 - 59_999)).toBe(false);
  expect(shouldAutoReload(1_000_000, 1_000_000 - 60_000)).toBe(true);
});

test('a last-reload time in the future (clock change) allows a reload', () => {
  expect(shouldAutoReload(1_000_000, 2_000_000)).toBe(true);
});
