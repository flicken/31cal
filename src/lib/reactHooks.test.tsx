import React, { act, useEffect } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { useLocalStorage } from './reactHooks';

// Minimal renderer (no testing-library dependency).
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  localStorage.clear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

type Api = ReturnType<typeof useLocalStorage<string | null>>;
function Probe({
  id,
  onApi,
}: {
  id: string;
  onApi: (id: string, api: Api) => void;
}) {
  const api = useLocalStorage<string | null>('k', null);
  useEffect(() => onApi(id, api));
  return <span data-id={id}>{String(api[0])}</span>;
}
const capture = (out: Record<string, Api>) => (id: string, api: Api) => {
  out[id] = api;
};
const text = (id: string) =>
  container.querySelector(`[data-id=${id}]`)!.textContent;

test('reads the stored JSON value initially', () => {
  localStorage.setItem('k', JSON.stringify('hello'));
  const out: Record<string, Api> = {};
  act(() => root.render(<Probe id="a" onApi={capture(out)} />));
  expect(text('a')).toBe('hello');
});

test('set and remove update every hook in the same tab', () => {
  const out: Record<string, Api> = {};
  act(() =>
    root.render(
      <>
        <Probe id="a" onApi={capture(out)} />
        <Probe id="b" onApi={capture(out)} />
      </>,
    ),
  );
  act(() => out.a[1]('x'));
  expect(text('a')).toBe('x');
  expect(text('b')).toBe('x');
  expect(localStorage.getItem('k')).toBe('"x"');
  act(() => out.b[1]((old) => `${old}y`));
  expect(text('a')).toBe('xy');
  act(() => out.a[2]());
  expect(text('b')).toBe('null');
  expect(localStorage.getItem('k')).toBeNull();
});

test('follows changes made in another tab (storage event)', () => {
  const out: Record<string, Api> = {};
  act(() => root.render(<Probe id="a" onApi={capture(out)} />));
  act(() => {
    localStorage.setItem('k', JSON.stringify('from other tab'));
    window.dispatchEvent(new StorageEvent('storage', { key: 'k' }));
  });
  expect(text('a')).toBe('from other tab');
  act(() => {
    localStorage.setItem('other', '1');
    window.dispatchEvent(new StorageEvent('storage', { key: 'other' }));
  });
  expect(text('a')).toBe('from other tab');
});

test('falls back to the initial value on malformed JSON', () => {
  localStorage.setItem('k', '{not json');
  const out: Record<string, Api> = {};
  act(() => root.render(<Probe id="a" onApi={capture(out)} />));
  expect(text('a')).toBe('null');
});
