/// <reference types="node" />

/*
 * The embedded migrations match the schema, and the database applies its
 * constraints.
 *
 * The migrations are applied from `migrations.js`, the very file the app
 * embeds, on an in-memory `node:sqlite` database.
 */

import { CasingCache } from "drizzle-orm/casing";
import { getTableConfig, type SQLiteTable } from "drizzle-orm/sqlite-core";
import { DatabaseSync } from "node:sqlite";
import migrations from "./migrations/migrations";
import * as schema from "./schema";

const tables: SQLiteTable[] = [
  schema.tasks,
  schema.tags,
  schema.taskTags,
  schema.dayRecords,
  schema.restPeriods,
  schema.goal,
  schema.settings,
  schema.reminders,
];

type ColumnInfo = { name: string; type: string; notnull: number; pk: number };

function openMigratedDatabase(): DatabaseSync {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON;");

  for (const entry of migrations.journal.entries) {
    const key = `m${entry.idx.toString().padStart(4, "0")}`;
    const migration = (migrations.migrations as Record<string, string>)[key];

    for (const statement of migration.split("--> statement-breakpoint")) {
      database.exec(statement);
    }
  }

  return database;
}

/** Columns of `table` as SQLite reports them. */
function sqliteColumns(database: DatabaseSync, table: string) {
  const rows = database
    .prepare(`PRAGMA table_info(${table})`)
    .all() as ColumnInfo[];

  return rows.map(({ name, type, notnull, pk }) => ({
    name,
    type: type.toLowerCase(),
    notNull: notnull === 1,
    primaryKey: pk === 1,
  }));
}

/** Columns of `table` as the Drizzle schema declares them. */
function schemaColumns(table: SQLiteTable) {
  const casing = new CasingCache("snake_case");

  return getTableConfig(table).columns.map((column) => ({
    name: casing.getColumnCasing(column),
    type: column.getSQLType().toLowerCase(),
    notNull: column.notNull,
    primaryKey: column.primary,
  }));
}

const NOW = 1_761_436_800_000;
let rowCount = 0;

/** Inserts a row into `table`, with the base columns filled in. */
function insert(
  database: DatabaseSync,
  table: string,
  values: Record<string, string | number | null>,
) {
  rowCount += 1;
  const row = {
    id: `id-${rowCount}`,
    created_at: NOW,
    updated_at: NOW,
    ...values,
  };
  const columns = Object.keys(row);
  const placeholders = columns.map(() => "?").join(", ");

  database
    .prepare(
      `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`,
    )
    .run(...Object.values(row));

  return row.id;
}

const task = (values: Record<string, string | number | null> = {}) => ({
  name: "Courses",
  done: 0,
  date: "2026-10-26",
  order_key: "a0",
  ...values,
});

const reminder = (values: Record<string, number | string> = {}) => ({
  enabled: 1,
  hour: 8,
  minute: 30,
  weekdays: "[1,2,3,4,5,6,7]",
  repeat_enabled: 0,
  repeat_count: 1,
  repeat_delay_minutes: 15,
  ...values,
});

describe("local database schema", () => {
  let database: DatabaseSync;

  beforeEach(() => {
    database = openMigratedDatabase();
  });

  afterEach(() => {
    database.close();
  });

  it("creates exactly the tables of the schema", () => {
    const rows = database
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all() as { name: string }[];

    expect(rows.map((row) => row.name)).toEqual(
      tables.map((table) => getTableConfig(table).name).sort(),
    );
  });

  describe.each(tables.map((table) => [getTableConfig(table).name, table]))(
    "%s",
    (name, table) => {
      it("has the columns of the schema", () => {
        expect(sqliteColumns(database, name)).toEqual(schemaColumns(table));
      });

      it("has the base columns", () => {
        const columns = sqliteColumns(database, name);
        const column = (columnName: string) =>
          columns.find((item) => item.name === columnName);

        expect(column("id")).toEqual({
          name: "id",
          type: "text",
          notNull: true,
          primaryKey: true,
        });
        expect(column("created_at")).toMatchObject({ notNull: true });
        expect(column("updated_at")).toMatchObject({ notNull: true });
        expect(column("deleted_at")).toMatchObject({ notNull: false });
      });
    },
  );

  describe("constraints", () => {
    it("accepts a task without a date (Box)", () => {
      insert(database, "tasks", task({ date: null }));

      const row = database
        .prepare("SELECT date, description, delay_count FROM tasks")
        .get();

      expect(row).toEqual({ date: null, description: "", delay_count: 0 });
    });

    it("refuses a negative delay count", () => {
      expect(() =>
        insert(database, "tasks", task({ delay_count: -1 })),
      ).toThrow(/CHECK constraint failed/);
    });

    it("refuses two records of the same day", () => {
      const record = { key: "2026-10-25", status: "success", tasks: "[]" };
      insert(database, "day_records", record);

      expect(() => insert(database, "day_records", record)).toThrow(
        /UNIQUE constraint failed/,
      );
    });

    it("refuses a provisional record", () => {
      expect(() =>
        insert(database, "day_records", {
          key: "2026-10-25",
          status: "provisional",
          tasks: "[]",
        }),
      ).toThrow(/CHECK constraint failed/);
    });

    it("refuses a goal target outside the allowed values", () => {
      insert(database, "goal", { target: 7, confirmed_key: "2026-10-25" });

      expect(() =>
        insert(database, "goal", { target: 5, confirmed_key: "2026-10-25" }),
      ).toThrow(/CHECK constraint failed/);
    });

    it("refuses a rest period that ends before it starts", () => {
      insert(database, "rest_periods", {
        start_key: "2026-10-25",
        end_key: "2026-10-25",
      });

      expect(() =>
        insert(database, "rest_periods", {
          start_key: "2026-10-26",
          end_key: "2026-10-25",
        }),
      ).toThrow(/CHECK constraint failed/);
    });

    it.each([
      ["hour", 0],
      ["hour", 23],
      ["minute", 0],
      ["minute", 59],
      ["repeat_count", 1],
      ["repeat_count", 3],
      ["repeat_delay_minutes", 15],
      ["repeat_delay_minutes", 240],
    ])("accepts a reminder with %s = %i", (column, value) => {
      expect(() =>
        insert(database, "reminders", reminder({ [column]: value })),
      ).not.toThrow();
    });

    it.each([
      ["hour", -1],
      ["hour", 24],
      ["minute", -1],
      ["minute", 60],
      ["repeat_count", 0],
      ["repeat_count", 4],
      ["repeat_delay_minutes", 14],
      ["repeat_delay_minutes", 241],
    ])("refuses a reminder with %s = %i", (column, value) => {
      expect(() =>
        insert(database, "reminders", reminder({ [column]: value })),
      ).toThrow(/CHECK constraint failed/);
    });

    it("refuses an active duplicate tag link, but not after a soft deletion", () => {
      const taskId = insert(database, "tasks", task());
      const tagId = insert(database, "tags", { name: "Sport", color: "#fff" });
      const link = { task_id: taskId, tag_id: tagId };
      const firstId = insert(database, "task_tags", link);

      expect(() => insert(database, "task_tags", link)).toThrow(
        /UNIQUE constraint failed/,
      );

      database
        .prepare("UPDATE task_tags SET deleted_at = ? WHERE id = ?")
        .run(NOW, firstId);

      expect(() => insert(database, "task_tags", link)).not.toThrow();
    });

    it("refuses an active duplicate tag name, but not after a soft deletion", () => {
      const tag = { name: "Sport", color: "#fff" };
      const firstId = insert(database, "tags", tag);

      expect(() => insert(database, "tags", tag)).toThrow(
        /UNIQUE constraint failed/,
      );

      database
        .prepare("UPDATE tags SET deleted_at = ? WHERE id = ?")
        .run(NOW, firstId);

      expect(() => insert(database, "tags", tag)).not.toThrow();
    });

    it("refuses a tag link to a task that does not exist", () => {
      const tagId = insert(database, "tags", { name: "Sport", color: "#fff" });

      expect(() =>
        insert(database, "task_tags", { task_id: "missing", tag_id: tagId }),
      ).toThrow(/FOREIGN KEY constraint failed/);
    });

    it("refuses two settings with the same key", () => {
      insert(database, "settings", { key: "theme", value: '"dark"' });

      expect(() =>
        insert(database, "settings", { key: "theme", value: '"light"' }),
      ).toThrow(/UNIQUE constraint failed/);
    });
  });
});
