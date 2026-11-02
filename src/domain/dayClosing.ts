/*
 * Closing of the days (offer: "Une journée se clôt à minuit"; "À sa clôture,
 * une journée est enregistrée avec ses tâches, leur état et leurs tags").
 *
 * Pure functions: no React, no storage, no implicit current time. The current
 * instant and the iPhone time zone are always passed as parameters. They put
 * together `dayKeysToClose` and `closeDay`; the storage reads and writes stay
 * in `src/data`.
 */

import { dateKey, dayKeysToClose, isDateKey, type DateKey } from "./date";
import { closeDay, type ClosingTask, type DayRecord } from "./dayRecord";
import type { RestPeriod } from "./rest";

/**
 * The last closed day: the later of `anchorKey` (the day before the first
 * closing, which is never recorded) and `lastRecordedKey` (the latest
 * recorded day). `null` when both are `null`.
 *
 * Throws a `RangeError` if a key that is not `null` is invalid.
 */
export function lastClosedKey(
  anchorKey: DateKey | null,
  lastRecordedKey: DateKey | null,
): DateKey | null {
  for (const key of [anchorKey, lastRecordedKey]) {
    if (key !== null && !isDateKey(key)) {
      throw new RangeError(`lastClosedKey: invalid date key (${key})`);
    }
  }

  if (anchorKey === null) {
    return lastRecordedKey;
  }
  if (lastRecordedKey === null) {
    return anchorKey;
  }
  return anchorKey > lastRecordedKey ? anchorKey : lastRecordedKey;
}

/**
 * The records of the days to close, in order: one `closeDay` for each day of
 * `dayKeysToClose(lastClosedKey, openKey)`. `[]` when nothing is left to
 * close.
 *
 * `tasks` holds the tasks that are not deleted, at least those of the days to
 * close. They are grouped by date once, and each `closeDay` only receives
 * the tasks of its day, so that a long absence does not filter the whole
 * list for every day. Throws the `RangeError` of `dayKeysToClose` and
 * `closeDay`.
 */
export function closeDays(
  tasks: readonly ClosingTask[],
  restPeriods: readonly RestPeriod[],
  lastClosedKey: DateKey | null,
  openKey: DateKey,
): DayRecord[] {
  const keys = dayKeysToClose(lastClosedKey, openKey);

  const tasksByDate = new Map<DateKey | null, ClosingTask[]>();
  for (const task of tasks) {
    const dayTasks = tasksByDate.get(task.date);
    if (dayTasks === undefined) {
      tasksByDate.set(task.date, [task]);
    } else {
      dayTasks.push(task);
    }
  }

  return keys.map((key) =>
    closeDay(tasksByDate.get(key) ?? [], restPeriods, key, openKey),
  );
}

const MAX_SEARCH_MS = 48 * 60 * 60 * 1000;

/**
 * The first instant after `now` whose local day (`dateKey` in `timeZone`) is
 * later than the local day of `now`: the next local midnight, for the refresh
 * of the screen.
 *
 * Found by a binary search to the millisecond within `]now, now + 48 h]`, so
 * daylight saving changes are handled, even those at midnight (the 16th may
 * then start at 01:00). When the clocks go back across midnight, the instant
 * returned may be the second midnight, never an instant before the first one.
 *
 * Throws the `RangeError` of `dateKey`: invalid or out of range date, unknown
 * time zone.
 */
export function nextDayStart(now: Date, timeZone: string): Date {
  const key = dateKey(now, timeZone);

  /* Invariant: the day of `before` is not later, the day of `after` is. */
  let before = now.getTime();
  let after = before + MAX_SEARCH_MS;
  while (after - before > 1) {
    const middle = Math.floor((before + after) / 2);
    if (dateKey(new Date(middle), timeZone) > key) {
      after = middle;
    } else {
      before = middle;
    }
  }

  return new Date(after);
}
