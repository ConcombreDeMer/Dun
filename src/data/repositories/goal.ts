/*
 * Goal repository (`goal`).
 *
 * One active goal: `set` updates it, or creates it if there is none. `get`
 * reads the most recent row that is not deleted, so that the read stays
 * deterministic even if two active rows ever coexist (sync, phase 4).
 */

import { desc, eq, isNull } from "drizzle-orm";
import type { Goal } from "../../domain/goal";
import { goal } from "../schema";
import { repositoryDefaults, type RepositoryOptions } from "./repository";

export type GoalRow = typeof goal.$inferSelect;

const notDeleted = isNull(goal.deletedAt);

/** Most recent first: `updated_at`, then `id` (UUID v7, time-ordered). */
const newestFirst = [desc(goal.updatedAt), desc(goal.id)] as const;

export function createGoalRepository(options: RepositoryOptions) {
  const { db, now, newId } = repositoryDefaults(options);

  return {
    /** The active goal, or `undefined` once run if there is none. */
    get() {
      return db
        .select()
        .from(goal)
        .where(notDeleted)
        .orderBy(...newestFirst)
        .limit(1);
    },

    /**
     * Sets the goal: updates the active one (same `id`), or creates it.
     * Returns the row.
     */
    set({ target, confirmedKey }: Goal): GoalRow {
      return db.transaction((tx) => {
        const at = now();
        const current = tx
          .select()
          .from(goal)
          .where(notDeleted)
          .orderBy(...newestFirst)
          .limit(1)
          .get();

        if (current !== undefined) {
          tx.update(goal)
            .set({ target, confirmedKey, updatedAt: at })
            .where(eq(goal.id, current.id))
            .run();
          return { ...current, target, confirmedKey, updatedAt: at };
        }

        const row: GoalRow = {
          id: newId(),
          createdAt: at,
          updatedAt: at,
          deletedAt: null,
          target,
          confirmedKey,
        };
        tx.insert(goal).values(row).run();
        return row;
      });
    },
  };
}

export type GoalRepository = ReturnType<typeof createGoalRepository>;
