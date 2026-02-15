export function pick<T extends object>(
  obj: T,
  ...keys: string[] | [string[]]
): Partial<T> {
  const actualKeys: string[] = Array.isArray(keys[0])
    ? (keys[0] as string[])
    : (keys as string[]);
  return Object.fromEntries(
    actualKeys.map((k) => [k, (obj as any)[k]]),
  ) as Partial<T>;
}

export function keyBy<T>(
  arr: T[] | undefined,
  key: keyof T,
): Record<string, T> {
  if (!arr) return {} as Record<string, T>;
  return Object.fromEntries(arr.map((item) => [item[key], item]));
}

export function sortBy<T>(arr: T[], fn: (item: T) => any): T[] {
  return [...arr].sort((a, b) => {
    const aVal = fn(a);
    const bVal = fn(b);
    if (Array.isArray(aVal) && Array.isArray(bVal)) {
      for (let i = 0; i < Math.max(aVal.length, bVal.length); i++) {
        if (aVal[i] < bVal[i]) return -1;
        if (aVal[i] > bVal[i]) return 1;
      }
      return 0;
    }
    if (aVal < bVal) return -1;
    if (aVal > bVal) return 1;
    return 0;
  });
}

export function countBy<T>(
  arr: T[],
  fn: (item: T) => string,
): Record<string, number> {
  return arr.reduce(
    (acc, item) => {
      const key = fn(item);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
}

export function intersection<T>(a: T[], b: T[]): T[] {
  const set = new Set(b);
  return a.filter((x) => set.has(x));
}

export function max<T>(arr: T[] | undefined): T | undefined {
  if (!arr || arr.length === 0) return undefined;
  return arr.reduce((a, b) => (a > b ? a : b));
}

export function isEmpty(
  value: string | any[] | object | null | undefined,
): boolean {
  if (value == null) return true;
  if (typeof value === 'string' || Array.isArray(value))
    return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return true;
}

export function sample<T>(arr: T[]): T | undefined {
  return arr[Math.floor(Math.random() * arr.length)];
}
