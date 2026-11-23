import { dropIndex, Rect } from './useSortableList';

const row = (n: number, w = 60): Map<number, Rect> =>
  new Map(
    Array.from({ length: n }, (_, i) => [
      i,
      { left: i * w, top: 0, width: w, height: 20 },
    ]),
  );

test('staying near the original slot means no move', () => {
  expect(dropIndex(row(3), { x: 95, y: 10 }, 1)).toBe(1);
});

test('dragging over another item targets it', () => {
  expect(dropIndex(row(3), { x: 10, y: 10 }, 2)).toBe(0);
  expect(dropIndex(row(3), { x: 150, y: 10 }, 0)).toBe(2);
});

test('dragging out and back cancels', () => {
  expect(dropIndex(row(3), { x: 31, y: 12 }, 0)).toBe(0);
});

test('works across wrapped rows', () => {
  const rects = new Map<number, Rect>([
    [0, { left: 0, top: 0, width: 100, height: 20 }],
    [1, { left: 100, top: 0, width: 100, height: 20 }],
    [2, { left: 0, top: 24, width: 100, height: 20 }],
  ]);
  expect(dropIndex(rects, { x: 40, y: 34 }, 0)).toBe(2);
});
