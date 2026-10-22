/*
 * Record of a closed day (offer: "À sa clôture, une journée est enregistrée
 * avec ses tâches, leur état et leurs tags. L'objectif, la série et les
 * statistiques s'appuient sur cet enregistrement, qui ne change plus").
 *
 * Pure functions on date keys: no React, no storage, no current time. The
 * caller passes the open day, computed with `openDayKey`. A day is closed when
 * `key < openKey`, as in `dayStatus`. Arguments are never modified.
 */

import { isDateKey, type DateKey } from "./date";
import { dayStatus, type DayStatus, type DayTask } from "./dayStatus";
import type { RestPeriod } from "./rest";

/**
 * A tag as it was at midnight. It is a copy, not a reference: a tag deleted or
 * renamed afterwards stays as it was in the record.
 */
export type RecordedTag = { name: string; color: string };

/** A task as it was at midnight. */
export type RecordedTask = {
  id: string;
  name: string;
  done: boolean;
  tags: readonly RecordedTag[];
};

/** The status of a closed day, which is never provisional. */
export type ClosedDayStatus = Exclude<DayStatus, "provisional">;

/**
 * A closed day: its status and the snapshot of its tasks, in the order of the
 * day. It never changes once recorded.
 */
export type DayRecord = {
  key: DateKey;
  status: ClosedDayStatus;
  tasks: readonly RecordedTask[];
};

/** A task as the storage provides it when the day closes. */
export type ClosingTask = DayTask & RecordedTask;

/**
 * Checks that no `id` appears twice: the comparison with the record relies on
 * them.
 *
 * Throws a `RangeError` whose message starts with `fn`.
 */
function assertUniqueIds(fn: string, tasks: readonly { id: string }[]): void {
  const seen = new Set<string>();
  for (const { id } of tasks) {
    if (seen.has(id)) {
      throw new RangeError(`${fn}: duplicate task id (${id})`);
    }
    seen.add(id);
  }
}

/**
 * The record of the closed day `key`, given the open day `openKey`:
 *
 * - `status`: computed with `dayStatus`;
 * - `tasks`: the tasks dated `key`, in the order received, with their `id`,
 *   name, state and a copy of their tags. Other fields are not kept.
 *
 * Throws a `RangeError` if `key`, `openKey` or a rest period is invalid, if
 * the day is not closed (`key >= openKey`), or if two tasks of the day share
 * an `id`.
 */
export function closeDay(
  tasks: readonly ClosingTask[],
  restPeriods: readonly RestPeriod[],
  key: DateKey,
  openKey: DateKey,
): DayRecord {
  if (!isDateKey(key)) {
    throw new RangeError(`closeDay: invalid date key (${key})`);
  }
  if (!isDateKey(openKey)) {
    throw new RangeError(`closeDay: invalid date key (${openKey})`);
  }
  if (key >= openKey) {
    throw new RangeError(
      `closeDay: the day is not closed (${key}, open day ${openKey})`,
    );
  }

  const dayTasks = tasks.filter((task) => task.date === key);
  assertUniqueIds("closeDay", dayTasks);

  /* A closed day is never provisional (`key < openKey`). */
  const status = dayStatus(tasks, restPeriods, key, openKey) as ClosedDayStatus;

  return {
    key,
    status,
    tasks: dayTasks.map(({ id, name, done, tags }) => ({
      id,
      name,
      done,
      tags: tags.map((tag) => ({ name: tag.name, color: tag.color })),
    })),
  };
}

/**
 * Whether the tasks of the day differ from its record: a task was added,
 * removed (deleted, or moved to the Box or to another day) or its done state
 * changed. Names, tags and order are ignored.
 *
 * A postpone is not a difference: a task not done at midnight, now found at a
 * later date than `record.key`, whatever its current state.
 *
 * `tasks` holds all the tasks that are not deleted, whatever their date, so
 * that a postponed task can be told from a deleted one.
 *
 * Throws a `RangeError` if `record.key` is invalid, or if an `id` appears
 * twice in the record or in the tasks dated `record.key`.
 */
export function recordDiffers(
  record: DayRecord,
  tasks: readonly (DayTask & { id: string })[],
): boolean {
  const { key } = record;
  if (!isDateKey(key)) {
    throw new RangeError(`recordDiffers: invalid date key (${key})`);
  }
  assertUniqueIds("recordDiffers", record.tasks);
  const dayTasks = tasks.filter((task) => task.date === key);
  assertUniqueIds("recordDiffers", dayTasks);

  const current = new Map(dayTasks.map((task) => [task.id, task.done]));
  const later = new Set(
    tasks
      .filter((task) => task.date !== null && task.date > key)
      .map((task) => task.id),
  );

  let found = 0;
  for (const { id, done } of record.tasks) {
    if (current.has(id)) {
      if (current.get(id) !== done) {
        return true;
      }
      found++;
    } else if (done || !later.has(id)) {
      return true;
    }
  }
  return found !== dayTasks.length;
}
