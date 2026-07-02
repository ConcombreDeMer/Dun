import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { supabase } from "./supabase";

export interface UserDataExport {
  exported_at: string;
  user_id: string;
  tables: {
    Profiles: unknown[];
    Tasks: unknown[];
    Tags: unknown[];
    Task_Tags: unknown[];
    Days: unknown[];
    support_issue_comments: unknown[];
    support_issue_votes: unknown[];
    support_issues: unknown[];
  };
}

const getExportDirectory = () => {
  const baseDirectory = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;

  if (!baseDirectory) {
    throw new Error("No writable file directory available");
  }

  return `${baseDirectory}exports/`;
};

const getStringByteCount = (value: string) => unescape(encodeURIComponent(value)).length;
const EXPORT_FILE_NAME = "dun-data-export.json";

const getExportFileUri = () => `${getExportDirectory()}${EXPORT_FILE_NAME}`;

const queryUserTable = async (
  table: string,
  column: string,
  userId: string,
  signal: AbortSignal
) => {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq(column, userId)
    .abortSignal(signal);

  if (error) {
    throw error;
  }

  return data ?? [];
};

export const exportUserData = async (signal: AbortSignal) => {
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  const user = authData.user;

  if (!user) {
    throw new Error("User not connected");
  }

  const [
    profiles,
    tasks,
    tags,
    taskTags,
    days,
    supportIssueComments,
    supportIssueVotes,
    supportIssues,
  ] = await Promise.all([
    queryUserTable("Profiles", "id", user.id, signal),
    queryUserTable("Tasks", "user_id", user.id, signal),
    queryUserTable("Tags", "user_id", user.id, signal),
    queryUserTable("Task_Tags", "user_id", user.id, signal),
    queryUserTable("Days", "user_id", user.id, signal),
    queryUserTable("support_issue_comments", "author_id", user.id, signal),
    queryUserTable("support_issue_votes", "user_id", user.id, signal),
    queryUserTable("support_issues", "author_id", user.id, signal),
  ]);

  if (signal.aborted) {
    const abortError = new Error("Export aborted");
    abortError.name = "AbortError";
    throw abortError;
  }

  const payload: UserDataExport = {
    exported_at: new Date().toISOString(),
    user_id: user.id,
    tables: {
      Profiles: profiles,
      Tasks: tasks,
      Tags: tags,
      Task_Tags: taskTags,
      Days: days,
      support_issue_comments: supportIssueComments,
      support_issue_votes: supportIssueVotes,
      support_issues: supportIssues,
    },
  };

  const exportDirectory = getExportDirectory();
  await FileSystem.makeDirectoryAsync(exportDirectory, { intermediates: true });

  const fileUri = getExportFileUri();
  const fileContent = JSON.stringify(payload, null, 2);

  await deleteExportFile(fileUri);

  await FileSystem.writeAsStringAsync(fileUri, fileContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return {
    fileName: EXPORT_FILE_NAME,
    fileUri,
    byteCount: getStringByteCount(fileContent),
  };
};

export const deleteExportFile = async (fileUri?: string | null) => {
  if (!fileUri) {
    return;
  }

  const info = await FileSystem.getInfoAsync(fileUri);

  if (info.exists) {
    await FileSystem.deleteAsync(fileUri, { idempotent: true });
  }
};

export const clearStoredExportData = async () => {
  const fileUri = getExportFileUri();
  const info = await FileSystem.getInfoAsync(fileUri);

  if (info.exists) {
    await FileSystem.writeAsStringAsync(fileUri, "", {
      encoding: FileSystem.EncodingType.UTF8,
    });
  }
};

export const getShareableExportUri = async (fileUri: string) => {
  if (Platform.OS === "android") {
    return FileSystem.getContentUriAsync(fileUri);
  }

  return fileUri;
};
