/*
 * Tags repository.
 *
 * Names are unique among the tags that are not deleted, case included, as in
 * Supabase (`UNIQUE (user_id, name)`). The unique index enforces it: its
 * error becomes `duplicate_tag_name`, without a read beforehand. A deleted
 * tag frees its name.
 */

import { and, asc, eq, isNull } from "drizzle-orm";
import { DataError, isUniqueViolation } from "../errors";
import { tags, taskTags } from "../schema";
import { repositoryDefaults, type RepositoryOptions } from "./repository";

export type Tag = typeof tags.$inferSelect;

export type NewTag = { name: string; color: string };

export type TagChanges = { name?: string; color?: string };

const notDeleted = isNull(tags.deletedAt);

/** Runs `write`, turning the unique name error into `duplicate_tag_name`. */
function withUniqueName<T>(name: string | undefined, write: () => T): T {
  try {
    return write();
  } catch (error) {
    if (isUniqueViolation(error, "tags.name")) {
      throw new DataError(
        "duplicate_tag_name",
        `A tag is already named "${name}"`,
      );
    }
    throw error;
  }
}

export function createTagRepository(options: RepositoryOptions) {
  const { db, now, newId } = repositoryDefaults(options);

  return {
    /** Tags that are not deleted, by name. */
    list() {
      return db
        .select()
        .from(tags)
        .where(notDeleted)
        .orderBy(asc(tags.name), asc(tags.id));
    },

    /** Creates a tag. Throws `duplicate_tag_name` if the name is taken. */
    create({ name, color }: NewTag): Tag {
      const at = now();
      const tag: Tag = {
        id: newId(),
        createdAt: at,
        updatedAt: at,
        deletedAt: null,
        name,
        color,
      };

      withUniqueName(name, () => db.insert(tags).values(tag).run());
      return tag;
    },

    /**
     * Renames or recolors a tag. Throws `duplicate_tag_name` if the name is
     * taken, `not_found` if the tag is missing or deleted.
     */
    update(id: string, { name, color }: TagChanges): void {
      const { changes } = withUniqueName(name, () =>
        db
          .update(tags)
          .set({ name, color, updatedAt: now() })
          .where(and(eq(tags.id, id), notDeleted))
          .run(),
      );

      if (changes === 0) {
        throw new DataError("not_found", `Tag not found (${id})`);
      }
    },

    /** Soft-deletes a tag and its links to tasks. */
    remove(id: string): void {
      db.transaction((tx) => {
        const at = now();
        const { changes } = tx
          .update(tags)
          .set({ deletedAt: at, updatedAt: at })
          .where(and(eq(tags.id, id), notDeleted))
          .run();
        if (changes === 0) {
          throw new DataError("not_found", `Tag not found (${id})`);
        }

        tx.update(taskTags)
          .set({ deletedAt: at, updatedAt: at })
          .where(and(eq(taskTags.tagId, id), isNull(taskTags.deletedAt)))
          .run();
      });
    },
  };
}

export type TagRepository = ReturnType<typeof createTagRepository>;
