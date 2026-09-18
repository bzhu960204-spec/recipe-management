import { describe, expect, it } from 'vitest';
import { formatAmount, formatDuration, formatQuantity, scaleFactor } from './quantity';

describe('formatQuantity', () => {
  it('renders common fractions as glyphs', () => {
    expect(formatQuantity(0.5)).toBe('½');
    expect(formatQuantity(0.25)).toBe('¼');
    expect(formatQuantity(0.75)).toBe('¾');
    expect(formatQuantity(0.125)).toBe('⅛');
  });

  it('renders mixed numbers without a space before the glyph', () => {
    expect(formatQuantity(1.5)).toBe('1½');
    expect(formatQuantity(2.25)).toBe('2¼');
  });

  it('keeps whole numbers clean', () => {
    expect(formatQuantity(3)).toBe('3');
    expect(formatQuantity(12)).toBe('12');
  });

  it('approximates repeating thirds', () => {
    expect(formatQuantity(1 / 3)).toBe('⅓');
    expect(formatQuantity(2 / 3)).toBe('⅔');
    expect(formatQuantity(1 + 1 / 3)).toBe('1⅓');
  });

  it('falls back to a decimal when no common fraction fits', () => {
    expect(formatQuantity(0.07)).toBe('0.07');
  });

  it('returns an empty string for missing values', () => {
    expect(formatQuantity(null)).toBe('');
    expect(formatQuantity(undefined)).toBe('');
  });
});

describe('scaleFactor', () => {
  it('divides target by base', () => {
    expect(scaleFactor(4, 8)).toBe(2);
    expect(scaleFactor(12, 6)).toBe(0.5);
  });

  it('falls back to 1 when the base is missing or zero', () => {
    expect(scaleFactor(null, 4)).toBe(1);
    expect(scaleFactor(0, 4)).toBe(1);
  });
});

describe('formatAmount', () => {
  const cupsOfFlour = { quantityMin: 1.5, quantityMax: null, unit: 'cups', scalable: true };

  it('scales and formats together', () => {
    expect(formatAmount(cupsOfFlour, 1)).toBe('1½ cups');
    expect(formatAmount(cupsOfFlour, 2)).toBe('3 cups');
    expect(formatAmount(cupsOfFlour, 1 / 3)).toBe('½ cups');
  });

  it('leaves non-scalable amounts alone', () => {
    const oil = { quantityMin: 2, quantityMax: null, unit: 'cups', scalable: false };
    expect(formatAmount(oil, 4)).toBe('2 cups');
  });

  it('keeps ranges as ranges', () => {
    const garlic = { quantityMin: 2, quantityMax: 3, unit: 'cloves', scalable: true };
    expect(formatAmount(garlic, 2)).toBe('4–6 cloves');
  });

  it('omits the unit when there is none', () => {
    const eggs = { quantityMin: 2, quantityMax: null, unit: null, scalable: true };
    expect(formatAmount(eggs, 1.5)).toBe('3');
  });

  it('returns nothing when there is no amount at all', () => {
    const toTaste = { quantityMin: null, quantityMax: null, unit: null, scalable: false };
    expect(formatAmount(toTaste, 2)).toBe('');
  });

  it('treats omitted fields the same as null', () => {
    // The API strips null properties, so absent means "no value", not "zero".
    const soySauce = { quantityMin: 1, quantityMax: undefined, unit: 'cup', scalable: true };
    expect(formatAmount(soySauce, 1)).toBe('1 cup');

    const salt = { quantityMin: undefined, quantityMax: undefined, unit: undefined, scalable: false };
    expect(formatAmount(salt, 2)).toBe('');
  });
});

describe('formatDuration', () => {
  it('formats minutes and hours', () => {
    expect(formatDuration(600)).toBe('10 min');
    expect(formatDuration(3600)).toBe('1 hr');
    expect(formatDuration(6000)).toBe('1 hr 40 min');
  });

  it('returns an empty string for no duration', () => {
    expect(formatDuration(null)).toBe('');
    expect(formatDuration(0)).toBe('');
  });
});
