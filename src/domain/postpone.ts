/*
 * Postpone (offer: "Reporter une tâche, c'est déplacer une tâche non faite
 * d'une journée close vers la journée ouverte ou plus tard ; son nombre de
 * reports augmente d'un").
 *
 * Pure functions on date keys: no React, no storage, no current time. The
 * caller passes the open day, computed with `openDayKey`. Arguments are never
 * modified.
 */

import { isDateKey, type DateKey } from "./date";

/**
 * The minimum of a task needed to move it. A `null` date is a Box task.
 * `delayCount` is the number of times the task was postponed.
 */
export type MovableTask = {
  date: DateKey | null;
  done: boolean;
  delayCount: number;
};

/**
 * Checks that every non-null key is valid.
 *
 * Throws a `RangeError` whose message starts with `fn`.
 */
function assertKeys(fn: string, ...keys: readonly (DateKey | null)[]): void {
  for (const key of keys) {
    if (key !== null && !isDateKey(key)) {
      throw new RangeError(`${fn}: invalid date key (${key})`);
    }
  }
}

function postpones(
  task: MovableTask,
  targetKey: DateKey | null,
  openKey: DateKey,
): boolean {
  return (
    task.date !== null &&
    task.date < openKey &&
    !task.done &&
    targetKey !== null &&
    targetKey >= openKey
  );
}

/**
 * Whether moving `task` to `targetKey` (`null` = the Box) is a postpone, given
 * the open day `openKey`: the task is not done, it belongs to a closed day
 * (`date < openKey`), and it goes to the open day or later.
 *
 * Moving any other task, or moving to the Box or to a closed day, is not a
 * postpone.
 *
 * Throws a `RangeError` if a key is invalid.
 */
export function isPostpone(
  task: MovableTask,
  targetKey: DateKey | null,
  openKey: DateKey,
): boolean {
  assertKeys("isPostpone", task.date, targetKey, openKey);

  return postpones(task, targetKey, openKey);
}

/**
 * The single way to change the date of a task: a copy of `task` with
 * `date = targetKey`, and `delayCount + 1` if the move is a postpone
 * (`isPostpone`). The task is never duplicated.
 *
 * Throws a `RangeError` if a key is invalid or if `delayCount` is not an
 * integer greater than or equal to 0.
 */
export function moveTask<T extends MovableTask>(
  task: T,
  targetKey: DateKey | null,
  openKey: DateKey,
): T {
  assertKeys("moveTask", task.date, targetKey, openKey);
  const { delayCount } = task;
  if (!Number.isInteger(delayCount) || delayCount < 0) {
    throw new RangeError(
      `moveTask: delayCount must be a non-negative integer (${delayCount})`,
    );
  }

  return {
    ...task,
    date: targetKey,
    delayCount: postpones(task, targetKey, openKey)
      ? delayCount + 1
      : delayCount,
  };
}
