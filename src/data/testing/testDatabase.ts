/// <reference types="node" />

/*
 * In-memory local database, for the tests only.
 *
 * The app runs the Drizzle driver `drizzle-orm/expo-sqlite` on `expo-sqlite`,
 * a native module that Jest cannot load. Here, the same driver runs on
 * `node:sqlite`, through a small adapter that exposes the synchronous part of
 * the `expo-sqlite` API the driver uses. The migrations are the ones the app
 * embeds (`migrations.js`). The tests thus exercise the same driver and the
 * same schema as the app, on a real SQLite.
 */

import { drizzle } from "drizzle-orm/expo-sqlite";
import type { SQLiteDatabase } from "expo-sqlite";
import {
  DatabaseSync,
  type SQLInputValue,
  type StatementSync,
} from "node:sqlite";
import type { LocalDatabase } from "../database";
import migrations from "../migrations/migrations";
import * as schema from "../schema";

type Params = SQLInputValue[];

/** Result of `executeSync`, as `expo-sqlite` returns it. */
type ExecuteResult = {
  changes: number;
  lastInsertRowId: number;
  getAllSync(): unknown[];
  getFirstSync(): unknown;
};

/**
 * The `expo-sqlite` prepared statement, reduced to what the driver calls:
 * `executeSync` (rows as objects, or a write) and `executeForRawResultSync`
 * (rows as arrays of values).
 */
function adaptStatement(statement: StatementSync) {
  return {
    executeSync(params: Params): ExecuteResult {
      if (statement.columns().length === 0) {
        const { changes, lastInsertRowid } = statement.run(...params);
        return {
          changes: Number(changes),
          lastInsertRowId: Number(lastInsertRowid),
          getAllSync: () => [],
          getFirstSync: () => null,
        };
      }

      statement.setReturnArrays(false);
      const rows = statement.all(...params);
      return {
        changes: 0,
        lastInsertRowId: 0,
        getAllSync: () => rows,
        getFirstSync: () => rows[0] ?? null,
      };
    },

    executeForRawResultSync(params: Params) {
      statement.setReturnArrays(true);
      const rows = statement.all(...params);
      return { getAllSync: () => rows };
    },
  };
}

function applyMigrations(database: DatabaseSync): void {
  for (const entry of migrations.journal.entries) {
    const key = `m${entry.idx.toString().padStart(4, "0")}`;
    const migration = (migrations.migrations as Record<string, string>)[key];

    for (const statement of migration.split("--> statement-breakpoint")) {
      database.exec(statement);
    }
  }
}

/**
 * A new in-memory database, with foreign keys enabled and the embedded
 * migrations applied, behind the Drizzle driver of the app.
 */
export function createTestDatabase(): LocalDatabase {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON;");
  applyMigrations(database);

  const client = {
    prepareSync: (sql: string) => adaptStatement(database.prepare(sql)),
  };

  return drizzle(client as unknown as SQLiteDatabase, {
    schema,
    casing: "snake_case",
  });
}
