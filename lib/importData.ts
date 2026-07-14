import * as FileSystem from "expo-file-system/legacy";
import type { UserDataExport } from "./exportData";
import { supabase } from "./supabase";

type ImportTableName = keyof UserDataExport["tables"];
type ImportRow = Record<string, unknown>;

export type UserDataImportSummary = {
  exportedAt: string;
  sourceUserId: string;
  profilesCount: number;
  tasksCount: number;
  tagsCount: number;
  taskTagsCount: number;
  daysCount: number;
};

export type ParsedUserDataImport = {
  payload: UserDataExport;
  summary: UserDataImportSummary;
};

export type UserDataImportResult = {
  tasksImported: number;
  tagsImported: number;
  taskTagsImported: number;
  daysImported: number;
};

const EXPECTED_TABLES: ImportTableName[] = [
  "Profiles",
  "Tasks",
  "Tags",
  "Task_Tags",
  "Days",
  "support_issue_comments",
  "support_issue_votes",
  "support_issues",
];

const PROFILE_RESTORE_COLUMNS = [
  "name",
  "updated_at",
  "display_theme",
  "display_font",
  "hasSeenTutorial",
  "hasName",
  "alertSetupActive",
  "alertSetupHour",
  "alertSetupMinute",
  "alertInsistanceActive",
  "alertInsistanceDelais",
  "alertInsistanceRepetitions",
  "alertWeekendsActive",
  "last_opened",
  "hasDoneDaily",
  "restMode",
  "restEndDate",
  "dailyEnabled",
  "display_color",
  "language",
  "stats_include_today",
  "stats_include_following",
  "stats_include_empty",
  "stats_include_rest",
  "custom_progressbar",
  "custom_calendar",
  "stack_completed_tasks",
  "lockPastDaysEnabled",
] as const;

const TASK_RESTORE_COLUMNS = [
  "name",
  "done",
  "description",
  "created_at",
  "date",
  "order",
  "last_update_date",
  "completed_at",
  "resolved_at",
  "resolution",
  "delay_count",
  "late_adjusted_at",
] as const;

const TAG_RESTORE_COLUMNS = ["name", "color", "created_at"] as const;
const DAY_RESTORE_COLUMNS = ["date", "total", "done_count", "updated_at", "late_adjusted_count"] as const;

const isRecord = (value: unknown): value is ImportRow =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toRows = (value: unknown) => Array.isArray(value) ? value.filter(isRecord) : [];

const toNumericId = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const pickColumns = <Column extends string>(row: ImportRow, columns: readonly Column[]) => {
  const nextRow: ImportRow = {};

  for (const column of columns) {
    if (Object.prototype.hasOwnProperty.call(row, column)) {
      nextRow[column] = row[column];
    }
  }

  return nextRow;
};

const requireUser = async () => {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error("User not connected");
  }

  return data.user;
};

const assertValidPayload = (payload: unknown): UserDataExport => {
  if (!isRecord(payload) || !isRecord(payload.tables)) {
    throw new Error("Invalid import file");
  }

  if (typeof payload.exported_at !== "string" || typeof payload.user_id !== "string") {
    throw new Error("Invalid import metadata");
  }

  for (const tableName of EXPECTED_TABLES) {
    if (!Array.isArray(payload.tables[tableName])) {
      throw new Error(`Missing ${tableName} data`);
    }
  }

  return payload as unknown as UserDataExport;
};

export const readUserDataImport = async (fileUri: string): Promise<ParsedUserDataImport> => {
  const fileContent = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const payload = assertValidPayload(JSON.parse(fileContent));
  const tables = payload.tables;

  return {
    payload,
    summary: {
      exportedAt: payload.exported_at,
      sourceUserId: payload.user_id,
      profilesCount: tables.Profiles.length,
      tasksCount: tables.Tasks.length,
      tagsCount: tables.Tags.length,
      taskTagsCount: tables.Task_Tags.length,
      daysCount: tables.Days.length,
    },
  };
};

const deleteCurrentCoreData = async (userId: string) => {
  const deleteQueries = [
    supabase.from("Task_Tags").delete().eq("user_id", userId),
    supabase.from("Tasks").delete().eq("user_id", userId),
    supabase.from("Tags").delete().eq("user_id", userId),
    supabase.from("Days").delete().eq("user_id", userId),
  ];

  for (const query of deleteQueries) {
    const { error } = await query;

    if (error) {
      throw error;
    }
  }
};

const restoreProfile = async (payload: UserDataExport, userId: string) => {
  const profile = toRows(payload.tables.Profiles)[0];

  if (!profile) {
    return;
  }

  const profilePatch = pickColumns(profile, PROFILE_RESTORE_COLUMNS);

  if (Object.keys(profilePatch).length === 0) {
    return;
  }

  const { error } = await supabase
    .from("Profiles")
    .update(profilePatch)
    .eq("id", userId);

  if (error) {
    throw error;
  }
};

const restoreTags = async (payload: UserDataExport, userId: string) => {
  const tags = toRows(payload.tables.Tags);
  const tagIdMap = new Map<string, string>();

  if (tags.length === 0) {
    return tagIdMap;
  }

  const tagRows = tags.map((tag) => ({
    ...pickColumns(tag, TAG_RESTORE_COLUMNS),
    user_id: userId,
  }));

  const { data, error } = await supabase
    .from("Tags")
    .insert(tagRows)
    .select("id");

  if (error) {
    throw error;
  }

  tags.forEach((tag, index) => {
    const oldId = typeof tag.id === "string" ? tag.id : null;
    const newId = data?.[index]?.id;

    if (oldId && newId) {
      tagIdMap.set(oldId, newId as string);
    }
  });

  return tagIdMap;
};

const restoreTasks = async (payload: UserDataExport, userId: string) => {
  const tasks = toRows(payload.tables.Tasks);
  const taskIdMap = new Map<number, number>();

  if (tasks.length === 0) {
    return taskIdMap;
  }

  const taskRows = tasks.map((task) => ({
    ...pickColumns(task, TASK_RESTORE_COLUMNS),
    carried_from_id: null,
    user_id: userId,
  }));

  const { data, error } = await supabase
    .from("Tasks")
    .insert(taskRows)
    .select("id");

  if (error) {
    throw error;
  }

  tasks.forEach((task, index) => {
    const oldId = toNumericId(task.id);
    const newId = data?.[index]?.id;

    if (oldId !== null) {
      const normalizedNewId = toNumericId(newId);

      if (normalizedNewId !== null) {
        taskIdMap.set(oldId, normalizedNewId);
      }
    }
  });

  for (const task of tasks) {
    const oldTaskId = toNumericId(task.id);
    const oldCarriedFromId = toNumericId(task.carried_from_id);
    const newTaskId = oldTaskId === null ? null : taskIdMap.get(oldTaskId);
    const newCarriedFromId = oldCarriedFromId === null ? null : taskIdMap.get(oldCarriedFromId);

    if (!newTaskId || !newCarriedFromId) {
      continue;
    }

    const { error: updateError } = await supabase
      .from("Tasks")
      .update({ carried_from_id: newCarriedFromId })
      .eq("id", newTaskId)
      .eq("user_id", userId);

    if (updateError) {
      throw updateError;
    }
  }

  return taskIdMap;
};

const restoreTaskTags = async (
  payload: UserDataExport,
  userId: string,
  taskIdMap: Map<number, number>,
  tagIdMap: Map<string, string>
) => {
  const taskTags = toRows(payload.tables.Task_Tags);
  const taskTagRows: ImportRow[] = [];
  const tagCountByTask = new Map<number, number>();
  const seenRelations = new Set<string>();

  for (const taskTag of taskTags) {
    const oldTaskId = toNumericId(taskTag.task_id);
    const oldTagId = typeof taskTag.tag_id === "string" ? taskTag.tag_id : null;
    const taskId = oldTaskId === null ? null : taskIdMap.get(oldTaskId);
    const tagId = oldTagId === null ? null : tagIdMap.get(oldTagId);

    if (!taskId || !tagId) {
      continue;
    }

    const relationKey = `${taskId}:${tagId}`;

    if (seenRelations.has(relationKey)) {
      continue;
    }

    const currentCount = tagCountByTask.get(taskId) ?? 0;

    if (currentCount >= 3) {
      continue;
    }

    seenRelations.add(relationKey);
    tagCountByTask.set(taskId, currentCount + 1);
    taskTagRows.push({
      task_id: taskId,
      tag_id: tagId,
      user_id: userId,
      created_at: taskTag.created_at,
    });
  }

  if (taskTagRows.length === 0) {
    return 0;
  }

  const { error } = await supabase
    .from("Task_Tags")
    .insert(taskTagRows);

  if (error) {
    throw error;
  }

  return taskTagRows.length;
};

const restoreDays = async (payload: UserDataExport, userId: string) => {
  const days = toRows(payload.tables.Days);

  if (days.length === 0) {
    return 0;
  }

  const dayRows = days.map((day) => ({
    ...pickColumns(day, DAY_RESTORE_COLUMNS),
    user_id: userId,
  }));

  const { error } = await supabase
    .from("Days")
    .upsert(dayRows, { onConflict: "user_id,date" });

  if (error) {
    throw error;
  }

  return dayRows.length;
};

export const replaceUserDataFromImport = async (
  payload: UserDataExport
): Promise<UserDataImportResult> => {
  const user = await requireUser();
  const userId = user.id;

  await deleteCurrentCoreData(userId);
  await restoreProfile(payload, userId);
  const tagIdMap = await restoreTags(payload, userId);
  const taskIdMap = await restoreTasks(payload, userId);
  const taskTagsImported = await restoreTaskTags(payload, userId, taskIdMap, tagIdMap);
  const daysImported = await restoreDays(payload, userId);

  return {
    tasksImported: taskIdMap.size,
    tagsImported: tagIdMap.size,
    taskTagsImported,
    daysImported,
  };
};
