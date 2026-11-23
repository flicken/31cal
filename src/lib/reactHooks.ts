/**
 * Small hooks vendored from usehooks-ts (only the ones we use), so the app
 * doesn't depend on an unmaintained package.
 */
import {
  RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

/** setInterval that always calls the latest callback; `null` pauses it. */
export function useInterval(callback: () => void, delay: number | null) {
  const saved = useRef(callback);
  useLayoutEffect(() => {
    saved.current = callback;
  }, [callback]);
  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => saved.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

/** Fired on window when this tab changes a key (the native `storage` event only fires in other tabs). */
export const LOCAL_STORAGE_EVENT = 'local-storage';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null || raw === 'undefined') return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * JSON value in localStorage, kept in sync across hooks in this tab and
 * across tabs. Returns [value, set, remove]; remove resets to `initial`.
 */
export function useLocalStorage<T>(
  key: string,
  initial: T,
): [T, (value: T | ((old: T) => T)) => void, () => void] {
  const initialRef = useRef(initial);
  const [value, setStored] = useState<T>(() => readJson(key, initial));

  useEffect(() => {
    const onChange = (e: Event) => {
      const changed = (e as StorageEvent).key;
      if (changed && changed !== key) return;
      setStored(readJson(key, initialRef.current));
    };
    setStored(readJson(key, initialRef.current));
    window.addEventListener('storage', onChange);
    window.addEventListener(LOCAL_STORAGE_EVENT, onChange);
    return () => {
      window.removeEventListener('storage', onChange);
      window.removeEventListener(LOCAL_STORAGE_EVENT, onChange);
    };
  }, [key]);

  const set = useCallback(
    (next: T | ((old: T) => T)) => {
      const resolved =
        next instanceof Function
          ? next(readJson(key, initialRef.current))
          : next;
      try {
        window.localStorage.setItem(key, JSON.stringify(resolved));
      } catch {
        // Storage full or blocked: keep the in-memory value.
      }
      setStored(resolved);
      window.dispatchEvent(new StorageEvent(LOCAL_STORAGE_EVENT, { key }));
    },
    [key],
  );

  const remove = useCallback(() => {
    window.localStorage.removeItem(key);
    setStored(initialRef.current);
    window.dispatchEvent(new StorageEvent(LOCAL_STORAGE_EVENT, { key }));
  }, [key]);

  return [value, set, remove];
}

/** Whether a CSS media query matches, updating on change. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', notify);
      return () => mql.removeEventListener('change', notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Call `handler` on a mousedown/touchstart outside the referenced element. */
export function useOnClickOutside(
  ref: RefObject<HTMLElement | null>,
  handler: (event: MouseEvent | TouchEvent) => void,
) {
  const saved = useRef(handler);
  useLayoutEffect(() => {
    saved.current = handler;
  }, [handler]);
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target || !target.isConnected) return;
      if (ref.current && !ref.current.contains(target)) saved.current(event);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref]);
}
