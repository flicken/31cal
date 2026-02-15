import React from 'react';

import parseEvent from './parseEvent';

test('parseEvent', () => {
  const result = parseEvent('tomorrow at 4pm', []);
  expect(result).toHaveProperty('summary', '');
  expect(result).toHaveProperty('start.dateTime');
  expect(result).toHaveProperty('end.dateTime');
});
