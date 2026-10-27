/*
 * Local database schema (expo-sqlite, Drizzle).
 *
 * SQL names are snake_case (`casing: "snake_case"` in `drizzle.config.ts` and
 * `database.ts`). Every table has the same base columns: an `id` UUID provided
 * by the repository, `created_at` and `updated_at`, and `deleted_at` for soft
 * deletion. Day dates are `DateKey` strings (`YYYY-MM-DD`), as in
 * `src/domain`.
 *
 * After any change, run `npm run db:generate`: the migrations in
 * `src/data/migrations` are generated, never edited by hand.
 */

import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { NOTIFICATION_REMINDER_LIMITS } from "../../lib/notificationLimits";
import type { DateKey } from "../domain/date";
import type { ClosedDayStatus, RecordedTask } from "../domain/dayRecord";
import { GOAL_TARGETS, type GoalTarget } from "../domain/goal";

/** Day of the week, from Monday = 1 to Sunday = 7, as `weekday` returns. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Rows that are not soft-deleted, for the partial unique indexes. */
const notDeleted = sql`deleted_at IS NULL`;

/** Columns shared by every table. Timestamps are in milliseconds. */
const baseColumns = () => ({
  id: text().primaryKey(),
  createdAt: integer({ mode: "timestamp_ms" }).notNull(),
  updatedAt: integer({ mode: "timestamp_ms" }).notNull(),
  deletedAt: integer({ mode: "timestamp_ms" }),
});

/** Tasks. A task without a date is in the Box. */
export const tasks = sqliteTable(
  "tasks",
  {
    ...baseColumns(),
    name: text().notNull(),
    description: text().notNull().default(""),
    done: integer({ mode: "boolean" }).notNull(),
    date: text().$type<DateKey>(),
    orderKey: text().notNull(),
    delayCount: integer().notNull().default(0),
  },
  (table) => [
    check("tasks_delay_count_check", sql`${table.delayCount} >= 0`),
    index("tasks_date_order_key_idx").on(table.date, table.orderKey),
  ],
);

/** Tags. Names are unique among the tags that are not deleted. */
export const tags = sqliteTable(
  "tags",
  {
    ...baseColumns(),
    name: text().notNull(),
    color: text().notNull(),
  },
  (table) => [uniqueIndex("tags_name_unique").on(table.name).where(notDeleted)],
);

/** Link between a task and a tag, unique among the links not deleted. */
export const taskTags = sqliteTable(
  "task_tags",
  {
    ...baseColumns(),
    taskId: text()
      .notNull()
      .references(() => tasks.id),
    tagId: text()
      .notNull()
      .references(() => tags.id),
  },
  (table) => [
    uniqueIndex("task_tags_task_id_tag_id_unique")
      .on(table.taskId, table.tagId)
      .where(notDeleted),
    index("task_tags_tag_id_idx").on(table.tagId),
  ],
);

/**
 * Record of a closed day (`closeDay`): its status and the snapshot of its
 * tasks (name, state, tags with name and color), in JSON.
 */
export const dayRecords = sqliteTable(
  "day_records",
  {
    ...baseColumns(),
    key: text().$type<DateKey>().notNull(),
    status: text().$type<ClosedDayStatus>().notNull(),
    tasks: text({ mode: "json" }).$type<RecordedTask[]>().notNull(),
  },
  (table) => [
    uniqueIndex("day_records_key_unique").on(table.key),
    check(
      "day_records_status_check",
      sql`${table.status} IN ('success', 'failed', 'empty', 'rest')`,
    ),
  ],
);

/** Rest periods, from `start_key` to `end_key` included. */
export const restPeriods = sqliteTable(
  "rest_periods",
  {
    ...baseColumns(),
    startKey: text().$type<DateKey>().notNull(),
    endKey: text().$type<DateKey>().notNull(),
  },
  (table) => [
    check(
      "rest_periods_range_check",
      sql`${table.startKey} <= ${table.endKey}`,
    ),
  ],
);

/** The goal: a target number of days, confirmed on `confirmed_key`. */
export const goal = sqliteTable(
  "goal",
  {
    ...baseColumns(),
    target: integer().$type<GoalTarget>().notNull(),
    confirmedKey: text().$type<DateKey>().notNull(),
  },
  (table) => [
    check(
      "goal_target_check",
      sql`${table.target} IN (${sql.raw(GOAL_TARGETS.join(", "))})`,
    ),
  ],
);

/**
 * Settings, one row per setting (key / JSON value), so that "last write wins
 * per row" sync does not lose a setting changed on another device.
 */
export const settings = sqliteTable(
  "settings",
  {
    ...baseColumns(),
    key: text().notNull(),
    value: text({ mode: "json" }).notNull(),
  },
  (table) => [uniqueIndex("settings_key_unique").on(table.key)],
);

const { delayMinutes, repetitions } = NOTIFICATION_REMINDER_LIMITS;

/** Daily reminder: time, chosen weekdays and optional repetitions. */
export const reminders = sqliteTable(
  "reminders",
  {
    ...baseColumns(),
    enabled: integer({ mode: "boolean" }).notNull(),
    hour: integer().notNull(),
    minute: integer().notNull(),
    weekdays: text({ mode: "json" }).$type<Weekday[]>().notNull(),
    repeatEnabled: integer({ mode: "boolean" }).notNull(),
    repeatCount: integer().notNull(),
    repeatDelayMinutes: integer().notNull(),
  },
  (table) => [
    check("reminders_hour_check", sql`${table.hour} BETWEEN 0 AND 23`),
    check("reminders_minute_check", sql`${table.minute} BETWEEN 0 AND 59`),
    check(
      "reminders_repeat_count_check",
      sql`${table.repeatCount} BETWEEN ${sql.raw(String(repetitions.min))} AND ${sql.raw(String(repetitions.max))}`,
    ),
    check(
      "reminders_repeat_delay_minutes_check",
      sql`${table.repeatDelayMinutes} BETWEEN ${sql.raw(String(delayMinutes.min))} AND ${sql.raw(String(delayMinutes.max))}`,
    ),
  ],
);
