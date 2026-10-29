/*
 * What every repository receives. The tests inject a fixed clock and fixed
 * ids; the app keeps the defaults.
 */

import type { LocalDatabase } from "../database";
import { newId as defaultNewId } from "../ids";

export type RepositoryOptions = {
  db: LocalDatabase;
  /** Current time, for `created_at`, `updated_at` and `deleted_at`. */
  now?: () => Date;
  /** New row identifier (UUID v7). */
  newId?: () => string;
};

export function repositoryDefaults({
  db,
  now = () => new Date(),
  newId = defaultNewId,
}: RepositoryOptions): Required<RepositoryOptions> {
  return { db, now, newId };
}
