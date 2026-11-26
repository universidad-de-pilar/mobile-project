import { formatCents, formatPrice } from './format-price';

describe('formatCents', () => {
  it('converts cents to a price', () => {
    expect(formatCents(0)).toBe('$0');
    expect(formatCents(650000)).toBe('$6.500');
    expect(formatCents(150050)).toBe('$1.500,50');
  });
});

describe('formatPrice', () => {
  it('formats integers without decimals', () => {
    expect(formatPrice('24500.00')).toBe('$24.500');
    expect(formatPrice('0.00')).toBe('$0');
    expect(formatPrice('1000000')).toBe('$1.000.000');
  });

  it('keeps decimals with a comma', () => {
    expect(formatPrice('1500.50')).toBe('$1.500,50');
    expect(formatPrice('10.5')).toBe('$10,50');
  });

  it('returns unparseable input unchanged', () => {
    expect(formatPrice('abc')).toBe('abc');
    expect(formatPrice('')).toBe('');
  });
});
