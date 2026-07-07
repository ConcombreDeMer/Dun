import { getTodayAppDateKey, isPastAppDateKey, toAppDateKey } from "./date";
import { supabase } from "./supabase";
import { copyTaskTags, setTaskTags } from "./tags";

export type TaskListItem = {
  id: number;
  clientKey?: string;
  name: string;
  description: string;
  done: boolean;
  order: number;
  date: string | null;
  created_at?: string | null;
  completed_at?: string | null;
  resolved_at?: string | null;
  resolution?: string | null;
  carried_from_id?: number | null;
  delay_count?: number | null;
  late_adjusted_at?: string | null;
  Task_Tags?: { tag_id: string }[];
};

export type TaskDraftUpdate = {
  name: string;
  description: string;
  taskDate: Date | null;
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

const TASK_LIST_SELECT = "id, name, description, done, order, date, created_at, completed_at, resolved_at, resolution, carried_from_id, delay_count, late_adjusted_at, Task_Tags(tag_id)";
const optimisticTaskDoneById = new Map<number, boolean>();

const getUserId = async () => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Utilisateur non connecté");
  }

  return user.id;
};

const getTodayKey = getTodayAppDateKey;
const isPastDateKey = isPastAppDateKey;

const getLateAdjustmentTimestamp = (task: LateAdjustableTask, now: string) => {
  return task.resolved_at && !task.late_adjusted_at ? now : undefined;
};

const hydrateTaskClientKeys = (
  serverTasks: TaskListItem[],
  cachedTasks: TaskListItem[] = []
) => {
  const clientKeysByTaskId = new Map(
    cachedTasks
      .filter((task) => task.id > 0 && task.clientKey)
      .map((task) => [task.id, task.clientKey])
  );

  return serverTasks.map((task) => {
    const clientKey = clientKeysByTaskId.get(task.id);
    return clientKey ? { ...task, clientKey } : task;
  });
};

const applyOptimisticTaskDone = (tasks: TaskListItem[]) => {
  if (optimisticTaskDoneById.size === 0) {
    return tasks;
  }

  return tasks.map((task) => {
    const optimisticDone = optimisticTaskDoneById.get(task.id);
    return optimisticDone === undefined ? task : { ...task, done: optimisticDone };
  });
};

export const setOptimisticTaskDone = (taskId: number, nextDone: boolean) => {
  optimisticTaskDoneById.set(taskId, nextDone);
};

export const getOptimisticTaskDone = (taskId: number) => {
  return optimisticTaskDoneById.get(taskId);
};

export const clearOptimisticTaskDone = (taskId: number) => {
  optimisticTaskDoneById.delete(taskId);
};

export const fetchTaskList = async (cachedTasks: TaskListItem[] = [], userId?: string | null) => {
  const resolvedUserId = userId ?? await getUserId();

  if (!resolvedUserId) {
    return [];
  }

  const { data, error } = await supabase
    .from("Tasks")
    .select(TASK_LIST_SELECT)
    .eq("user_id", resolvedUserId)
    .order("order", { ascending: false });

  if (error) {
    console.error("Erreur lors de la récupération des tâches:", error);
    return [];
  }

  return applyOptimisticTaskDone(
    hydrateTaskClientKeys((data ?? []) as TaskListItem[], cachedTasks)
  );
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

export const getNextTaskOrder = async (dateKey: string | null, userId?: string) => {
  const resolvedUserId = userId ?? await getUserId();
  const query = supabase
    .from("Tasks")
    .select("order")
    .eq("user_id", resolvedUserId);
  const { data, error } = dateKey === null
    ? await query.is("date", null)
    : await query.eq("date", dateKey);

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
  userId,
}: {
  name: string;
  description?: string;
  dateKey: string | null;
  preferredOrder?: number;
  tagIds?: string[];
  userId?: string;
}) => {
  const resolvedUserId = userId ?? await getUserId();

  if (dateKey && isPastDateKey(dateKey)) {
    throw new Error("Impossible de créer une tâche dans un jour passé");
  }

  const nextServerOrder = await getNextTaskOrder(dateKey, resolvedUserId);
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
      created_at: new Date().toISOString(),
      user_id: resolvedUserId,
      order,
    },
  ]).select("id").single();

  if (error) {
    throw new Error(error.message);
  }

  if (tagIds.length) {
    try {
      await setTaskTags(data.id as number, tagIds, resolvedUserId);
    } catch (error) {
      console.error("Erreur lors de l'association des tags à la tâche:", error);
    }
  }

  return data.id as number;
};

export const setTaskDone = async (taskId: number, nextDone: boolean, userId?: string) => {
  const resolvedUserId = userId ?? await getUserId();
  const { data: taskData, error: fetchError } = await supabase
    .from("Tasks")
    .select("date, resolved_at, late_adjusted_at")
    .eq("id", taskId)
    .eq("user_id", resolvedUserId)
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
    .eq("user_id", resolvedUserId);

  if (error) {
    throw new Error(error.message);
  }
};

export const updateTaskDraft = async (
  taskId: number,
  draft: TaskDraftUpdate,
  options: UpdateTaskDraftOptions = {},
  userId?: string
) => {
  const resolvedUserId = userId ?? await getUserId();
  const trimmedName = draft.name.trim();

  if (!trimmedName) {
    throw new Error("Task name is required");
  }

  const nextDateKey = draft.taskDate ? toAppDateKey(draft.taskDate) : null;
  const { data: taskData, error: fetchError } = await supabase
    .from("Tasks")
    .select("date, resolved_at, late_adjusted_at")
    .eq("id", taskId)
    .eq("user_id", resolvedUserId)
    .single();

  if (fetchError || !taskData) {
    throw new Error(fetchError?.message || "Tâche non trouvée");
  }

  const hasPreviousDateKey = options.previousDateKey !== undefined;
  const previousDateKey: string | null = hasPreviousDateKey
    ? options.previousDateKey
      ? toAppDateKey(options.previousDateKey)
      : null
    : taskData.date
      ? toAppDateKey(taskData.date)
      : null;
  const didDateChange = previousDateKey !== nextDateKey;
  const todayKey = getTodayKey();

  if (!taskData.resolved_at && previousDateKey && (isPastDateKey(previousDateKey, todayKey) || (nextDateKey && isPastDateKey(nextDateKey, todayKey)))) {
    throw new Error("Impossible de modifier une tâche d'un jour verrouillé");
  }

  const order = didDateChange ? await getNextTaskOrder(nextDateKey, resolvedUserId) : undefined;
  const savedAt = new Date().toISOString();
  const lateAdjustedAt = getLateAdjustmentTimestamp(taskData, savedAt);
  const updatePayload: {
    name: string;
    description: string;
    date: string | null;
    last_update_date: string;
    late_adjusted_at?: string;
    order?: number | null;
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
    .eq("user_id", resolvedUserId);

  if (error) {
    throw new Error(error.message);
  }

  if (didDateChange) {
    await normalizeTaskOrderForDate(previousDateKey, resolvedUserId);
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

export const normalizeTaskOrderForDate = async (dateKey: string | null, userId?: string) => {
  const resolvedUserId = userId ?? await getUserId();
  const query = supabase
    .from("Tasks")
    .select("id, order")
    .eq("user_id", resolvedUserId);
  const scopedQuery = dateKey === null
    ? query.is("date", null)
    : query.eq("date", dateKey);
  const { data, error } = await scopedQuery.order("order", { ascending: true });

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

export const deleteTask = async (taskId: number, userId?: string) => {
  const resolvedUserId = userId ?? await getUserId();
  const { data: taskData, error: fetchError } = await supabase
    .from("Tasks")
    .select("date, done, resolved_at, late_adjusted_at")
    .eq("id", taskId)
    .eq("user_id", resolvedUserId)
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
      .eq("user_id", resolvedUserId);

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const { error } = await supabase
    .from("Tasks")
    .delete()
    .eq("id", taskId)
    .eq("user_id", resolvedUserId);

  if (error) {
    throw new Error(error.message);
  }

  await normalizeTaskOrderForDate(deletedTaskDate, resolvedUserId);
};

export const moveTaskDate = async (taskId: number, dateKey: string | null, userId?: string) => {
  const resolvedUserId = userId ?? await getUserId();
  const { data: taskData, error: fetchError } = await supabase
    .from("Tasks")
    .select("date, resolved_at, late_adjusted_at")
    .eq("id", taskId)
    .eq("user_id", resolvedUserId)
    .single();

  if (fetchError || !taskData) {
    throw new Error(fetchError?.message || "Tâche non trouvée");
  }

  const previousDateKey = taskData.date ? toAppDateKey(taskData.date) : null;

  if (previousDateKey === dateKey) {
    return;
  }

  if (!taskData.resolved_at && ((previousDateKey && isPastDateKey(previousDateKey)) || (dateKey && isPastDateKey(dateKey)))) {
    throw new Error("Impossible de déplacer une tâche d'un jour verrouillé");
  }

  const order = await getNextTaskOrder(dateKey, resolvedUserId);
  const lateAdjustedAt = getLateAdjustmentTimestamp(taskData, new Date().toISOString());
  const { error } = await supabase
    .from("Tasks")
    .update({
      date: dateKey,
      order,
      ...(lateAdjustedAt ? { late_adjusted_at: lateAdjustedAt } : {}),
    })
    .eq("id", taskId)
    .eq("user_id", resolvedUserId);

  if (error) {
    throw new Error(error.message);
  }

  await normalizeTaskOrderForDate(previousDateKey, resolvedUserId);
};

export const resolveOverdueTask = async (
  taskId: number,
  resolution: OverdueTaskResolution,
  targetDateKey = getTodayKey(),
  userId?: string
) => {
  const resolvedUserId = userId ?? await getUserId();
  const { data: taskData, error: fetchError } = await supabase
    .from("Tasks")
    .select("id, name, description, date, done, order, resolved_at, delay_count")
    .eq("id", taskId)
    .eq("user_id", resolvedUserId)
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
    const order = await getNextTaskOrder(targetDateKey, resolvedUserId);
    const { error: updateError } = await supabase
      .from("Tasks")
      .update({
        done: false,
        completed_at: null,
        resolved_at: now,
        resolution: "postponed",
      })
      .eq("id", taskId)
      .eq("user_id", resolvedUserId);

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
          user_id: resolvedUserId,
          order,
        },
      ])
      .select("id")
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    if (newTask?.id) {
      await copyTaskTags(taskId, newTask.id as number, resolvedUserId);
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
    .eq("user_id", resolvedUserId);

  if (error) {
    throw new Error(error.message);
  }
};

export const finalizeDailyReview = async (todayKey = getTodayKey(), userId?: string) => {
  const resolvedUserId = userId ?? await getUserId();
  const { data: pastTasks, error: fetchError } = await supabase
    .from("Tasks")
    .select("id, date, done, resolved_at")
    .eq("user_id", resolvedUserId)
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
      .eq("user_id", resolvedUserId);

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
      .eq("user_id", resolvedUserId);

    if (error) {
      throw new Error(error.message);
    }
  }

  for (const [dateKey] of tasksByDate) {
    await syncDaySnapshot(dateKey, resolvedUserId);
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
