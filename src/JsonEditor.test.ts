import { expect, test } from 'vitest';
import { jsonError } from './JsonEditor';

test('jsonError is empty for valid JSON and describes invalid JSON', () => {
  expect(jsonError('{"summary": "x"}')).toBe('');
  expect(jsonError('{"summary": }')).not.toBe('');
});
