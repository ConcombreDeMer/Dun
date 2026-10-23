/*
 * Dates and days (offer: "Une journée se clôt à minuit").
 *
 * Pure functions: no React, no storage, no implicit current time. The current
 * instant and the iPhone time zone are always passed as parameters.
 */

/**
 * A calendar day, written `YYYY-MM-DD` (for example `2026-10-16`).
 *
 * Keys compare as plain strings: `"2026-10-15" < "2026-10-16"`.
 */
export type DateKey = string;

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function pad(value: number, length: number): string {
  return String(value).padStart(length, "0");
}

/* Midnight UTC of a key that matches `DATE_KEY_PATTERN`. */
function keyToUtcDate(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(0);
  /* `setUTCFullYear` keeps years 0-99 as is, unlike `Date.UTC`. */
  date.setUTCFullYear(year, month - 1, day);
  return date;
}

function utcDateToKey(date: Date): string {
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1, 2)}-${pad(date.getUTCDate(), 2)}`;
}

/**
 * True when `value` is a `YYYY-MM-DD` key of a day that exists in the
 * calendar: `2026-02-30` is refused, `2028-02-29` is accepted.
 */
export function isDateKey(value: string): boolean {
  if (!DATE_KEY_PATTERN.test(value)) {
    return false;
  }

  return utcDateToKey(keyToUtcDate(value)) === value;
}

/*
 * Supported instants, in UTC: from 0001-01-02 included to 9999-12-31
 * excluded. UTC offsets stay within one day, so every local date falls
 * between the years 0001 and 9999: no era (BC) and no five-digit year.
 */
const MIN_INSTANT = keyToUtcDate("0001-01-02").getTime();
const MAX_INSTANT = keyToUtcDate("9999-12-31").getTime();

/*
 * One formatter per time zone, built on first use: building an
 * `Intl.DateTimeFormat` is costly, and `dateKey` runs for every task and
 * every calendar cell. This is memoization only, the module stays pure.
 */
const formatters = new Map<string, Intl.DateTimeFormat>();

/* Throws a `RangeError` for an unknown time zone, which is not cached. */
function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (formatter === undefined) {
    /*
     * The locale only fixes the calendar (Gregorian) and the digits (Latin);
     * the parts are read by type, never by position.
     */
    formatter = new Intl.DateTimeFormat("en-US-u-ca-gregory-nu-latn", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    formatters.set(timeZone, formatter);
  }

  return formatter;
}

/**
 * Key of the local day of `date` in the IANA time zone `timeZone`
 * (for example `Europe/Paris`). The day ends at midnight in that zone.
 *
 * Throws a `RangeError` if the date is invalid or outside the supported range
 * (see `MIN_INSTANT`), or if the time zone is unknown.
 */
export function dateKey(date: Date, timeZone: string): DateKey {
  const time = date.getTime();
  /* Written this way so that an invalid date (`NaN`) is refused too. */
  if (!(time >= MIN_INSTANT && time < MAX_INSTANT)) {
    throw new RangeError("dateKey: invalid or out of range date");
  }

  const parts = formatterFor(timeZone).formatToParts(date);

  const values: Record<string, string> = {};
  for (const part of parts) {
    values[part.type] = part.value;
  }

  return `${values.year.padStart(4, "0")}-${values.month}-${values.day}`;
}

/**
 * Key `days` days after `key` (before it when `days` is negative).
 *
 * Calendar arithmetic in UTC, so daylight saving changes have no effect.
 * Throws a `RangeError` if `key` is not a valid key, if `days` is not an
 * integer, or if the result falls outside the years 0000 to 9999.
 */
export function addDays(key: DateKey, days: number): DateKey {
  if (!isDateKey(key)) {
    throw new RangeError(`addDays: invalid date key (${key})`);
  }
  if (!Number.isInteger(days)) {
    throw new RangeError(`addDays: days must be an integer (${days})`);
  }

  const date = keyToUtcDate(key);
  date.setUTCDate(date.getUTCDate() + days);

  const result = utcDateToKey(date);
  if (!isDateKey(result)) {
    throw new RangeError(`addDays: result out of range (${key} + ${days})`);
  }

  return result;
}

/**
 * Day of the week of `key`, from Monday = 1 to Sunday = 7, whatever the
 * language: weeks run from Monday to Sunday.
 *
 * Calendar arithmetic in UTC, so the time zone has no effect. Throws a
 * `RangeError` if `key` is not a valid key.
 */
export function weekday(key: DateKey): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  if (!isDateKey(key)) {
    throw new RangeError(`weekday: invalid date key (${key})`);
  }

  /* `getUTCDay` counts from Sunday = 0. */
  const day = keyToUtcDate(key).getUTCDay();
  return (day === 0 ? 7 : day) as 1 | 2 | 3 | 4 | 5 | 6;
}

/**
 * Key of the open day.
 *
 * A closed day never reopens. The open day is the later of:
 * - the local date of `now` in the iPhone time zone `timeZone`;
 * - the day after `lastClosedKey`, the last closed day (`null` if none).
 *
 * Example: in Paris, the 15th closes at midnight and the 16th opens. On
 * arrival in New York, where it is 6:30 pm on the 15th, the open day stays the
 * 16th until midnight New York time.
 */
export function openDayKey(
  now: Date,
  timeZone: string,
  lastClosedKey: DateKey | null,
): DateKey {
  const localKey = dateKey(now, timeZone);
  if (lastClosedKey === null) {
    return localKey;
  }

  const nextKey = addDays(lastClosedKey, 1);
  return nextKey > localKey ? nextKey : localKey;
}

/**
 * Days to close, in order: from the day after `lastClosedKey` to the day
 * before `openKey`.
 *
 * Returns `[]` when `lastClosedKey` is `null` or when nothing is left to
 * close. Throws a `RangeError` if a key is invalid.
 */
export function dayKeysToClose(
  lastClosedKey: DateKey | null,
  openKey: DateKey,
): DateKey[] {
  if (!isDateKey(openKey)) {
    throw new RangeError(`dayKeysToClose: invalid date key (${openKey})`);
  }
  if (lastClosedKey === null) {
    return [];
  }

  const keys: DateKey[] = [];
  for (
    let key = addDays(lastClosedKey, 1);
    key < openKey;
    key = addDays(key, 1)
  ) {
    keys.push(key);
  }

  return keys;
}
