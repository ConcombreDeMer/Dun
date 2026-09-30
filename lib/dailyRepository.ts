import { isValidAppDateKey } from "./date";
import { completeDailyReview, deleteDailyPendingTask, getDailyData, postponeDailyPendingTask, setDailyPendingTaskDone } from "./daily";
import { supabase } from "./supabase";

export interface DailyRepository {
  openDay(userId: string, dayKey: string): Promise<void>;
  load: typeof getDailyData;
  postponePendingTask: typeof postponeDailyPendingTask;
  deletePendingTask: typeof deleteDailyPendingTask;
  setPendingTaskDone: typeof setDailyPendingTaskDone;
  completeReview: typeof completeDailyReview;
}

// Adaptateur de transition ; DUN-048 conservera chaque revue dans SQLite.
export const supabaseDailyRepository: DailyRepository = {
  load: getDailyData,
  postponePendingTask: postponeDailyPendingTask,
  deletePendingTask: deleteDailyPendingTask,
  setPendingTaskDone: setDailyPendingTaskDone,
  completeReview: completeDailyReview,
  async openDay(userId, dayKey) {
    if (!isValidAppDateKey(dayKey)) throw new Error("Date du Daily invalide");
    const { error } = await supabase
      .from("Profiles")
      .update({ last_opened: dayKey, hasDoneDaily: false })
      .eq("id", userId)
      .select("id")
      .single();
    if (error) throw error;
  },
};
