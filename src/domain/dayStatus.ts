/*
 * Status of a day (offer: "Seules les journées closes à 100 % comptent pour
 * l'objectif ; une journée en cours à 100 % reste provisoire").
 *
 * Pure function on date keys: no React, no storage, no current time. The
 * caller passes the open day, computed with `openDayKey`.
 */

import { isDateKey, type DateKey } from "./date";
import { isRestDay, type RestPeriod } from "./rest";

/**
 * - `rest`: the day is in a rest period, whatever its tasks;
 * - `provisional`: the day is not closed yet (open or future day);
 * - `empty`: a closed day without any task;
 * - `success`: a closed day with all its tasks done;
 * - `failed`: a closed day with at least one task not done.
 */
export type DayStatus = "success" | "failed" | "empty" | "rest" | "provisional";

/**
 * The minimum of a task needed for a day status. A `null` date is a Box task,
 * which counts for no day. The caller leaves out deleted tasks.
 */
export type DayTask = { date: DateKey | null; done: boolean };

/**
 * Status of the day `key`, given the open day `openKey`. A day is closed when
 * `key < openKey`.
 *
 * Throws a `RangeError` if `key`, `openKey` or a rest period is invalid.
 */
export function dayStatus(
  tasks: readonly DayTask[],
  restPeriods: readonly RestPeriod[],
  key: DateKey,
  openKey: DateKey,
): DayStatus {
  if (!isDateKey(key)) {
    throw new RangeError(`dayStatus: invalid date key (${key})`);
  }
  if (!isDateKey(openKey)) {
    throw new RangeError(`dayStatus: invalid date key (${openKey})`);
  }

  if (isRestDay(restPeriods, key)) {
    return "rest";
  }
  if (key >= openKey) {
    return "provisional";
  }

  const dayTasks = tasks.filter((task) => task.date === key);
  if (dayTasks.length === 0) {
    return "empty";
  }

  return dayTasks.every((task) => task.done) ? "success" : "failed";
}
