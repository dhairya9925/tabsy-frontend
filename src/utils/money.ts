/**
 * Precision-safe monetary arithmetic utilities.
 *
 * JavaScript's IEEE-754 floating-point numbers cannot represent most decimal
 * fractions exactly (e.g. 0.1 + 0.2 === 0.30000000000000004).  In a finance
 * app every addition, subtraction and division on money must be rounded to
 * two decimal places so that user-visible amounts never show phantom fractions
 * and so that splits always sum to the original total.
 */

/**
 * Round a number to 2 decimal places.
 *
 * Uses Number.EPSILON to nudge values that sit right at the 0.5 boundary
 * (e.g. `1.005 * 100 = 100.49999999999999` → rounds to 100, not 101).
 */
export function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Sum an array of numbers and round the result to 2 decimal places.
 */
export function sumMoney(values: number[]): number {
  return roundMoney(values.reduce((acc, v) => acc + v, 0));
}

/**
 * Divide a monetary total equally among `count` people.
 *
 * Returns an array of `count` amounts whose sum is **exactly** `total`
 * (to 2 dp).  Any remainder cents are distributed one each to the first
 * members of the array.
 *
 * @example splitEqual(100, 3) → [33.34, 33.33, 33.33]
 * @example splitEqual(10,  3) → [3.34, 3.33, 3.33]
 */
export function splitEqual(total: number, count: number): number[] {
  if (count <= 0) return [];
  const totalCents = Math.round(total * 100);
  const baseCents = Math.floor(totalCents / count);
  const remainderCents = totalCents - baseCents * count;

  return Array.from({ length: count }, (_, i) =>
    (i < remainderCents ? baseCents + 1 : baseCents) / 100,
  );
}

/**
 * Format a monetary value to a string with exactly 2 decimal places.
 */
export function formatMoney(amount: number): string {
  return roundMoney(amount).toFixed(2);
}
