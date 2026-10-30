/*
 * Rest periods repository (`rest_periods`).
 *
 * The rules of the Rest stay in `src/domain/rest.ts` (`startRest`,
 * `cancelRest`, `changeRestEnd`): this repository reads the periods, applies
 * them and writes the result. Their `RangeError` goes through unchanged.
 */

import { and, asc, eq, isNull } from "drizzle-orm";
import type { DateKey } from "../../domain/date";
import { cancelRest, changeRestEnd, startRest } from "../../domain/rest";
import { DataError } from "../errors";
import { restPeriods } from "../schema";
import { repositoryDefaults, type RepositoryOptions } from "./repository";

export type RestPeriodRow = typeof restPeriods.$inferSelect;

type Transaction = Parameters<
  Parameters<RepositoryOptions["db"]["transaction"]>[0]
>[0];

const notDeleted = isNull(restPeriods.deletedAt);

/** The period `id` if it is not deleted, or throws `not_found`. */
function find(tx: Transaction, id: string): RestPeriodRow {
  const period = tx
    .select()
    .from(restPeriods)
    .where(and(eq(restPeriods.id, id), notDeleted))
    .get();
  if (period === undefined) {
    throw new DataError("not_found", `Rest period not found (${id})`);
  }
  return period;
}

export function createRestPeriodRepository(options: RepositoryOptions) {
  const { db, now, newId } = repositoryDefaults(options);

  return {
    /** Periods that are not deleted, by start. */
    list() {
      return db
        .select()
        .from(restPeriods)
        .where(notDeleted)
        .orderBy(asc(restPeriods.startKey), asc(restPeriods.id));
    },

    /**
     * Starts a rest on the open day `openKey`, until `endKey` included
     * (`startRest`), and returns the new period. Throws the `RangeError` of
     * `startRest` (overlap, end before the open day, invalid key); nothing
     * is written then.
     */
    start(openKey: DateKey, endKey: DateKey): RestPeriodRow {
      return db.transaction((tx) => {
        const periods = tx
          .select({
            startKey: restPeriods.startKey,
            endKey: restPeriods.endKey,
          })
          .from(restPeriods)
          .where(notDeleted)
          .all();
        const period = startRest(periods, openKey, endKey);

        const at = now();
        const row: RestPeriodRow = {
          id: newId(),
          createdAt: at,
          updatedAt: at,
          deletedAt: null,
          ...period,
        };
        tx.insert(restPeriods).values(row).run();
        return row;
      });
    },

    /**
     * Cancels the rest `id` on the open day `openKey` (`cancelRest`): a rest
     * started that day is soft-deleted, an older one ends the day before.
     * Throws `not_found` if the period is missing or deleted, and the
     * `RangeError` of `cancelRest`.
     */
    cancel(id: string, openKey: DateKey): void {
      db.transaction((tx) => {
        const cancelled = cancelRest(find(tx, id), openKey);
        const at = now();

        tx.update(restPeriods)
          .set(
            cancelled === null
              ? { deletedAt: at, updatedAt: at }
              : { endKey: cancelled.endKey, updatedAt: at },
          )
          .where(eq(restPeriods.id, id))
          .run();
      });
    },

    /**
     * Sets a new end for the rest `id` (`changeRestEnd`). Throws `not_found`
     * if the period is missing or deleted, and the `RangeError` of
     * `changeRestEnd`.
     */
    changeEnd(id: string, newEndKey: DateKey, openKey: DateKey): void {
      db.transaction((tx) => {
        const changed = changeRestEnd(find(tx, id), newEndKey, openKey);

        tx.update(restPeriods)
          .set({ endKey: changed.endKey, updatedAt: now() })
          .where(eq(restPeriods.id, id))
          .run();
      });
    },
  };
}

export type RestPeriodRepository = ReturnType<
  typeof createRestPeriodRepository
>;
