import { toAppDateKey, toDailyDateKey } from "./date";
import { supabase } from "./supabase";
import { finalizeDailyReview, getNextTaskOrder, normalizeTaskOrderForDate, syncDaySnapshot } from "./tasks";

export type DailyCompletionDay = {
  dayLabel: string;
  completionPercent: number;
};

export type DailyPendingTask = {
  id: number;
  name: string;
  description: string;
  done: boolean;
  date: string;
  order?: number | null;
  late_days?: number | null;
  delay_count?: number | null;
  late_adjusted_at?: string | null;
  resolved_at?: string | null;
  Task_Tags?: { tag_id: string }[];
};

export type DailyData = {
  previousDayFullDone: boolean;
  completionDays: DailyCompletionDay[];
  previousDayCompletion: {
    percent: number;
    completedTasks: number;
    totalTasks: number;
  };
  streak: number;
  motivation: {
    title: string;
    body: string;
  };
  pendingTasks: DailyPendingTask[];
};

type DaySnapshot = {
  date: string;
  total: number | null;
  done_count: number | null;
};

const frenchWeekdayAbbreviations = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

const getUserId = async () => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Utilisateur non connecté");
  }

  return user.id;
};

const addDays = (dateKey: string, offset: number) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + offset);
  return toAppDateKey(date);
};

const getDateDiffInDays = (fromDateKey: string, toDateKey: string) => {
  const [fromYear, fromMonth, fromDay] = fromDateKey.split("-").map(Number);
  const [toYear, toMonth, toDay] = toDateKey.split("-").map(Number);
  const fromDate = Date.UTC(fromYear, fromMonth - 1, fromDay);
  const toDate = Date.UTC(toYear, toMonth - 1, toDay);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.max(0, Math.round((toDate - fromDate) / millisecondsPerDay));
};

const getDayPercent = (day?: DaySnapshot) => {
  const total = Math.max(day?.total ?? 0, 0);

  if (total === 0) {
    return 0;
  }

  const done = Math.min(Math.max(day?.done_count ?? 0, 0), total);
  return Math.round((done / total) * 100);
};

const getDayLabel = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return frenchWeekdayAbbreviations[new Date(year, month - 1, day).getDay()];
};

const buildMotivation = (completedTasks: number, totalTasks: number) => {
  if (totalTasks === 0) {
    return {
      title: "Nouvelle page !",
      body: "Hier etait calme. Tu peux demarrer frais aujourd'hui.",
    };
  }

  if (completedTasks >= totalTasks) {
    return {
      title: "Felicitations !",
      body: `Tu as complete tes ${totalTasks} taches d'hier.`,
    };
  }

  return {
    title: "Belle avance !",
    body: `Tu as complete ${completedTasks} de tes ${totalTasks} taches d'hier.`,
  };
};

const computeBaseStreak = (daysByDate: Map<string, DaySnapshot>, yesterdayKey: string) => {
  let streak = 0;
  let cursor = addDays(yesterdayKey, -1);

  while (getDayPercent(daysByDate.get(cursor)) >= 100) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
};

export const getDailyData = async (): Promise<DailyData> => {
  const userId = await getUserId();
  const todayKey = toDailyDateKey(new Date());
  const yesterdayKey = addDays(todayKey, -1);
  const firstCompletionDayKey = addDays(todayKey, -7);
  const streakLookupStartKey = addDays(todayKey, -365);

  const [{ data: days, error: daysError }, { data: pendingTasks, error: pendingTasksError }] = await Promise.all([
    supabase
      .from("Days")
      .select("date, total, done_count")
      .eq("user_id", userId)
      .gte("date", streakLookupStartKey)
      .lt("date", todayKey)
      .order("date", { ascending: false }),
    supabase
      .from("Tasks")
      .select("id, name, description, done, order, date, delay_count, late_adjusted_at, resolved_at, Task_Tags(tag_id)")
      .eq("user_id", userId)
      .eq("done", false)
      .is("resolved_at", null)
      .lt("date", todayKey)
      .order("date", { ascending: false })
      .order("order", { ascending: false }),
  ]);

  if (daysError) {
    throw new Error(daysError.message);
  }

  if (pendingTasksError) {
    throw new Error(pendingTasksError.message);
  }

  const daysByDate = new Map<string, DaySnapshot>();
  for (const day of days ?? []) {
    daysByDate.set(toAppDateKey(day.date), day);
  }

  const completionDays = Array.from({ length: 7 }, (_, index) => {
    const dateKey = addDays(firstCompletionDayKey, index);

    return {
      dayLabel: getDayLabel(dateKey),
      completionPercent: getDayPercent(daysByDate.get(dateKey)),
    };
  });

  const previousDay = daysByDate.get(yesterdayKey);
  const previousDayTotal = Math.max(previousDay?.total ?? 0, 0);
  const previousDayDone = Math.min(Math.max(previousDay?.done_count ?? 0, 0), previousDayTotal);
  const previousDayPercent = getDayPercent(previousDay);

  return {
    previousDayFullDone: previousDayPercent >= 100,
    completionDays,
    previousDayCompletion: {
      percent: previousDayPercent,
      completedTasks: previousDayDone,
      totalTasks: previousDayTotal,
    },
    streak: computeBaseStreak(daysByDate, yesterdayKey),
    motivation: buildMotivation(previousDayDone, previousDayTotal),
    pendingTasks: (pendingTasks ?? []).map((task) => ({
      ...task,
      late_days: task.date ? getDateDiffInDays(toAppDateKey(task.date), todayKey) : null,
    })),
  };
};

export const postponeDailyPendingTask = async (taskId: number, targetDateKey = toDailyDateKey(new Date())) => {
  const userId = await getUserId();
  const { data: taskData, error: fetchError } = await supabase
    .from("Tasks")
    .select("date, delay_count")
    .eq("id", taskId)
    .eq("user_id", userId)
    .single();

  if (fetchError || !taskData) {
    throw new Error(fetchError?.message || "Tâche non trouvée");
  }

  const previousDateKey = taskData.date ? toAppDateKey(taskData.date) : null;

  if (!previousDateKey || previousDateKey >= targetDateKey) {
    throw new Error("Cette action est réservée aux tâches en retard");
  }

  const order = await getNextTaskOrder(targetDateKey, userId);
  const { error } = await supabase
    .from("Tasks")
    .update({
      date: targetDateKey,
      done: false,
      completed_at: null,
      resolved_at: null,
      resolution: null,
      delay_count: (taskData.delay_count || 0) + 1,
      last_update_date: new Date().toISOString(),
      order,
    })
    .eq("id", taskId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  await normalizeTaskOrderForDate(previousDateKey, userId);
  await Promise.all([
    syncDaySnapshot(previousDateKey, userId),
    syncDaySnapshot(targetDateKey, userId),
  ]);
};

export const deleteDailyPendingTask = async (taskId: number) => {
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

  const { error: tagsError } = await supabase
    .from("Task_Tags")
    .delete()
    .eq("task_id", taskId)
    .eq("user_id", userId);

  if (tagsError) {
    throw new Error(tagsError.message);
  }

  const { error } = await supabase
    .from("Tasks")
    .delete()
    .eq("id", taskId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  if (previousDateKey) {
    await normalizeTaskOrderForDate(previousDateKey, userId);
    await syncDaySnapshot(previousDateKey, userId);
  }
};

export const setDailyPendingTaskDone = async (taskId: number, nextDone: boolean) => {
  const userId = await getUserId();
  const { data: taskData, error: fetchError } = await supabase
    .from("Tasks")
    .select("date, resolved_at")
    .eq("id", taskId)
    .eq("user_id", userId)
    .single();

  if (fetchError || !taskData) {
    throw new Error(fetchError?.message || "Tâche non trouvée");
  }

  if (taskData.resolved_at) {
    throw new Error("Cette tâche a déjà été traitée");
  }

  const taskDateKey = taskData.date ? toAppDateKey(taskData.date) : null;
  const { error } = await supabase
    .from("Tasks")
    .update({
      done: nextDone,
      completed_at: nextDone ? new Date().toISOString() : null,
      last_update_date: new Date().toISOString(),
    })
    .eq("id", taskId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  if (taskDateKey) {
    await syncDaySnapshot(taskDateKey, userId);
  }
};

export const completeDailyReview = async () => {
  const userId = await getUserId();
  const todayKey = toDailyDateKey(new Date());

  await finalizeDailyReview(todayKey);

  const { error } = await supabase
    .from("Profiles")
    .update({ hasDoneDaily: true })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }
};
