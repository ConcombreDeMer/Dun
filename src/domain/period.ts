/*
 * Periods of the statistics: the week, the month and the year (roadmap:
 * "Les périodes sont identifiées par `week | month | year`, plus par des
 * libellés").
 *
 * Pure functions on date keys: no React, no storage, no current time, no
 * labels. Weeks run from Monday to Sunday, whatever the language. Arguments
 * are never modified.
 */

import { addDays, isDateKey, weekday, type DateKey } from "./date";

/** The kinds of period, in increasing length. */
export const PERIOD_KINDS = ["week", "month", "year"] as const;

export type PeriodKind = (typeof PERIOD_KINDS)[number];

/** A range of days, from `startKey` to `endKey`, both included. */
export type DateRange = { startKey: DateKey; endKey: DateKey };

/** A week, a month or a year, both bounds included. */
export type Period = DateRange & { kind: PeriodKind };

function isPeriodKind(value: string): value is PeriodKind {
  return (PERIOD_KINDS as readonly string[]).includes(value);
}

function assertKind(fn: string, kind: string): void {
  if (!isPeriodKind(kind)) {
    throw new RangeError(`${fn}: unknown period kind (${kind})`);
  }
}

function assertDateKey(fn: string, key: DateKey): void {
  if (!isDateKey(key)) {
    throw new RangeError(`${fn}: invalid date key (${key})`);
  }
}

function assertPeriod(fn: string, period: Period): void {
  assertKind(fn, period.kind);
  assertDateKey(fn, period.startKey);
  assertDateKey(fn, period.endKey);
  if (period.startKey > period.endKey) {
    throw new RangeError(
      `${fn}: period ends before it starts (${period.startKey} > ${period.endKey})`,
    );
  }
}

function pad(value: number, length: number): string {
  return String(value).padStart(length, "0");
}

/* Year and month (1 to 12) of a valid key. */
function yearMonth(key: DateKey): [number, number] {
  const [year, month] = key.split("-").map(Number);
  return [year, month];
}

/* The first day of the month `month` (1 to 12) of `year`. */
function firstOfMonth(year: number, month: number): string {
  return `${pad(year, 4)}-${pad(month, 2)}-01`;
}

/* The last day of the month of `key`: 28 always exists. */
function lastOfMonth(key: DateKey): DateKey {
  const prefix = key.slice(0, 8);
  let day = 31;
  while (!isDateKey(`${prefix}${day}`)) {
    day--;
  }
  return `${prefix}${day}`;
}

/**
 * The period of kind `kind` that contains `key`:
 *
 * - `week`: from Monday to Sunday;
 * - `month`: from the 1st to the last day of the month;
 * - `year`: from January 1st to December 31st.
 *
 * Throws a `RangeError` if `kind` is unknown or if `key` is invalid.
 */
export function period(kind: PeriodKind, key: DateKey): Period {
  assertKind("period", kind);
  assertDateKey("period", key);

  switch (kind) {
    case "week": {
      const startKey = addDays(key, 1 - weekday(key));
      return { kind, startKey, endKey: addDays(startKey, 6) };
    }
    case "month": {
      const startKey = `${key.slice(0, 8)}01`;
      return { kind, startKey, endKey: lastOfMonth(key) };
    }
    case "year": {
      const year = key.slice(0, 4);
      return { kind, startKey: `${year}-01-01`, endKey: `${year}-12-31` };
    }
  }
}

/**
 * The period of the same kind, `offset` steps after `current` (before it when
 * `offset` is negative). `0` gives the period back.
 *
 * Throws a `RangeError` if the period is invalid, if `offset` is not an
 * integer, or if the result falls outside the years 0000 to 9999.
 */
export function shiftPeriod(current: Period, offset: number): Period {
  assertPeriod("shiftPeriod", current);
  if (!Number.isInteger(offset)) {
    throw new RangeError(`shiftPeriod: offset must be an integer (${offset})`);
  }

  const { kind, startKey } = current;
  if (kind === "week") {
    return period(kind, addDays(startKey, 7 * offset));
  }

  const [year, month] = yearMonth(startKey);
  const months = kind === "month" ? offset : 12 * offset;
  const index = 12 * year + (month - 1) + months;
  const key = firstOfMonth(Math.floor(index / 12), (index % 12) + 1);
  if (!isDateKey(key)) {
    throw new RangeError(
      `shiftPeriod: result out of range (${startKey} + ${offset} ${kind})`,
    );
  }

  return period(kind, key);
}

/*
 * The last day of the slice that starts on `key`, before it is cut to the
 * end of the period.
 */
function sliceEnd(kind: PeriodKind, key: DateKey): DateKey {
  switch (kind) {
    case "week":
      return key;
    case "month":
      return period("week", key).endKey;
    case "year":
      return lastOfMonth(key);
  }
}

/**
 * The slices of the chart of `current`, in order, cut to its bounds:
 *
 * - `week`: its days, one by one;
 * - `month`: its weeks from Monday to Sunday;
 * - `year`: its months.
 *
 * Throws a `RangeError` if the period is invalid.
 */
export function periodBuckets(current: Period): DateRange[] {
  assertPeriod("periodBuckets", current);

  const { kind, endKey } = current;
  const buckets: DateRange[] = [];
  let startKey = current.startKey;
  for (;;) {
    const end = sliceEnd(kind, startKey);
    if (end >= endKey) {
      buckets.push({ startKey, endKey });
      return buckets;
    }
    buckets.push({ startKey, endKey: end });
    startKey = addDays(end, 1);
  }
}
