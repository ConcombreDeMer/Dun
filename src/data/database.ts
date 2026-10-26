/*
 * Local database: the `dun.db` file of the app.
 *
 * Nothing is opened when this module is imported: `openLocalDatabase` opens
 * the file on its first call, so that an opening error can be caught.
 * `useLocalDatabase` calls it at launch, then applies the migrations, before
 * any read or write.
 */

import { drizzle, type ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";
import * as schema from "./schema";

export type LocalDatabase = ExpoSQLiteDatabase<typeof schema>;

let database: LocalDatabase | undefined;

/**
 * The local database, opened on the first call and then reused. Throws if
 * the file cannot be opened or configured; the next call tries again.
 */
export function openLocalDatabase(): LocalDatabase {
  if (database) {
    return database;
  }

  /* The change listener is needed by `useLiveQuery`. */
  const sqlite = openDatabaseSync("dun.db", { enableChangeListener: true });

  try {
    sqlite.execSync("PRAGMA foreign_keys = ON;");
    sqlite.execSync("PRAGMA journal_mode = WAL;");
  } catch (error) {
    sqlite.closeSync();
    throw error;
  }

  database = drizzle(sqlite, { schema, casing: "snake_case" });
  return database;
}
