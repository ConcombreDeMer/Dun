/*
 * Streak (offer: "L'objectif et les statistiques utilisent la même règle de
 * série").
 *
 * Pure functions on day statuses: no React, no storage, no current time.
 * Arguments are never modified.
 */

import { addDays, isDateKey, type DateKey } from "./date";
import type { DayStatus } from "./dayStatus";

/** The status of the day `key`, computed with `dayStatus`. */
export type DatedStatus = { key: DateKey; status: DayStatus };

/**
 * The single streak rule, applied day after day: the streak after a day of
 * status `status`, given the streak `previous` before it.
 *
 * - `success` adds one day;
 * - `rest` and `provisional` are neutral: they neither count nor break;
 * - `empty` and `failed` break the streak, back to 0.
 *
 * Throws a `RangeError` if `previous` is not an integer greater than or equal
 * to 0.
 */
export function nextStreak(previous: number, status: DayStatus): number {
  if (!Number.isInteger(previous) || previous < 0) {
    throw new RangeError(
      `nextStreak: previous must be a non-negative integer (${previous})`,
    );
  }

  switch (status) {
    case "success":
      return previous + 1;
    case "rest":
    case "provisional":
      return previous;
    case "empty":
    case "failed":
      return 0;
  }
}

/**
 * Checks that every key is valid and that each day is the day after the
 * previous one: a missing, repeated or misplaced day would silently distort
 * the streak.
 *
 * Throws a `RangeError` whose message starts with `fn`.
 */
export function assertConsecutiveDays(
  fn: string,
  days: readonly DatedStatus[],
): void {
  for (let index = 0; index < days.length; index++) {
    const { key } = days[index];
    if (!isDateKey(key)) {
      throw new RangeError(`${fn}: invalid date key (${key})`);
    }
    if (index > 0) {
      const expected = addDays(days[index - 1].key, 1);
      if (key !== expected) {
        throw new RangeError(
          `${fn}: days are not consecutive (${key} instead of ${expected})`,
        );
      }
    }
  }
}

/**
 * The streak at the end of `days`, obtained by applying `nextStreak` to each
 * day from 0. An empty list gives 0.
 *
 * `days` must follow each other exactly, one day apart, in order. Throws a
 * `RangeError` if a key is invalid or if the days are not consecutive.
 */
export function streak(days: readonly DatedStatus[]): number {
  assertConsecutiveDays("streak", days);

  return days.reduce((current, day) => nextStreak(current, day.status), 0);
}
