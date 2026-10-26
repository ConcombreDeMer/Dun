/*
 * Statistics of a period (offer: "L'objectif, la série et les statistiques
 * s'appuient sur cet enregistrement, qui ne change plus").
 *
 * Closed days are read from their record (`DayRecord`), never from the
 * current tasks. The open day and the future days have no record yet: their
 * current tasks are read instead. Pure function on date keys: no React, no
 * storage, no current time, no labels. The caller passes the open day,
 * computed with `openDayKey`. Arguments are never modified.
 */

import { addDays, isDateKey, type DateKey } from "./date";
import type { ClosedDayStatus, DayRecord } from "./dayRecord";
import { dayStatus, type DayStatus, type DayTask } from "./dayStatus";
import type { DateRange } from "./period";
import type { RestPeriod } from "./rest";
import { nextStreak } from "./streak";

/**
 * The days the statistics take into account. They never change the streak
 * nor the perfect days.
 *
 * - `includeToday`: the open day and its current tasks;
 * - `includeFutureDays`: the days after the open day and their planned tasks;
 * - `includeEmptyDays`: the days without any task, outside rest, count for the
 *   charge with 0 task;
 * - `includeRestDays`: the tasks of the rest days.
 */
export type StatsPreferences = {
  includeToday: boolean;
  includeFutureDays: boolean;
  includeEmptyDays: boolean;
  includeRestDays: boolean;
};

/** By default, rest is neutral and future days are left out. */
export const DEFAULT_STATS_PREFERENCES: Readonly<StatsPreferences> =
  Object.freeze({
    includeToday: true,
    includeFutureDays: false,
    includeEmptyDays: true,
    includeRestDays: false,
  });

/**
 * Raw numbers, without rounding nor formatting:
 *
 * - `planned`: the tasks planned on the days taken into account;
 * - `done`: the tasks done among them;
 * - `completion`: `done / planned`, from 0 to 1, or `null` if nothing is
 *   planned;
 * - `charge`: `planned / countedDays`, or `null` if no day is taken into
 *   account;
 * - `countedDays`: the days taken into account for the charge;
 * - `perfectDays`: the closed days of the range recorded as a success;
 * - `longestStreak`: the longest streak inside the range.
 */
export type PeriodStats = {
  planned: number;
  done: number;
  completion: number | null;
  charge: number | null;
  countedDays: number;
  perfectDays: number;
  longestStreak: number;
};

/**
 * - `range`: a period, or one of its slices (`periodBuckets`);
 * - `records`: the records of the closed days;
 * - `tasks`: the current tasks, not deleted; only those of the open day and
 *   of the future days are read;
 * - `restPeriods`: the rest periods, for the open day and the future days;
 * - `openKey`: the open day.
 */
export type PeriodStatsInput = {
  range: DateRange;
  records: readonly DayRecord[];
  tasks: readonly DayTask[];
  restPeriods: readonly RestPeriod[];
  openKey: DateKey;
};

const CLOSED_DAY_STATUSES: readonly string[] = [
  "success",
  "failed",
  "empty",
  "rest",
] satisfies readonly ClosedDayStatus[];

function assertDateKey(key: DateKey): void {
  if (!isDateKey(key)) {
    throw new RangeError(`periodStats: invalid date key (${key})`);
  }
}

/*
 * The records by date. Throws a `RangeError` if a key is invalid, if two
 * records share a date, if a record is not closed or if a status is unknown.
 */
function recordsByKey(
  records: readonly DayRecord[],
  openKey: DateKey,
): Map<DateKey, DayRecord> {
  const byKey = new Map<DateKey, DayRecord>();
  for (const record of records) {
    const { key, status } = record;
    assertDateKey(key);
    if (byKey.has(key)) {
      throw new RangeError(`periodStats: duplicate record (${key})`);
    }
    if (key >= openKey) {
      throw new RangeError(
        `periodStats: the record is not closed (${key}, open day ${openKey})`,
      );
    }
    if (!CLOSED_DAY_STATUSES.includes(status)) {
      throw new RangeError(
        `periodStats: invalid record status (${key}, ${status})`,
      );
    }
    byKey.set(key, record);
  }
  return byKey;
}

/* The tasks of the open day and of the future days, by date. */
function openTasksByKey(
  tasks: readonly DayTask[],
  openKey: DateKey,
): Map<DateKey, DayTask[]> {
  const byKey = new Map<DateKey, DayTask[]>();
  for (const task of tasks) {
    if (task.date !== null && task.date >= openKey) {
      const dayTasks = byKey.get(task.date) ?? [];
      dayTasks.push(task);
      byKey.set(task.date, dayTasks);
    }
  }
  return byKey;
}

/* A day as the statistics read it. */
type StatsDay = { status: DayStatus; tasks: readonly { done: boolean }[] };

/**
 * The statistics of `range`, day by day:
 *
 * - a closed day (`key < openKey`) is read from its record only; a closed day
 *   without a record (before the first use of the app) is left out
 *   everywhere;
 * - the open day is read from its current tasks if `includeToday`, and the
 *   future days if `includeFutureDays`; their status is `rest` or
 *   `provisional`, so they are never perfect and stay neutral for the streak;
 * - a rest day counts only if `includeRestDays`;
 * - an empty day (outside rest, without any task) counts for the charge with
 *   0 task only if `includeEmptyDays`;
 * - the streak applies `nextStreak` from 0 to the recorded statuses, day after
 *   day; any other day is neutral. Nothing is carried over from before the
 *   range, and the preferences have no effect on it.
 *
 * Box tasks (`date: null`) and records outside `range` are left out.
 *
 * Throws a `RangeError` if a key of `range`, `openKey` or a record is invalid,
 * if `range` ends before it starts, if two records share a date, if a record
 * is not closed (`key >= openKey`) or if a recorded status is not a closed
 * day status. A rest period is checked when the open day or a future day is
 * read.
 */
export function periodStats(
  input: PeriodStatsInput,
  preferences: Readonly<StatsPreferences> = DEFAULT_STATS_PREFERENCES,
): PeriodStats {
  const { range, records, tasks, restPeriods, openKey } = input;
  assertDateKey(range.startKey);
  assertDateKey(range.endKey);
  assertDateKey(openKey);
  if (range.startKey > range.endKey) {
    throw new RangeError(
      `periodStats: range ends before it starts (${range.startKey} > ${range.endKey})`,
    );
  }

  const recorded = recordsByKey(records, openKey);
  const openTasks = openTasksByKey(tasks, openKey);

  /* The day `key` as read by the statistics, or `null` if left out. */
  const read = (key: DateKey): StatsDay | null => {
    if (key < openKey) {
      return recorded.get(key) ?? null;
    }
    const included =
      key === openKey
        ? preferences.includeToday
        : preferences.includeFutureDays;
    if (!included) {
      return null;
    }
    const dayTasks = openTasks.get(key) ?? [];
    return {
      status: dayStatus(dayTasks, restPeriods, key, openKey),
      tasks: dayTasks,
    };
  };

  let planned = 0;
  let done = 0;
  let countedDays = 0;
  let perfectDays = 0;
  let streak = 0;
  let longestStreak = 0;

  for (let key = range.startKey; ; key = addDays(key, 1)) {
    const day = read(key);
    const record = recorded.get(key);
    if (record !== undefined) {
      streak = nextStreak(streak, record.status);
      longestStreak = Math.max(longestStreak, streak);
      if (record.status === "success") {
        perfectDays++;
      }
    }

    const counted =
      day !== null &&
      (day.status === "rest"
        ? preferences.includeRestDays
        : day.tasks.length > 0 || preferences.includeEmptyDays);
    if (counted) {
      countedDays++;
      planned += day.tasks.length;
      done += day.tasks.filter((task) => task.done).length;
    }

    if (key === range.endKey) {
      break;
    }
  }

  return {
    planned,
    done,
    completion: planned === 0 ? null : done / planned,
    charge: countedDays === 0 ? null : planned / countedDays,
    countedDays,
    perfectDays,
    longestStreak,
  };
}
