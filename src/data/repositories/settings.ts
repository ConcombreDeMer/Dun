/*
 * Settings repository (`settings`): one row per setting, a key and a JSON
 * value. The value is any JSON value but `null` (the column is NOT NULL, and
 * Drizzle does not encode `null` as JSON); the typing per key comes with the
 * display settings.
 *
 * `settings_key_unique` is not partial: a soft-deleted key cannot be inserted
 * again. `set` reuses its row instead (same `id` and `created_at`).
 */

import { and, asc, eq, isNull } from "drizzle-orm";
import { DataError } from "../errors";
import { settings } from "../schema";
import { repositoryDefaults, type RepositoryOptions } from "./repository";

export type Setting = typeof settings.$inferSelect;

/** A JSON value that is not `null`, as `settings.value` stores it. */
export type SettingValue =
  | string
  | number
  | boolean
  | readonly SettingValue[]
  | { readonly [key: string]: SettingValue };

const notDeleted = isNull(settings.deletedAt);

/**
 * Whether `value` holds a number that is not finite, at any depth.
 * `JSON.stringify` would write it as `null`.
 */
function hasNonFiniteNumber(value: SettingValue): boolean {
  if (typeof value === "number") {
    return !Number.isFinite(value);
  }
  if (typeof value !== "object") {
    return false;
  }
  return Object.values(value).some(hasNonFiniteNumber);
}

export function createSettingsRepository(options: RepositoryOptions) {
  const { db, now, newId } = repositoryDefaults(options);

  return {
    /** Settings that are not deleted, by key. */
    list() {
      return db
        .select()
        .from(settings)
        .where(notDeleted)
        .orderBy(asc(settings.key));
    },

    /** The setting `key`, or `undefined` once run. */
    get(key: string) {
      return db
        .select()
        .from(settings)
        .where(and(eq(settings.key, key), notDeleted));
    },

    /**
     * Creates the setting `key`, or replaces its value. A soft-deleted row
     * of the same key is reused, with `deleted_at` back to `null`.
     *
     * Throws a `RangeError` if `value` holds a number that is not finite
     * (`NaN`, `Infinity`), at any depth; nothing is written then.
     */
    set(key: string, value: SettingValue): void {
      if (hasNonFiniteNumber(value)) {
        throw new RangeError(
          `settings.set: number not finite in the value of "${key}"`,
        );
      }
      const at = now();

      db.insert(settings)
        .values({
          id: newId(),
          createdAt: at,
          updatedAt: at,
          deletedAt: null,
          key,
          value,
        })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value, deletedAt: null, updatedAt: at },
        })
        .run();
    },

    /**
     * Soft-deletes the setting `key`: the app goes back to its default
     * value. Throws `not_found` if the key is missing or already deleted.
     */
    remove(key: string): void {
      const at = now();
      const { changes } = db
        .update(settings)
        .set({ deletedAt: at, updatedAt: at })
        .where(and(eq(settings.key, key), notDeleted))
        .run();

      if (changes === 0) {
        throw new DataError("not_found", `Setting not found (${key})`);
      }
    },
  };
}

export type SettingsRepository = ReturnType<typeof createSettingsRepository>;
