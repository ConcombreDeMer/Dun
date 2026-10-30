/*
 * Tasks repository.
 *
 * Reads return Drizzle queries that are not run yet: the tests run them with
 * `.all()` or `.get()`, a hook will pass them to `useLiveQuery`. They never
 * return a soft-deleted task. Writes run synchronously and fill `updated_at`;
 * nothing is ever erased.
 *
 * In a list, tasks are sorted by `order_key`: the head of a day (or of the
 * Box) has the smallest key.
 */

import {
  and,
  asc,
  between,
  eq,
  gt,
  isNull,
  lt,
  ne,
  type SQL,
} from "drizzle-orm";
import type { DateKey } from "../../domain/date";
import { moveTask } from "../../domain/postpone";
import { DataError } from "../errors";
import { orderKeyBetween } from "../orderKeys";
import { tasks, taskTags } from "../schema";
import { repositoryDefaults, type RepositoryOptions } from "./repository";

export type Task = typeof tasks.$inferSelect;

export type NewTask = {
  name: string;
  description?: string;
  /** `null` = the Box. */
  date: DateKey | null;
};

export type TaskChanges = {
  name?: string;
  description?: string;
  done?: boolean;
};

const notDeleted = isNull(tasks.deletedAt);

/** Condition on the day of a task, `null` being the Box. */
function onDate(date: DateKey | null): SQL {
  return date === null ? isNull(tasks.date) : eq(tasks.date, date);
}

export function createTaskRepository(options: RepositoryOptions) {
  const { db, now, newId } = repositoryDefaults(options);

  function listOn(date: DateKey | null) {
    return db
      .select()
      .from(tasks)
      .where(and(onDate(date), notDeleted))
      .orderBy(asc(tasks.orderKey), asc(tasks.id));
  }

  function get(id: string) {
    return db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), notDeleted));
  }

  function find(id: string): Task {
    const task = get(id).get();
    if (task === undefined) {
      throw new DataError("not_found", `Task not found (${id})`);
    }
    return task;
  }

  /** A key that places a task at the head of `date`. */
  function headKey(date: DateKey | null): string {
    const first = db
      .select({ orderKey: tasks.orderKey })
      .from(tasks)
      .where(and(onDate(date), notDeleted))
      .orderBy(asc(tasks.orderKey))
      .limit(1)
      .get();

    return orderKeyBetween(null, first?.orderKey ?? null);
  }

  /** Updates a task that is not deleted, or throws `not_found`. */
  function updateRow(id: string, values: Partial<Task>): void {
    const { changes } = db
      .update(tasks)
      .set({ ...values, updatedAt: now() })
      .where(and(eq(tasks.id, id), notDeleted))
      .run();

    if (changes === 0) {
      throw new DataError("not_found", `Task not found (${id})`);
    }
  }

  return {
    /** Tasks of the day `key`, in order. */
    listDay: (key: DateKey) => listOn(key),

    /** Tasks of the Box (without a date), in order. */
    listBox: () => listOn(null),

    /** Tasks dated from `startKey` to `endKey` included, by date then order. */
    listRange(startKey: DateKey, endKey: DateKey) {
      return db
        .select()
        .from(tasks)
        .where(and(between(tasks.date, startKey, endKey), notDeleted))
        .orderBy(asc(tasks.date), asc(tasks.orderKey), asc(tasks.id));
    },

    /** One task, or `undefined` once run if it is missing or deleted. */
    get,

    /** Creates a task, not done, at the head of its day (or of the Box). */
    create({ name, description = "", date }: NewTask): Task {
      const at = now();
      const task: Task = {
        id: newId(),
        createdAt: at,
        updatedAt: at,
        deletedAt: null,
        name,
        description,
        done: false,
        date,
        orderKey: headKey(date),
        delayCount: 0,
      };

      db.insert(tasks).values(task).run();
      return task;
    },

    /** Changes the name, the description or the state. Never the date. */
    update(id: string, changes: TaskChanges): void {
      const { name, description, done } = changes;
      updateRow(id, { name, description, done });
    },

    /**
     * Moves a task to `targetKey` (`null` = the Box), through `moveTask`:
     * `delay_count` goes up by one only for a postpone. The task goes to the
     * head of the target day. Nothing happens if the date does not change.
     *
     * Throws the `RangeError` of `moveTask` if a key is invalid.
     */
    move(id: string, targetKey: DateKey | null, openKey: DateKey): void {
      const task = find(id);
      const moved = moveTask(task, targetKey, openKey);
      if (moved.date === task.date) {
        return;
      }

      updateRow(id, {
        date: moved.date,
        delayCount: moved.delayCount,
        orderKey: headKey(moved.date),
      });
    },

    /**
     * Places a task between two tasks of the same day (`null` = the start or
     * the end of the list). Only the placed task is modified.
     *
     * Throws `invalid_neighbors`, before any write, if a neighbor is missing,
     * deleted or from another day, if the neighbors are not in order, or if
     * they do not follow each other: no other task of the day (or of the
     * Box) may sit between them. So both neighbors are `null` only when the
     * task is alone in its day.
     */
    place(id: string, previousId: string | null, nextId: string | null): void {
      const task = find(id);

      const neighborKey = (neighborId: string | null): string | null => {
        if (neighborId === null) {
          return null;
        }
        const neighbor = neighborId === id ? undefined : get(neighborId).get();
        if (neighbor === undefined || neighbor.date !== task.date) {
          throw new DataError(
            "invalid_neighbors",
            `Invalid neighbor (${neighborId}) for task ${id}`,
          );
        }
        return neighbor.orderKey;
      };

      const before = neighborKey(previousId);
      const after = neighborKey(nextId);

      /* Another task strictly between the neighbors (`null` = no bound). */
      const inBetween = db
        .select({ id: tasks.id })
        .from(tasks)
        .where(
          and(
            onDate(task.date),
            ne(tasks.id, id),
            notDeleted,
            before === null ? undefined : gt(tasks.orderKey, before),
            after === null ? undefined : lt(tasks.orderKey, after),
          ),
        )
        .limit(1)
        .get();
      if (inBetween !== undefined) {
        throw new DataError(
          "invalid_neighbors",
          `Neighbors of task ${id} do not follow each other`,
        );
      }

      let orderKey: string;
      try {
        orderKey = orderKeyBetween(before, after);
      } catch {
        throw new DataError(
          "invalid_neighbors",
          `Neighbors out of order for task ${id}`,
        );
      }

      updateRow(id, { orderKey });
    },

    /** Soft-deletes a task and its tag links. */
    remove(id: string): void {
      db.transaction((tx) => {
        const at = now();
        const { changes } = tx
          .update(tasks)
          .set({ deletedAt: at, updatedAt: at })
          .where(and(eq(tasks.id, id), notDeleted))
          .run();
        if (changes === 0) {
          throw new DataError("not_found", `Task not found (${id})`);
        }

        tx.update(taskTags)
          .set({ deletedAt: at, updatedAt: at })
          .where(and(eq(taskTags.taskId, id), isNull(taskTags.deletedAt)))
          .run();
      });
    },
  };
}

export type TaskRepository = ReturnType<typeof createTaskRepository>;
