/*
 * Tags of a task (offer: "trois tags maximum sur une tâche").
 *
 * The rule is the same for the free plan and for Dun+: it is a business
 * rule, not an entitlement. Pure functions, arguments never modified.
 */

/** Maximum number of tags on one task. */
export const MAX_TAGS_PER_TASK = 3;

/**
 * Checks the tags given to a task.
 *
 * Throws a `RangeError` if an `id` appears twice, or if there are more than
 * `MAX_TAGS_PER_TASK` of them.
 */
export function assertTaskTagIds(tagIds: readonly string[]): void {
  if (new Set(tagIds).size !== tagIds.length) {
    throw new RangeError("assertTaskTagIds: duplicate tag id");
  }
  if (tagIds.length > MAX_TAGS_PER_TASK) {
    throw new RangeError(
      `assertTaskTagIds: at most ${MAX_TAGS_PER_TASK} tags per task (${tagIds.length})`,
    );
  }
}
