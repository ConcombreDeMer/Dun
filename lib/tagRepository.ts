import { createTag, deleteTag, getTagUsageSourceData, getTags, getTaskTagIds, setTaskTags, updateTag } from "./tags";

export interface TagRepository {
  list: typeof getTags;
  getForTask: typeof getTaskTagIds;
  usageSource: typeof getTagUsageSourceData;
  create: typeof createTag;
  update: typeof updateTag;
  delete: typeof deleteTag;
  setForTask: typeof setTaskTags;
}

// Adaptateur de transition : les signatures restent stables jusqu'à la bascule SQLite.
export const supabaseTagRepository: TagRepository = {
  list: getTags,
  getForTask: getTaskTagIds,
  usageSource: getTagUsageSourceData,
  create: createTag,
  update: updateTag,
  delete: deleteTag,
  setForTask: setTaskTags,
};
