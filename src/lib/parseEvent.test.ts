import React from 'react';

import parseEvent from './parseEvent';

test('parseEvent', () => {
  expect(parseEvent('tomorrow at 4pm', [])).toBe(1);
});
