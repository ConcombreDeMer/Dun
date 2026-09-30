import { supabase } from "./supabase";

export type TaskOrderChange = { id: number; order: number };

export interface TaskOrderRepository {
  save(userId: string, changes: readonly TaskOrderChange[]): Promise<void>;
}

/** Adaptateur provisoire : DUN-048 remplacera ces écritures par une transaction SQLite. */
export const supabaseTaskOrderRepository: TaskOrderRepository = {
  async save(userId, changes) {
    for (const task of changes) {
      const { error } = await supabase
        .from("Tasks")
        .update({ order: task.order })
        .eq("id", task.id)
        .eq("user_id", userId)
        .select("id")
        .single();

      if (error) throw error;
    }
  },
};
