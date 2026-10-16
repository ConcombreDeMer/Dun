/*
 * Rest periods (offer: "Le Repos activé pendant une journée ouverte rend cette
 * journée entière neutre pour l'objectif et les statistiques").
 *
 * Pure functions on date keys: no React, no storage, no current time. The
 * caller passes the open day, computed with `openDayKey`. Arguments are never
 * modified: every change returns a new object.
 */

import { addDays, isDateKey, type DateKey } from "./date";

/**
 * A rest period, from `startKey` to `endKey`, both included
 * (`startKey <= endKey`).
 */
export type RestPeriod = { startKey: DateKey; endKey: DateKey };

function assertDateKey(fn: string, key: DateKey): void {
  if (!isDateKey(key)) {
    throw new RangeError(`${fn}: invalid date key (${key})`);
  }
}

function assertRestPeriod(fn: string, period: RestPeriod): void {
  assertDateKey(fn, period.startKey);
  assertDateKey(fn, period.endKey);
  if (period.startKey > period.endKey) {
    throw new RangeError(
      `${fn}: rest period ends before it starts (${period.startKey} > ${period.endKey})`,
    );
  }
}

/* True when `key` lies within `period`, both bounds included. */
function covers(period: RestPeriod, key: DateKey): boolean {
  return period.startKey <= key && key <= period.endKey;
}

/**
 * True when a rest period contains `key`, both bounds included.
 *
 * Throws a `RangeError` if `key` or a period is invalid.
 */
export function isRestDay(
  restPeriods: readonly RestPeriod[],
  key: DateKey,
): boolean {
  assertDateKey("isRestDay", key);
  for (const period of restPeriods) {
    assertRestPeriod("isRestDay", period);
  }

  return restPeriods.some((period) => covers(period, key));
}

/**
 * The rest period that covers the open day, or `null` if there is none.
 *
 * Throws a `RangeError` if `openKey` or a period is invalid.
 */
export function currentRest(
  restPeriods: readonly RestPeriod[],
  openKey: DateKey,
): RestPeriod | null {
  assertDateKey("currentRest", openKey);
  for (const period of restPeriods) {
    assertRestPeriod("currentRest", period);
  }

  return restPeriods.find((period) => covers(period, openKey)) ?? null;
}

/**
 * Starts a rest on the open day, until `endKey` included.
 *
 * A rest always starts on the open day: it can neither cover a closed day nor
 * be scheduled for later. Throws a `RangeError` if a key or a period is
 * invalid, if `endKey` is before `openKey`, or if an existing period overlaps
 * the new one.
 */
export function startRest(
  restPeriods: readonly RestPeriod[],
  openKey: DateKey,
  endKey: DateKey,
): RestPeriod {
  assertDateKey("startRest", openKey);
  assertDateKey("startRest", endKey);
  if (endKey < openKey) {
    throw new RangeError(
      `startRest: end key before the open day (${endKey} < ${openKey})`,
    );
  }

  for (const period of restPeriods) {
    assertRestPeriod("startRest", period);
    if (period.startKey <= endKey && period.endKey >= openKey) {
      throw new RangeError(
        `startRest: overlaps an existing rest (${period.startKey} to ${period.endKey})`,
      );
    }
  }

  return { startKey: openKey, endKey };
}

/**
 * Cancels the rest in progress before midnight: the open day becomes a normal
 * day again, and closed days keep their state.
 *
 * Returns `null` when the rest started on the open day (it disappears), or the
 * period ending the day before the open day otherwise. Throws a `RangeError`
 * if a key or the period is invalid, or if the period does not cover the open
 * day: cancelling a finished rest would change closed days.
 */
export function cancelRest(
  period: RestPeriod,
  openKey: DateKey,
): RestPeriod | null {
  assertRestPeriod("cancelRest", period);
  assertDateKey("cancelRest", openKey);
  if (!covers(period, openKey)) {
    throw new RangeError(
      `cancelRest: rest does not cover the open day (${openKey})`,
    );
  }

  if (period.startKey === openKey) {
    return null;
  }

  return { startKey: period.startKey, endKey: addDays(openKey, -1) };
}

/**
 * Sets a new end for the rest in progress, later or sooner than the current
 * one, as long as it is not before the open day. Closed days never change;
 * ending on the open day keeps it a rest day (only `cancelRest` makes it a
 * normal day again).
 *
 * Throws a `RangeError` if a key or the period is invalid, if the period does
 * not cover the open day, or if `newEndKey` is before `openKey`.
 */
export function changeRestEnd(
  period: RestPeriod,
  newEndKey: DateKey,
  openKey: DateKey,
): RestPeriod {
  assertRestPeriod("changeRestEnd", period);
  assertDateKey("changeRestEnd", newEndKey);
  assertDateKey("changeRestEnd", openKey);
  if (!covers(period, openKey)) {
    throw new RangeError(
      `changeRestEnd: rest does not cover the open day (${openKey})`,
    );
  }
  if (newEndKey < openKey) {
    throw new RangeError(
      `changeRestEnd: end key before the open day (${newEndKey} < ${openKey})`,
    );
  }

  return { startKey: period.startKey, endKey: newEndKey };
}
