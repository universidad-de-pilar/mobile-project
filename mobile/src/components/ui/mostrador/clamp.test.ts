import { clamp } from './clamp';

describe('clamp', () => {
  it('keeps values inside the range', () => {
    expect(clamp(3, 1, 5)).toBe(3);
  });

  it('limits values to min and max', () => {
    expect(clamp(0, 1, 5)).toBe(1);
    expect(clamp(9, 1, 5)).toBe(5);
  });
});
