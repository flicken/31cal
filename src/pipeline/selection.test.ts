import {
  ALL,
  NONE,
  counts,
  countsText,
  groupState,
  isSelected,
  only,
  selectRange,
  setMany,
  toggle,
  toggleGroup,
} from './selection';

const keys = ['a', 'b', 'c', 'd', 'e'];

test('starts with everything selected', () => {
  expect(keys.every((k) => isSelected(ALL, k))).toBe(true);
  expect(countsText(counts(ALL, keys))).toBe('5 of 5 selected');
});

test('toggling records exceptions and counts them', () => {
  const s = toggle(toggle(ALL, 'b'), 'd');
  expect(isSelected(s, 'b')).toBe(false);
  expect(countsText(counts(s, keys))).toBe('3 of 5 selected · 2 excluded');
  expect(toggle(s, 'b').exceptions.has('b')).toBe(false);
});

test('exceptions survive filter changes but only matching keys count', () => {
  const s = toggle(ALL, 'z'); // z no longer matches
  expect(counts(s, keys)).toEqual({
    total: 5,
    selected: 5,
    excluded: 0,
    added: 0,
  });
  // New matches follow the default
  expect(isSelected(s, 'new')).toBe(true);
  // Widening the filter again restores the exclusion
  expect(isSelected(s, 'z')).toBe(false);
});

test('none mode picks individual events', () => {
  const s = setMany(NONE, ['a', 'c'], true);
  expect(counts(s, keys)).toEqual({
    total: 5,
    selected: 2,
    excluded: 0,
    added: 2,
  });
});

test('shift-click range applies the target state', () => {
  const s = selectRange(ALL, keys, 'b', 'd');
  expect(keys.map((k) => isSelected(s, k))).toEqual([
    true,
    false,
    false,
    false,
    true,
  ]);
  const back = selectRange(s, keys, 'd', 'b');
  expect(keys.every((k) => isSelected(back, k))).toBe(true);
});

test('group checkbox toggles a whole day', () => {
  const day = ['b', 'c'];
  expect(groupState(ALL, day)).toBe('all');
  const s = toggleGroup(ALL, day);
  expect(groupState(s, day)).toBe('none');
  expect(groupState(toggle(s, 'b'), day)).toBe('some');
  expect(groupState(toggleGroup(toggle(s, 'b'), day), day)).toBe('all');
});

test('only() keeps just the given keys', () => {
  const s = only(['c']);
  expect(keys.filter((k) => isSelected(s, k))).toEqual(['c']);
});
