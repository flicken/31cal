import { describeSyncError } from './syncErrors';

test('maps common failures to plain language', () => {
  expect(
    describeSyncError({ error: 'Not signed in', errorStatus: 0 }).summary,
  ).toBe('Not signed in');
  expect(
    describeSyncError({ error: 'Invalid Credentials', errorStatus: 401 }).hint,
  ).toMatch(/Reconnect/);
  expect(
    describeSyncError({ error: 'Rate Limit Exceeded', errorStatus: 403 })
      .summary,
  ).toBe('Google rate limit');
  expect(
    describeSyncError({ error: 'Forbidden', errorStatus: 403 }).summary,
  ).toBe('Google refused access');
  expect(
    describeSyncError({ error: 'Not Found', errorStatus: 404 }).summary,
  ).toBe('Calendar not found');
  expect(
    describeSyncError({ error: 'Backend Error', errorStatus: 503 }).summary,
  ).toBe('Google is having problems');
  expect(
    describeSyncError({ error: 'Failed to fetch', errorStatus: -1 }).summary,
  ).toBe("Can't reach Google");
});

test('keeps the raw message as detail, and falls back to it', () => {
  expect(
    describeSyncError({ error: 'Not Found', errorStatus: 404 }).detail,
  ).toBe('Not Found');
  expect(describeSyncError({ error: 'Something odd' }).summary).toBe(
    'Something odd',
  );
});
