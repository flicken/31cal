/**
 * Pipeline selection, stored as a default plus exceptions so it survives
 * filter changes: "all matching except these 3" or "none except these 5".
 *
 * - Events newly matching the filter follow the default.
 * - Exceptions for events that stop matching are kept (so widening the filter
 *   again restores them) but never count: counts only consider `keys`.
 */
export type Selection = {
  mode: 'all' | 'none';
  exceptions: ReadonlySet<string>;
};

export const ALL: Selection = { mode: 'all', exceptions: new Set() };
export const NONE: Selection = { mode: 'none', exceptions: new Set() };

export function isSelected(sel: Selection, key: string): boolean {
  return (sel.mode === 'all') !== sel.exceptions.has(key);
}

/** Set the given keys on or off, keeping every other choice. */
export function setMany(
  sel: Selection,
  keys: Iterable<string>,
  on: boolean,
): Selection {
  const exceptions = new Set(sel.exceptions);
  const isDefault = on === (sel.mode === 'all');
  for (const k of keys) {
    if (isDefault) exceptions.delete(k);
    else exceptions.add(k);
  }
  return { mode: sel.mode, exceptions };
}

export function toggle(sel: Selection, key: string): Selection {
  return setMany(sel, [key], !isSelected(sel, key));
}

/** Keys from `anchor` to `target` inclusive, in list order. */
export function rangeKeys(
  ordered: readonly string[],
  anchor: string,
  target: string,
): string[] {
  const a = ordered.indexOf(anchor);
  const b = ordered.indexOf(target);
  if (a < 0 || b < 0) return [target];
  const [from, to] = a <= b ? [a, b] : [b, a];
  return ordered.slice(from, to + 1);
}

/** Shift-click: give the whole range the state the target is switching to. */
export function selectRange(
  sel: Selection,
  ordered: readonly string[],
  anchor: string,
  target: string,
): Selection {
  return setMany(
    sel,
    rangeKeys(ordered, anchor, target),
    !isSelected(sel, target),
  );
}

/** A group (day, series) checkbox: all on unless all are already on. */
export function toggleGroup(
  sel: Selection,
  keys: readonly string[],
): Selection {
  const allOn = keys.length > 0 && keys.every((k) => isSelected(sel, k));
  return setMany(sel, keys, !allOn);
}

export type GroupState = 'all' | 'some' | 'none';

export function groupState(
  sel: Selection,
  keys: readonly string[],
): GroupState {
  const n = keys.filter((k) => isSelected(sel, k)).length;
  return n === 0 ? 'none' : n === keys.length ? 'all' : 'some';
}

export type Counts = {
  total: number;
  selected: number;
  /** Matching events deselected from an "all" default. */
  excluded: number;
  /** Matching events picked out of a "none" default. */
  added: number;
};

export function counts(sel: Selection, keys: readonly string[]): Counts {
  let selected = 0;
  let exceptions = 0;
  for (const k of keys) {
    if (isSelected(sel, k)) selected++;
    if (sel.exceptions.has(k)) exceptions++;
  }
  return {
    total: keys.length,
    selected,
    excluded: sel.mode === 'all' ? exceptions : 0,
    added: sel.mode === 'none' ? exceptions : 0,
  };
}

/** "37 of 40 selected · 3 excluded" */
export function countsText(c: Counts): string {
  const parts = [`${c.selected} of ${c.total} selected`];
  if (c.excluded) parts.push(`${c.excluded} excluded`);
  return parts.join(' · ');
}

/** Keep only `keys` selected (e.g. the rows that failed a run). */
export function only(keys: Iterable<string>): Selection {
  return { mode: 'none', exceptions: new Set(keys) };
}
