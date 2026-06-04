import { toAppDateKey } from "./date";
import { supabase } from "./supabase";
import { copyTaskTags, setTaskTags } from "./tags";

export type TaskDraftUpdate = {
  name: string;
  description: string;
  taskDate: Date;
  isDone: boolean;
};

export type OverdueTaskResolution = "deleted" | "postponed" | "late_completed" | "ignored";

type UpdateTaskDraftOptions = {
  previousDateKey?: string | null;
};

type LateAdjustableTask = {
  late_adjusted_at?: string | null;
  resolved_at?: string | null;
};

const getUserId = async () => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Utilisateur non connecté");
  }

  return user.id;
};

const getTodayKey = () => toAppDateKey(new Date());

const isPastDateKey = (dateKey: string, todayKey = getTodayKey()) => {
  return dateKey < todayKey;
};

const getLateAdjustmentTimestamp = (task: LateAdjustableTask, now: string) => {
  return task.resolved_at && !task.late_adjusted_at ? now : undefined;
};

export const markTaskLateAdjustedIfResolved = async (taskId: number, userId?: string) => {
  const resolvedUserId = userId ?? await getUserId();
  const { data: taskData, error: fetchError } = await supabase
    .from("Tasks")
    .select("resolved_at, late_adjusted_at")
    .eq("id", taskId)
    .eq("user_id", resolvedUserId)
    .single();

  if (fetchError || !taskData) {
    throw new Error(fetchError?.message || "Tâche non trouvée");
  }

  const lateAdjustedAt = getLateAdjustmentTimestamp(taskData, new Date().toISOString());

  if (!lateAdjustedAt) {
    return null;
  }

  const { error } = await supabase
    .from("Tasks")
    .update({ late_adjusted_at: lateAdjustedAt })
    .eq("id", taskId)
    .eq("user_id", resolvedUserId);

  if (error) {
    throw new Error(error.message);
  }

  return lateAdjustedAt;
};

const getNextDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + 1);
  return toAppDateKey(date);
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
  tagIds = [],
}: {
  name: string;
  description?: string;
  dateKey: string;
  preferredOrder?: number;
  tagIds?: string[];
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
      completed_at: null,
      resolved_at: null,
      resolution: null,
      carried_from_id: null,
      delay_count: 0,
      date: dateKey,
      created_at: toAppDateKey(new Date()),
      user_id: userId,
      order,
    },
  ]).select("id").single();

  if (error) {
    throw new Error(error.message);
  }

  if (tagIds.length) {
    await setTaskTags(data.id as number, tagIds, userId);
  }

  return data.id as number;
};

export const setTaskDone = async (taskId: number, nextDone: boolean) => {
  const userId = await getUserId();
  const { data: taskData, error: fetchError } = await supabase
    .from("Tasks")
    .select("date, resolved_at, late_adjusted_at")
    .eq("id", taskId)
    .eq("user_id", userId)
    .single();

  if (fetchError || !taskData) {
    throw new Error(fetchError?.message || "Tâche non trouvée");
  }

  const taskDateKey = taskData.date ? toAppDateKey(taskData.date) : null;

  if (!taskData.resolved_at && taskDateKey && isPastDateKey(taskDateKey)) {
    throw new Error("Cette tâche appartient à un jour verrouillé");
  }

  const now = new Date().toISOString();
  const lateAdjustedAt = getLateAdjustmentTimestamp(taskData, now);
  const { error } = await supabase
    .from("Tasks")
    .update({
      done: nextDone,
      completed_at: nextDone ? now : null,
      ...(lateAdjustedAt ? { late_adjusted_at: lateAdjustedAt } : {}),
    })
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
  const { data: taskData, error: fetchError } = await supabase
    .from("Tasks")
    .select("date, resolved_at, late_adjusted_at")
    .eq("id", taskId)
    .eq("user_id", userId)
    .single();

  if (fetchError || !taskData) {
    throw new Error(fetchError?.message || "Tâche non trouvée");
  }

  const hasPreviousDateKey = options.previousDateKey !== undefined;
  const previousDateKey = hasPreviousDateKey
    ? options.previousDateKey
      ? toAppDateKey(options.previousDateKey)
      : options.previousDateKey
    : taskData.date
      ? toAppDateKey(taskData.date)
      : null;
  const didDateChange = previousDateKey !== nextDateKey;
  const todayKey = getTodayKey();

  if (!taskData.resolved_at && previousDateKey && (isPastDateKey(previousDateKey, todayKey) || isPastDateKey(nextDateKey, todayKey))) {
    throw new Error("Impossible de modifier une tâche d'un jour verrouillé");
  }

  const order = didDateChange ? await getNextTaskOrder(nextDateKey, userId) : undefined;
  const savedAt = new Date().toISOString();
  const lateAdjustedAt = getLateAdjustmentTimestamp(taskData, savedAt);
  const updatePayload: {
    name: string;
    description: string;
    date: string;
    last_update_date: string;
    late_adjusted_at?: string;
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

  if (lateAdjustedAt) {
    updatePayload.late_adjusted_at = lateAdjustedAt;
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
    .select("date, done, resolved_at, late_adjusted_at")
    .eq("id", taskId)
    .eq("user_id", userId)
    .single();

  if (fetchError || !taskData) {
    throw new Error(fetchError?.message || "Tâche non trouvée");
  }

  const deletedTaskDate = taskData.date ? toAppDateKey(taskData.date) : null;

  if (deletedTaskDate && isPastDateKey(deletedTaskDate)) {
    const now = new Date().toISOString();
    const lateAdjustedAt = getLateAdjustmentTimestamp(taskData, now);
    const { error } = await supabase
      .from("Tasks")
      .update({
        done: false,
        completed_at: null,
        resolved_at: taskData.resolved_at || now,
        resolution: "deleted",
        ...(lateAdjustedAt ? { late_adjusted_at: lateAdjustedAt } : {}),
      })
      .eq("id", taskId)
      .eq("user_id", userId);

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

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
    .select("date, resolved_at, late_adjusted_at")
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

  if (!taskData.resolved_at && ((previousDateKey && isPastDateKey(previousDateKey)) || isPastDateKey(dateKey))) {
    throw new Error("Impossible de déplacer une tâche d'un jour verrouillé");
  }

  const order = await getNextTaskOrder(dateKey, userId);
  const lateAdjustedAt = getLateAdjustmentTimestamp(taskData, new Date().toISOString());
  const { error } = await supabase
    .from("Tasks")
    .update({
      date: dateKey,
      order,
      ...(lateAdjustedAt ? { late_adjusted_at: lateAdjustedAt } : {}),
    })
    .eq("id", taskId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  if (previousDateKey) {
    await normalizeTaskOrderForDate(previousDateKey, userId);
  }
};

export const resolveOverdueTask = async (
  taskId: number,
  resolution: OverdueTaskResolution,
  targetDateKey = getTodayKey()
) => {
  const userId = await getUserId();
  const { data: taskData, error: fetchError } = await supabase
    .from("Tasks")
    .select("id, name, description, date, done, order, resolved_at, delay_count")
    .eq("id", taskId)
    .eq("user_id", userId)
    .single();

  if (fetchError || !taskData) {
    throw new Error(fetchError?.message || "Tâche non trouvée");
  }

  const taskDateKey = taskData.date ? toAppDateKey(taskData.date) : null;

  if (!taskDateKey || !isPastDateKey(taskDateKey, targetDateKey)) {
    throw new Error("Cette action est réservée aux tâches en retard");
  }

  if (taskData.resolved_at) {
    throw new Error("Cette tâche a déjà été traitée");
  }

  const now = new Date().toISOString();

  if (resolution === "postponed") {
    const nextDelayCount = (taskData.delay_count || 0) + 1;
    const order = await getNextTaskOrder(targetDateKey, userId);
    const { error: updateError } = await supabase
      .from("Tasks")
      .update({
        done: false,
        completed_at: null,
        resolved_at: now,
        resolution: "postponed",
      })
      .eq("id", taskId)
      .eq("user_id", userId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    const { data: newTask, error: insertError } = await supabase
      .from("Tasks")
      .insert([
        {
          name: taskData.name,
          description: taskData.description || "",
          done: false,
          completed_at: null,
          resolved_at: null,
          resolution: null,
          carried_from_id: taskId,
          delay_count: nextDelayCount,
          date: targetDateKey,
          created_at: toAppDateKey(new Date()),
          user_id: userId,
          order,
        },
      ])
      .select("id")
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    if (newTask?.id) {
      await copyTaskTags(taskId, newTask.id as number, userId);
    }

    return newTask?.id as number | undefined;
  }

  const isLateCompleted = resolution === "late_completed";
  const { error } = await supabase
    .from("Tasks")
    .update({
      done: isLateCompleted,
      completed_at: isLateCompleted ? now : null,
      resolved_at: now,
      resolution,
    })
    .eq("id", taskId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
};

export const finalizeDailyReview = async (todayKey = getTodayKey()) => {
  const userId = await getUserId();
  const { data: pastTasks, error: fetchError } = await supabase
    .from("Tasks")
    .select("id, date, done, resolved_at")
    .eq("user_id", userId)
    .lt("date", todayKey);

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  const now = new Date().toISOString();
  const tasksByDate = new Map<string, { id: number; done: boolean }[]>();

  for (const task of pastTasks || []) {
    if (!task.date) continue;
    const dateKey = toAppDateKey(task.date);
    const dateTasks = tasksByDate.get(dateKey) ?? [];
    dateTasks.push({ id: task.id, done: Boolean(task.done) });
    tasksByDate.set(dateKey, dateTasks);
  }

  const unresolvedDoneIds = (pastTasks || [])
    .filter((task) => !task.resolved_at && task.done)
    .map((task) => task.id);
  const unresolvedMissedIds = (pastTasks || [])
    .filter((task) => !task.resolved_at && !task.done)
    .map((task) => task.id);

  if (unresolvedDoneIds.length > 0) {
    const { error } = await supabase
      .from("Tasks")
      .update({ resolved_at: now })
      .in("id", unresolvedDoneIds)
      .eq("user_id", userId);

    if (error) {
      throw new Error(error.message);
    }
  }

  if (unresolvedMissedIds.length > 0) {
    const { error } = await supabase
      .from("Tasks")
      .update({
        done: false,
        completed_at: null,
        resolved_at: now,
        resolution: "ignored",
      })
      .in("id", unresolvedMissedIds)
      .eq("user_id", userId);

    if (error) {
      throw new Error(error.message);
    }
  }

  for (const [dateKey] of tasksByDate) {
    await syncDaySnapshot(dateKey, userId);
  }
};

export const syncDaySnapshot = async (dateKey: string, userId?: string) => {
  const resolvedUserId = userId ?? await getUserId();
  const { data: tasks, error: tasksError } = await supabase
    .from("Tasks")
    .select("done, late_adjusted_at")
    .eq("user_id", resolvedUserId)
    .gte("date", dateKey)
    .lt("date", getNextDateKey(dateKey));

  if (tasksError) {
    throw new Error(tasksError.message);
  }

  const total = tasks?.length ?? 0;
  const doneCount = tasks?.filter((task) => task.done).length ?? 0;
  const lateAdjustedCount = tasks?.filter((task) => task.late_adjusted_at).length ?? 0;
  const dayDate = `${dateKey}T00:00:00`;

  const { data: existingDay, error: existingError } = await supabase
    .from("Days")
    .select("id")
    .eq("user_id", resolvedUserId)
    .gte("date", dateKey)
    .lt("date", getNextDateKey(dateKey))
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingDay?.id) {
    const { error } = await supabase
      .from("Days")
      .update({ total, done_count: doneCount, late_adjusted_count: lateAdjustedCount })
      .eq("id", existingDay.id)
      .eq("user_id", resolvedUserId);

    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  const { error } = await supabase
    .from("Days")
    .insert([
      {
        user_id: resolvedUserId,
        date: dayDate,
        total,
        done_count: doneCount,
        late_adjusted_count: lateAdjustedCount,
      },
    ]);

  if (error) {
    throw new Error(error.message);
  }
};
