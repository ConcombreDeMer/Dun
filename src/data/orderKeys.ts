/*
 * Fractional order keys (`order_key`): a row can be placed between two others
 * by changing only its own key. Keys sort as plain strings, like SQLite's
 * `ORDER BY`.
 *
 * This file is the only one that imports `fractional-indexing`.
 */

import { generateKeyBetween } from "fractional-indexing";

/**
 * A key strictly between `before` and `after`. `null` stands for the start
 * (`before`) or the end (`after`) of the list.
 *
 * Throws if `before >= after`.
 */
export function orderKeyBetween(
  before: string | null,
  after: string | null,
): string {
  return generateKeyBetween(before, after);
}
