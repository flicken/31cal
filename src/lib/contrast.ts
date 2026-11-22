/**
 * WCAG 2 contrast helpers for calendar colors, which come from Google (or
 * the user) and are not guaranteed to be readable.
 * https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */

type RGB = [number, number, number];

/** Parse #rgb or #rrggbb; undefined for anything else. */
export function parseHex(color: string | undefined): RGB | undefined {
  const m = color?.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return undefined;
  const hex =
    m[1].length === 3
      ? m[1]
          .split('')
          .map((c) => c + c)
          .join('')
      : m[1];
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
}

const toHex = (rgb: RGB) =>
  '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance([r, g, b]: RGB): number {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Contrast ratio between two colors, 1 to 21. Unparseable colors give 1. */
export function contrastRatio(a: string, b: string): number {
  const ca = parseHex(a);
  const cb = parseHex(b);
  if (!ca || !cb) return 1;
  const [hi, lo] = [luminance(ca), luminance(cb)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** WCAG AA for normal text. */
export const MIN_CONTRAST = 4.5;

/**
 * Text color for a background: `preferred` if it reaches 4.5:1, otherwise
 * black or white, whichever contrasts more (one of them always passes).
 */
export function readableOn(background: string, preferred?: string): string {
  if (preferred && contrastRatio(preferred, background) >= MIN_CONTRAST) {
    return preferred;
  }
  return contrastRatio('#000000', background) >=
    contrastRatio('#ffffff', background)
    ? '#000000'
    : '#ffffff';
}

/**
 * The color, darkened step by step (mixing toward black keeps the hue)
 * until it reaches 4.5:1 as text on `background` (white by default).
 */
export function readableTextOnWhite(
  color: string,
  background = '#ffffff',
): string {
  const rgb = parseHex(color);
  if (!rgb) return '#000000';
  for (let t = 0; t <= 1; t += 0.05) {
    const candidate = toHex(rgb.map((v) => v * (1 - t)) as RGB);
    if (contrastRatio(candidate, background) >= MIN_CONTRAST) return candidate;
  }
  return '#000000';
}
