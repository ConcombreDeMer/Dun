import { supabase } from "./supabase";

export type Tag = {
  id: string;
  user_id: string;
  name: string;
  color: string;
};

export const TAGS_QUERY_KEY = ["tags"] as const;
export const TAG_USAGE_STATS_QUERY_KEY = ["tag-usage-stats"] as const;
export const MAX_TAGS_PER_TASK = 3;

export type TagUsageStat = {
  tagId: string;
  name: string;
  color: string;
  total: number;
  done: number;
};

type TaskTagUsageRow = {
  tag_id: string;
  Tasks?: {
    id: number;
    done: boolean | null;
    date: string | null;
  } | {
    id: number;
    done: boolean | null;
    date: string | null;
  }[] | null;
};

const getUserId = async () => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Utilisateur non connecté");
  }

  return user.id;
};

const normalizeTagIds = (tagIds: string[]) => {
  return Array.from(new Set(tagIds.filter(Boolean))).slice(0, MAX_TAGS_PER_TASK);
};

export const getTags = async () => {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("Tags")
    .select("id, user_id, name, color")
    .eq("user_id", userId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Tag[];
};

export const getTaskTagIds = async (taskId: number, userId?: string) => {
  const resolvedUserId = userId ?? await getUserId();
  const { data, error } = await supabase
    .from("Task_Tags")
    .select("tag_id")
    .eq("task_id", taskId)
    .eq("user_id", resolvedUserId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((item) => item.tag_id as string);
};

export const getTagUsageStats = async ({
  endDateKey,
  includedDateKeys,
  includeUnused = false,
  startDateKey,
}: {
  endDateKey?: string | null;
  includedDateKeys?: string[] | null;
  includeUnused?: boolean;
  startDateKey?: string | null;
} = {}) => {
  const userId = await getUserId();
  const tags = await getTags();
  const usageByTagId = new Map(tags.map((tag) => [tag.id, { done: 0, total: 0 }]));
  const includedDateKeySet = includedDateKeys ? new Set(includedDateKeys) : null;

  const { data, error } = await supabase
    .from("Task_Tags")
    .select("tag_id, Tasks(id, done, date)")
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  for (const row of (data ?? []) as unknown as TaskTagUsageRow[]) {
    const task = Array.isArray(row.Tasks) ? row.Tasks[0] : row.Tasks;

    if (!task?.date || !usageByTagId.has(row.tag_id)) {
      continue;
    }

    const taskDateKey = task.date.slice(0, 10);

    if (includedDateKeySet && !includedDateKeySet.has(taskDateKey)) {
      continue;
    }

    if (startDateKey && taskDateKey < startDateKey) {
      continue;
    }

    if (endDateKey && taskDateKey > endDateKey) {
      continue;
    }

    const usage = usageByTagId.get(row.tag_id);
    if (!usage) continue;

    usage.total += 1;
    usage.done += task.done ? 1 : 0;
  }

  return tags
    .map<TagUsageStat>((tag) => {
      const usage = usageByTagId.get(tag.id) ?? { done: 0, total: 0 };

      return {
        tagId: tag.id,
        name: tag.name,
        color: tag.color,
        total: usage.total,
        done: usage.done,
      };
    })
    .filter((tag) => includeUnused || tag.total > 0)
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
};

export const createTag = async ({ name, color }: { name: string; color: string }) => {
  const userId = await getUserId();
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("Tag name is required");
  }

  const { data, error } = await supabase
    .from("Tags")
    .insert([{ name: trimmedName, color, user_id: userId }])
    .select("id, user_id, name, color")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Tag;
};

export const updateTag = async ({ id, name, color }: { id: string; name: string; color: string }) => {
  const userId = await getUserId();
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("Tag name is required");
  }

  const { data, error } = await supabase
    .from("Tags")
    .update({ name: trimmedName, color })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id, user_id, name, color")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Tag;
};

export const deleteTag = async (id: string) => {
  const userId = await getUserId();
  const { error } = await supabase
    .from("Tags")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
};

export const setTaskTags = async (taskId: number, tagIds: string[], userId?: string) => {
  const resolvedUserId = userId ?? await getUserId();
  const nextTagIds = normalizeTagIds(tagIds);

  const { error: deleteError } = await supabase
    .from("Task_Tags")
    .delete()
    .eq("task_id", taskId)
    .eq("user_id", resolvedUserId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (!nextTagIds.length) {
    return;
  }

  const { error: insertError } = await supabase
    .from("Task_Tags")
    .insert(nextTagIds.map((tagId) => ({
      task_id: taskId,
      tag_id: tagId,
      user_id: resolvedUserId,
    })));

  if (insertError) {
    throw new Error(insertError.message);
  }
};

export const copyTaskTags = async (sourceTaskId: number, targetTaskId: number, userId?: string) => {
  const resolvedUserId = userId ?? await getUserId();
  const { data, error } = await supabase
    .from("Task_Tags")
    .select("tag_id")
    .eq("task_id", sourceTaskId)
    .eq("user_id", resolvedUserId);

  if (error) {
    throw new Error(error.message);
  }

  await setTaskTags(
    targetTaskId,
    (data ?? []).map((item) => item.tag_id as string),
    resolvedUserId
  );
};
