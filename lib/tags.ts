import { supabase } from "./supabase";

export type Tag = {
  id: string;
  user_id: string;
  name: string;
  color: string;
};

export const TAGS_QUERY_KEY = ["tags"] as const;
export const MAX_TAGS_PER_TASK = 3;

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
