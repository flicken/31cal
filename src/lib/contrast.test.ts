import { describe, expect, test } from 'vitest';
import {
  contrastRatio,
  MIN_CONTRAST,
  parseHex,
  readableOn,
  readableTextOnWhite,
} from './contrast';
import { RECURRING_COLOR, SINGLE_COLOR } from './paperColors';

/** backgroundColor of the 24 calendar colors in Google's calendar.colors. */
const GOOGLE_CALENDAR_PALETTE = [
  '#ac725e',
  '#d06b64',
  '#f83a22',
  '#fa573c',
  '#ff7537',
  '#ffad46',
  '#42d692',
  '#16a765',
  '#7bd148',
  '#b3dc6c',
  '#fbe983',
  '#fad165',
  '#92e1c0',
  '#9fe1e7',
  '#9fc6e7',
  '#4986e7',
  '#9a9cff',
  '#b99aff',
  '#c2c2c2',
  '#cabdbf',
  '#cca6ac',
  '#f691b2',
  '#cd74e6',
  '#a47ae2',
];
/** Google's foregroundColor for every calendar color. */
const GOOGLE_FOREGROUND = '#1d1d1d';

test('parses short and long hex, rejects others', () => {
  expect(parseHex('#fff')).toEqual([255, 255, 255]);
  expect(parseHex('#1D1D1D')).toEqual([29, 29, 29]);
  expect(parseHex('red')).toBeUndefined();
});

test('known ratios', () => {
  expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 5);
  expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
  expect(contrastRatio('#777777', '#ffffff')).toBeLessThan(MIN_CONTRAST);
});

test('readableOn keeps a good preferred color and otherwise picks black or white', () => {
  expect(readableOn('#ffffff', '#1d1d1d')).toBe('#1d1d1d');
  expect(readableOn('#ffffff', '#ffff00')).toBe('#000000');
  expect(readableOn('#000080', '#000000')).toBe('#ffffff');
  expect(readableOn('#ffad46')).toBe('#000000');
});

describe('Google calendar palette', () => {
  test.each(GOOGLE_CALENDAR_PALETTE)(
    '%s is readable as a chip and as text',
    (bg) => {
      expect(
        contrastRatio(readableOn(bg, GOOGLE_FOREGROUND), bg),
      ).toBeGreaterThanOrEqual(MIN_CONTRAST);
      expect(
        contrastRatio(readableOn(bg, '#ffffff'), bg),
      ).toBeGreaterThanOrEqual(MIN_CONTRAST);
      const text = readableTextOnWhite(bg);
      expect(contrastRatio(text, '#ffffff')).toBeGreaterThanOrEqual(
        MIN_CONTRAST,
      );
    },
  );
});

test('readableTextOnWhite keeps colors that already pass', () => {
  expect(readableTextOnWhite('#000080')).toBe('#000080');
});

test('Paper recurring/single colors pass on both row backgrounds', () => {
  for (const c of [RECURRING_COLOR, SINGLE_COLOR]) {
    expect(contrastRatio(c, '#ffffff')).toBeGreaterThanOrEqual(MIN_CONTRAST);
    expect(contrastRatio(c, '#f2f2f2')).toBeGreaterThanOrEqual(MIN_CONTRAST);
  }
});
