import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { createTask, deleteTask, fetchTaskList, markTaskLateAdjustedIfResolved, moveTaskDate, resolveOverdueTask, setTaskDone, updateTaskDraft, type TaskListItem } from "./tasks";
import { supabase } from "./supabase";
import { supabaseTaskOrderRepository, type TaskOrderChange } from "./taskOrderRepository";

export interface TaskRepository {
  listAll(userId: string, cachedTasks: TaskListItem[]): Promise<TaskListItem[]>;
  getById(userId: string, taskId: number): Promise<TaskListItem>;
  saveOrder(userId: string, changes: readonly TaskOrderChange[]): Promise<void>;
  create: typeof createTask;
  updateDraft: typeof updateTaskDraft;
  setDone: typeof setTaskDone;
  delete: typeof deleteTask;
  moveDate: typeof moveTaskDate;
  resolveOverdue: typeof resolveOverdueTask;
  markLateAdjusted: typeof markTaskLateAdjustedIfResolved;
}

// Le cache actuel contient la liste entière ; les lectures par plage arriveront avec DUN-048.
export const supabaseTaskRepository: TaskRepository = {
  listAll(userId, cachedTasks) {
    return fetchTaskList(cachedTasks, userId);
  },
  async getById(userId, taskId) {
    const { data, error } = await supabase.from("Tasks").select("*").eq("id", taskId).eq("user_id", userId).single();
    if (error) throw error;
    return data as TaskListItem;
  },
  saveOrder(userId, changes) {
    return supabaseTaskOrderRepository.save(userId, changes);
  },
  create: createTask,
  updateDraft: updateTaskDraft,
  setDone: setTaskDone,
  delete: deleteTask,
  moveDate: moveTaskDate,
  resolveOverdue: resolveOverdueTask,
  markLateAdjusted: markTaskLateAdjustedIfResolved,
};

export const taskQueryKey = (userId: string | null) => ["tasks", userId] as const;

export function useTaskList(userId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => taskQueryKey(userId), [userId]);
  const query = useQuery({
    queryKey,
    queryFn: () => {
      if (!userId) throw new Error("Utilisateur non connecté");
      return supabaseTaskRepository.listAll(
        userId,
        queryClient.getQueryData<TaskListItem[]>(queryKey) ?? [],
      );
    },
    enabled: !!userId,
    gcTime: 1000 * 60 * 30,
    staleTime: 1000 * 60 * 15,
  });

  return { query, queryKey };
}
