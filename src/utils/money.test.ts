import { describe, it, expect } from 'vitest';
import { roundMoney, sumMoney, splitEqual, formatMoney } from './money';

describe('roundMoney', () => {
  it('rounds to 2 decimal places', () => {
    expect(roundMoney(1.234)).toBe(1.23);
    expect(roundMoney(1.235)).toBe(1.24);
    expect(roundMoney(1.005)).toBe(1.01); // classic floating-point edge case
  });

  it('handles the 10 - 9.8 case', () => {
    expect(roundMoney(10 - 9.8)).toBe(0.2);
  });

  it('handles negative values', () => {
    expect(roundMoney(-1.234)).toBe(-1.23);
    expect(roundMoney(-0.005)).toBe(-0.0); // -0.00
  });

  it('handles zero', () => {
    expect(roundMoney(0)).toBe(0);
  });

  it('handles whole numbers', () => {
    expect(roundMoney(100)).toBe(100);
    expect(roundMoney(99.999)).toBe(100);
  });
});

describe('sumMoney', () => {
  it('sums and rounds correctly', () => {
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
    expect(sumMoney([0.1, 0.2, 0.3])).toBe(0.6);
  });

  it('handles empty array', () => {
    expect(sumMoney([])).toBe(0);
  });

  it('handles large accumulations', () => {
    // 33.33 * 3 should = 99.99
    expect(sumMoney([33.33, 33.33, 33.33])).toBe(99.99);
  });

  it('handles mixed positive and negative', () => {
    expect(sumMoney([100, -33.33, -33.33, -33.34])).toBe(0);
  });
});

describe('splitEqual', () => {
  it('splits evenly when divisible', () => {
    expect(splitEqual(100, 4)).toEqual([25, 25, 25, 25]);
    expect(splitEqual(10, 2)).toEqual([5, 5]);
  });

  it('distributes remainder correctly', () => {
    const result = splitEqual(100, 3);
    expect(result).toEqual([33.34, 33.33, 33.33]);
    expect(sumMoney(result)).toBe(100);
  });

  it('handles 10 / 3', () => {
    const result = splitEqual(10, 3);
    expect(result).toEqual([3.34, 3.33, 3.33]);
    expect(sumMoney(result)).toBe(10);
  });

  it('handles small amounts', () => {
    const result = splitEqual(0.01, 3);
    expect(sumMoney(result)).toBe(0.01);
    // 1 cent among 3: one person gets 0.01, two get 0.00
    expect(result).toEqual([0.01, 0, 0]);
  });

  it('handles 100 / 7', () => {
    const result = splitEqual(100, 7);
    expect(result.length).toBe(7);
    expect(sumMoney(result)).toBe(100);
  });

  it('handles zero count', () => {
    expect(splitEqual(100, 0)).toEqual([]);
  });

  it('handles count of 1', () => {
    expect(splitEqual(99.99, 1)).toEqual([99.99]);
  });

  it('preserves total for tricky amounts', () => {
    // 9.80 split among 3
    const result = splitEqual(9.80, 3);
    expect(sumMoney(result)).toBe(9.80);
  });
});

describe('formatMoney', () => {
  it('formats with 2 decimal places', () => {
    expect(formatMoney(100)).toBe('100.00');
    expect(formatMoney(1.5)).toBe('1.50');
    expect(formatMoney(0.1 + 0.2)).toBe('0.30');
  });

  it('rounds before formatting', () => {
    expect(formatMoney(10 - 9.8)).toBe('0.20');
    expect(formatMoney(1.999)).toBe('2.00');
  });
});
