/*
 * Daily reminder repository (`reminders`).
 *
 * One reminder (offer: "Rappel quotidien à l'heure et aux jours choisis"),
 * kept like the goal: `set` updates the active row or creates it, `get` reads
 * the most recent row that is not deleted. The bounds (hour, minute,
 * repetitions, delay) are enforced by the SQL `CHECK` constraints.
 */

import { desc, eq, isNull } from "drizzle-orm";
import { reminders } from "../schema";
import { repositoryDefaults, type RepositoryOptions } from "./repository";

export type Reminder = typeof reminders.$inferSelect;

/** Every business column of the reminder. */
export type ReminderValues = Omit<
  Reminder,
  "id" | "createdAt" | "updatedAt" | "deletedAt"
>;

const notDeleted = isNull(reminders.deletedAt);

/** Most recent first: `updated_at`, then `id` (UUID v7, time-ordered). */
const newestFirst = [desc(reminders.updatedAt), desc(reminders.id)] as const;

export function createReminderRepository(options: RepositoryOptions) {
  const { db, now, newId } = repositoryDefaults(options);

  return {
    /** The active reminder, or `undefined` once run if there is none. */
    get() {
      return db
        .select()
        .from(reminders)
        .where(notDeleted)
        .orderBy(...newestFirst)
        .limit(1);
    },

    /**
     * Sets the reminder: updates the active one (same `id`), or creates it.
     * Returns the row.
     */
    set(values: ReminderValues): Reminder {
      const {
        enabled,
        hour,
        minute,
        weekdays,
        repeatEnabled,
        repeatCount,
        repeatDelayMinutes,
      } = values;
      const business = {
        enabled,
        hour,
        minute,
        weekdays,
        repeatEnabled,
        repeatCount,
        repeatDelayMinutes,
      };

      return db.transaction((tx) => {
        const at = now();
        const current = tx
          .select()
          .from(reminders)
          .where(notDeleted)
          .orderBy(...newestFirst)
          .limit(1)
          .get();

        if (current !== undefined) {
          tx.update(reminders)
            .set({ ...business, updatedAt: at })
            .where(eq(reminders.id, current.id))
            .run();
          return { ...current, ...business, updatedAt: at };
        }

        const row: Reminder = {
          id: newId(),
          createdAt: at,
          updatedAt: at,
          deletedAt: null,
          ...business,
        };
        tx.insert(reminders).values(row).run();
        return row;
      });
    },
  };
}

export type ReminderRepository = ReturnType<typeof createReminderRepository>;
