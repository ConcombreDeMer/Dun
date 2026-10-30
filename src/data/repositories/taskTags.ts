/*
 * Links between tasks and tags (`task_tags`).
 *
 * At most three tags on a task (`assertTaskTagIds`, `src/domain/tags.ts`).
 * Reads skip deleted links and deleted tags; nothing is ever erased.
 */

import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { assertTaskTagIds } from "../../domain/tags";
import { DataError } from "../errors";
import { tags, tasks, taskTags } from "../schema";
import { repositoryDefaults, type RepositoryOptions } from "./repository";

const linkNotDeleted = isNull(taskTags.deletedAt);

export function createTaskTagRepository(options: RepositoryOptions) {
  const { db, now, newId } = repositoryDefaults(options);

  return {
    /**
     * The tags of the tasks `taskIds`, as `{ taskId, tag }` rows sorted by
     * tag name.
     */
    listForTasks(taskIds: readonly string[]) {
      return db
        .select({ taskId: taskTags.taskId, tag: tags })
        .from(taskTags)
        .innerJoin(tags, eq(taskTags.tagId, tags.id))
        .where(
          and(
            inArray(taskTags.taskId, [...taskIds]),
            linkNotDeleted,
            isNull(tags.deletedAt),
          ),
        )
        .orderBy(asc(tags.name), asc(tags.id), asc(taskTags.taskId));
    },

    /**
     * Sets the tags of a task. Removed links are soft-deleted, new ones
     * inserted, kept ones left untouched (`updated_at` included).
     *
     * Throws a `RangeError` for more than three tags or a duplicate, and
     * `not_found` if the task or a tag is missing or deleted. Nothing is
     * modified then.
     */
    setForTask(taskId: string, tagIds: readonly string[]): void {
      assertTaskTagIds(tagIds);

      db.transaction((tx) => {
        const task = tx
          .select({ id: tasks.id })
          .from(tasks)
          .where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt)))
          .get();
        if (task === undefined) {
          throw new DataError("not_found", `Task not found (${taskId})`);
        }

        const found = tx
          .select({ id: tags.id })
          .from(tags)
          .where(and(inArray(tags.id, [...tagIds]), isNull(tags.deletedAt)))
          .all();
        if (found.length !== tagIds.length) {
          throw new DataError(
            "not_found",
            `Tag not found (${tagIds.join(", ")})`,
          );
        }

        const links = tx
          .select({ id: taskTags.id, tagId: taskTags.tagId })
          .from(taskTags)
          .where(and(eq(taskTags.taskId, taskId), linkNotDeleted))
          .all();
        const current = new Set(links.map((link) => link.tagId));
        const removed = links
          .filter((link) => !tagIds.includes(link.tagId))
          .map((link) => link.id);
        const added = tagIds.filter((tagId) => !current.has(tagId));
        const at = now();

        if (removed.length > 0) {
          tx.update(taskTags)
            .set({ deletedAt: at, updatedAt: at })
            .where(inArray(taskTags.id, removed))
            .run();
        }
        if (added.length > 0) {
          tx.insert(taskTags)
            .values(
              added.map((tagId) => ({
                id: newId(),
                createdAt: at,
                updatedAt: at,
                taskId,
                tagId,
              })),
            )
            .run();
        }
      });
    },
  };
}

export type TaskTagRepository = ReturnType<typeof createTaskTagRepository>;
