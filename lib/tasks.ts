import { toAppDateKey } from "./date";
import { supabase } from "./supabase";

export type TaskDraftUpdate = {
  name: string;
  description: string;
  taskDate: Date;
  isDone: boolean;
};

type UpdateTaskDraftOptions = {
  previousDateKey?: string | null;
};

const getUserId = async () => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Utilisateur non connecté");
  }

  return user.id;
};

export const getNextTaskOrder = async (dateKey: string, userId?: string) => {
  const resolvedUserId = userId ?? await getUserId();
  const { data, error } = await supabase
    .from("Tasks")
    .select("order")
    .eq("date", dateKey)
    .eq("user_id", resolvedUserId);

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.length) {
    return 1;
  }

  return Math.max(...data.map((task) => task.order || 0)) + 1;
};

export const createTask = async ({
  name,
  description = "",
  dateKey,
  preferredOrder,
}: {
  name: string;
  description?: string;
  dateKey: string;
  preferredOrder?: number;
}) => {
  const userId = await getUserId();
  const nextServerOrder = await getNextTaskOrder(dateKey, userId);
  const order = preferredOrder === undefined
    ? nextServerOrder
    : Math.max(preferredOrder, nextServerOrder);

  const { data, error } = await supabase.from("Tasks").insert([
    {
      name: name.trim(),
      description: description.trim(),
      done: false,
      date: dateKey,
      created_at: toAppDateKey(new Date()),
      user_id: userId,
      order,
    },
  ]).select("id").single();

  if (error) {
    throw new Error(error.message);
  }

  return data.id as number;
};

export const setTaskDone = async (taskId: number, nextDone: boolean) => {
  const userId = await getUserId();
  const { error } = await supabase
    .from("Tasks")
    .update({ done: nextDone })
    .eq("id", taskId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
};

export const updateTaskDraft = async (
  taskId: number,
  draft: TaskDraftUpdate,
  options: UpdateTaskDraftOptions = {}
) => {
  const userId = await getUserId();
  const trimmedName = draft.name.trim();

  if (!trimmedName) {
    throw new Error("Task name is required");
  }

  const nextDateKey = toAppDateKey(draft.taskDate);
  const hasPreviousDateKey = options.previousDateKey !== undefined;
  const previousDateKey = options.previousDateKey
    ? toAppDateKey(options.previousDateKey)
    : options.previousDateKey;
  const didDateChange = hasPreviousDateKey && previousDateKey !== nextDateKey;
  const order = didDateChange ? await getNextTaskOrder(nextDateKey, userId) : undefined;
  const savedAt = new Date().toISOString();
  const updatePayload: {
    name: string;
    description: string;
    date: string;
    last_update_date: string;
    order?: number;
  } = {
    name: trimmedName,
    description: draft.description.trim(),
    date: nextDateKey,
    last_update_date: savedAt,
  };

  if (order !== undefined) {
    updatePayload.order = order;
  }

  const { error } = await supabase
    .from("Tasks")
    .update(updatePayload)
    .eq("id", taskId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  if (didDateChange && previousDateKey) {
    await normalizeTaskOrderForDate(previousDateKey, userId);
  }

  return {
    draft: {
      ...draft,
      name: trimmedName,
      description: draft.description.trim(),
    },
    savedAt,
  };
};

export const normalizeTaskOrderForDate = async (dateKey: string, userId?: string) => {
  const resolvedUserId = userId ?? await getUserId();
  const { data, error } = await supabase
    .from("Tasks")
    .select("id, order")
    .eq("user_id", resolvedUserId)
    .eq("date", dateKey)
    .order("order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  let nextOrder = 1;
  for (const task of data || []) {
    if (task.order !== nextOrder) {
      const { error: updateError } = await supabase
        .from("Tasks")
        .update({ order: nextOrder })
        .eq("id", task.id)
        .eq("user_id", resolvedUserId);

      if (updateError) {
        throw new Error(updateError.message);
      }
    }
    nextOrder++;
  }
};

export const deleteTask = async (taskId: number) => {
  const userId = await getUserId();
  const { data: taskData, error: fetchError } = await supabase
    .from("Tasks")
    .select("date")
    .eq("id", taskId)
    .eq("user_id", userId)
    .single();

  if (fetchError || !taskData) {
    throw new Error(fetchError?.message || "Tâche non trouvée");
  }

  const deletedTaskDate = taskData.date ? toAppDateKey(taskData.date) : null;
  const { error } = await supabase
    .from("Tasks")
    .delete()
    .eq("id", taskId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  if (deletedTaskDate) {
    await normalizeTaskOrderForDate(deletedTaskDate, userId);
  }
};

export const moveTaskDate = async (taskId: number, dateKey: string) => {
  const userId = await getUserId();
  const { data: taskData, error: fetchError } = await supabase
    .from("Tasks")
    .select("date")
    .eq("id", taskId)
    .eq("user_id", userId)
    .single();

  if (fetchError || !taskData) {
    throw new Error(fetchError?.message || "Tâche non trouvée");
  }

  const previousDateKey = taskData.date ? toAppDateKey(taskData.date) : null;

  if (previousDateKey === dateKey) {
    return;
  }

  const order = await getNextTaskOrder(dateKey, userId);
  const { error } = await supabase
    .from("Tasks")
    .update({ date: dateKey, order })
    .eq("id", taskId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  if (previousDateKey) {
    await normalizeTaskOrderForDate(previousDateKey, userId);
  }
};
