/*
 * Day records repository (`day_records`).
 *
 * The record of a closed day "ne change plus" (offer): it is written once by
 * `record`, and never updated nor removed here.
 *
 * `day_records_key_unique` is not partial: a key soft-deleted (by a sync, for
 * instance) cannot be inserted again. `record` reuses its row instead.
 */

import { and, asc, between, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { isDateKey, type DateKey } from "../../domain/date";
import type { DayRecord } from "../../domain/dayRecord";
import { DataError } from "../errors";
import { dayRecords } from "../schema";
import { repositoryDefaults, type RepositoryOptions } from "./repository";

export type DayRecordRow = typeof dayRecords.$inferSelect;

const notDeleted = isNull(dayRecords.deletedAt);

export function createDayRecordRepository(options: RepositoryOptions) {
  const { db, now, newId } = repositoryDefaults(options);

  return {
    /** Records that are not deleted, by day. */
    list() {
      return db
        .select()
        .from(dayRecords)
        .where(notDeleted)
        .orderBy(asc(dayRecords.key));
    },

    /** Records from `startKey` to `endKey` included, by day. */
    listRange(startKey: DateKey, endKey: DateKey) {
      return db
        .select()
        .from(dayRecords)
        .where(and(between(dayRecords.key, startKey, endKey), notDeleted))
        .orderBy(asc(dayRecords.key));
    },

    /** The record of the day `key`, or `undefined` once run. */
    get(key: DateKey) {
      return db
        .select()
        .from(dayRecords)
        .where(and(eq(dayRecords.key, key), notDeleted));
    },

    /**
     * The latest recorded day, as `{ key }`, or `undefined` once run if no
     * day is recorded.
     */
    lastKey() {
      return db
        .select({ key: dayRecords.key })
        .from(dayRecords)
        .where(notDeleted)
        .orderBy(desc(dayRecords.key))
        .limit(1);
    },

    /**
     * Records the closed days `records` (from `closeDay`), all or none.
     *
     * A soft-deleted row of the same key is reused: same `id` and
     * `created_at`, new status and tasks, `deleted_at` back to `null`.
     * Throws `already_recorded` if a day is already recorded and not
     * deleted, and a `RangeError` if a key is not a valid date key; nothing
     * is written then.
     */
    record(records: readonly DayRecord[]): void {
      for (const { key } of records) {
        if (!isDateKey(key)) {
          throw new RangeError(`dayRecords.record: invalid date key (${key})`);
        }
      }

      db.transaction((tx) => {
        const at = now();

        for (const { key, status, tasks } of records) {
          const { changes } = tx
            .insert(dayRecords)
            .values({
              id: newId(),
              createdAt: at,
              updatedAt: at,
              deletedAt: null,
              key,
              status,
              tasks: [...tasks],
            })
            .onConflictDoUpdate({
              target: dayRecords.key,
              set: {
                status,
                tasks: [...tasks],
                deletedAt: null,
                updatedAt: at,
              },
              setWhere: isNotNull(dayRecords.deletedAt),
            })
            .run();

          if (changes === 0) {
            throw new DataError(
              "already_recorded",
              `Day already recorded (${key})`,
            );
          }
        }
      });
    },
  };
}

export type DayRecordRepository = ReturnType<typeof createDayRecordRepository>;
