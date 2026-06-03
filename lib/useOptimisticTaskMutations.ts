import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toAppDateKey } from "./date";
import { createTask, deleteTask, moveTaskDate, resolveOverdueTask } from "./tasks";

type TaskCacheItem = {
  id: number;
  clientKey?: string;
  name: string;
  description: string;
  tagIds?: string[];
  done: boolean;
  order: number;
  date: string;
  completed_at?: string | null;
  resolved_at?: string | null;
  resolution?: string | null;
  carried_from_id?: number | null;
  delay_count?: number | null;
};

type TaskMutationSnapshot = {
  id: number;
  clientKey?: string;
  name: string;
  description: string;
  tagIds?: string[];
  done: boolean;
  order?: number;
  date?: string;
  completed_at?: string | null;
  resolved_at?: string | null;
  resolution?: string | null;
  carried_from_id?: number | null;
  delay_count?: number | null;
};

type CreateTaskInput = {
  name: string;
  description?: string;
  dateKey: string;
  tagIds?: string[];
};

const TASKS_QUERY_KEY = ["tasks"] as const;
const DAYS_QUERY_KEY = ["days"] as const;
let nextTempTaskId = -1;

const getNextLocalOrder = (tasks: TaskCacheItem[] | undefined, dateKey: string) => {
  const dateTasks = tasks?.filter((task) => task.date && toAppDateKey(task.date) === dateKey) ?? [];

  if (dateTasks.length === 0) {
    return 1;
  }

  return Math.max(...dateTasks.map((task) => task.order || 0)) + 1;
};

const removeTaskFromCache = (tasks: TaskCacheItem[] | undefined, taskId: number) => {
  return tasks?.filter((task) => task.id !== taskId) ?? [];
};

const normalizeOrdersForDate = (tasks: TaskCacheItem[], dateKey: string) => {
  const dateTasks = tasks
    .filter((task) => task.date && toAppDateKey(task.date) === dateKey)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  const nextOrderById = new Map(
    dateTasks.map((task, index) => [task.id, index + 1])
  );

  return tasks.map((task) => {
    const nextOrder = nextOrderById.get(task.id);
    return nextOrder ? { ...task, order: nextOrder } : task;
  });
};

const isTaskCacheItem = (task: TaskMutationSnapshot | undefined): task is TaskCacheItem => {
  return !!task?.date && typeof task.order === "number";
};

export const useOptimisticTaskMutations = () => {
  const queryClient = useQueryClient();
  const invalidateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const [pendingCreateIds, setPendingCreateIds] = useState<Set<number>>(() => new Set());
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<number>>(() => new Set());
  const [pendingMoveIds, setPendingMoveIds] = useState<Set<number>>(() => new Set());

  const scheduleInvalidate = useCallback(() => {
    if (invalidateTimeoutRef.current) {
      clearTimeout(invalidateTimeoutRef.current);
    }

    invalidateTimeoutRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: DAYS_QUERY_KEY });
    }, 350);
  }, [queryClient]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      if (invalidateTimeoutRef.current) {
        clearTimeout(invalidateTimeoutRef.current);
      }
    };
  }, []);

  const createTaskOptimistically = useCallback(async ({
    name,
    description = "",
    dateKey,
    tagIds = [],
  }: CreateTaskInput) => {
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      throw new Error("Task name is required");
    }

    const previousTasks = queryClient.getQueryData<TaskCacheItem[]>(TASKS_QUERY_KEY);
    const tempId = nextTempTaskId--;
    const optimisticOrder = getNextLocalOrder(previousTasks, dateKey);
    const optimisticTask: TaskCacheItem = {
      id: tempId,
      clientKey: `optimistic-task-${tempId}`,
      name: trimmedName,
      description: trimmedDescription,
      tagIds,
      done: false,
      completed_at: null,
      resolved_at: null,
      resolution: null,
      carried_from_id: null,
      delay_count: 0,
      order: optimisticOrder,
      date: dateKey,
    };

    if (isMountedRef.current) {
      setPendingCreateIds((current) => {
        const next = new Set(current);
        next.add(tempId);
        return next;
      });
    }

    queryClient.setQueryData<TaskCacheItem[]>(TASKS_QUERY_KEY, (current) => [
      ...(current ?? []),
      optimisticTask,
    ]);

    try {
      const realTaskId = await createTask({
        name: trimmedName,
        description: trimmedDescription,
        dateKey,
        preferredOrder: optimisticOrder,
        tagIds,
      });

      queryClient.setQueryData<TaskCacheItem[]>(TASKS_QUERY_KEY, (current) =>
        (current ?? []).map((task) => {
          if (task.id !== tempId) {
            return task;
          }

          return { ...task, id: realTaskId };
        })
      );
      scheduleInvalidate();
      return realTaskId;
    } catch (error) {
      queryClient.setQueryData<TaskCacheItem[]>(TASKS_QUERY_KEY, (current) =>
        removeTaskFromCache(current, tempId)
      );
      throw error;
    } finally {
      if (isMountedRef.current) {
        setPendingCreateIds((current) => {
          const next = new Set(current);
          next.delete(tempId);
          return next;
        });
      }
    }
  }, [queryClient, scheduleInvalidate]);

  const deleteTaskOptimistically = useCallback(async (taskId: number, taskSnapshot?: TaskMutationSnapshot) => {
    const previousTasks = queryClient.getQueryData<TaskCacheItem[]>(TASKS_QUERY_KEY);
    const deletedTask = previousTasks?.find((task) => task.id === taskId) ?? taskSnapshot;

    if (isMountedRef.current) {
      setPendingDeleteIds((current) => {
        const next = new Set(current);
        next.add(taskId);
        return next;
      });
    }

    if (deletedTask) {
      queryClient.setQueryData<TaskCacheItem[]>(TASKS_QUERY_KEY, (current) =>
        deletedTask.date
          ? normalizeOrdersForDate(
            removeTaskFromCache(current, taskId),
            toAppDateKey(deletedTask.date)
          )
          : removeTaskFromCache(current, taskId)
      );
    }

    try {
      await deleteTask(taskId);
      scheduleInvalidate();
    } catch (error) {
      if (deletedTask) {
        queryClient.setQueryData<TaskCacheItem[]>(TASKS_QUERY_KEY, (current) => {
          if (current?.some((task) => task.id === taskId)) {
            return current;
          }

          return isTaskCacheItem(deletedTask) ? [...(current ?? []), deletedTask] : current;
        });
      }
      throw error;
    } finally {
      if (isMountedRef.current) {
        setPendingDeleteIds((current) => {
          const next = new Set(current);
          next.delete(taskId);
          return next;
        });
      }
    }
  }, [queryClient, scheduleInvalidate]);

  const moveTaskDateOptimistically = useCallback(async (taskId: number, dateKey: string, taskSnapshot?: TaskMutationSnapshot) => {
    const previousTasks = queryClient.getQueryData<TaskCacheItem[]>(TASKS_QUERY_KEY);
    const movedTask = previousTasks?.find((task) => task.id === taskId) ?? taskSnapshot;

    if (movedTask?.date && toAppDateKey(movedTask.date) === dateKey) {
      return;
    }

    if (isMountedRef.current) {
      setPendingMoveIds((current) => {
        const next = new Set(current);
        next.add(taskId);
        return next;
      });
    }

    if (movedTask) {
      queryClient.setQueryData<TaskCacheItem[]>(TASKS_QUERY_KEY, (current) => {
        const currentTasks = current ?? [];
        const sourceDateKey = movedTask.date ? toAppDateKey(movedTask.date) : dateKey;
        const nextOrder = getNextLocalOrder(
          currentTasks.filter((task) => task.id !== taskId),
          dateKey
        );
        const nextTask: TaskCacheItem = { ...movedTask, date: dateKey, order: nextOrder };
        const movedTasks = currentTasks.some((task) => task.id === taskId)
          ? currentTasks.map((task) => task.id === taskId ? nextTask : task)
          : [...currentTasks, nextTask];

        return normalizeOrdersForDate(movedTasks, sourceDateKey);
      });
    }

    try {
      await moveTaskDate(taskId, dateKey);
      scheduleInvalidate();
    } catch (error) {
      if (movedTask) {
        queryClient.setQueryData<TaskCacheItem[]>(TASKS_QUERY_KEY, (current) =>
          isTaskCacheItem(movedTask)
            ? (current ?? []).map((task) => task.id === taskId ? movedTask : task)
            : removeTaskFromCache(current, taskId)
        );
      }
      throw error;
    } finally {
      if (isMountedRef.current) {
        setPendingMoveIds((current) => {
          const next = new Set(current);
          next.delete(taskId);
          return next;
        });
      }
    }
  }, [queryClient, scheduleInvalidate]);

  const isTaskDeletePending = useCallback((taskId: number) => {
    return pendingDeleteIds.has(taskId);
  }, [pendingDeleteIds]);

  const isTaskMovePending = useCallback((taskId: number) => {
    return pendingMoveIds.has(taskId);
  }, [pendingMoveIds]);

  return {
    createTaskOptimistically,
    deleteTaskOptimistically,
    moveTaskDateOptimistically,
    isCreatingTask: pendingCreateIds.size > 0,
    isTaskDeletePending,
    isTaskMovePending,
    pendingCreateIds,
    pendingDeleteIds,
    pendingMoveIds,
  };
};

export const useOptimisticOverdueTaskMutations = () => {
  const queryClient = useQueryClient();
  const invalidateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<number>>(() => new Set());

  const scheduleInvalidate = useCallback(() => {
    if (invalidateTimeoutRef.current) {
      clearTimeout(invalidateTimeoutRef.current);
    }

    invalidateTimeoutRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: DAYS_QUERY_KEY });
    }, 350);
  }, [queryClient]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      if (invalidateTimeoutRef.current) {
        clearTimeout(invalidateTimeoutRef.current);
      }
    };
  }, []);

  const resolveOverdueTaskOptimistically = useCallback(async (
    taskId: number,
    resolution: "deleted" | "postponed" | "late_completed" | "ignored",
    taskSnapshot?: TaskMutationSnapshot,
    targetDateKey = toAppDateKey(new Date())
  ) => {
    const previousTasks = queryClient.getQueryData<TaskCacheItem[]>(TASKS_QUERY_KEY);
    const overdueTask = previousTasks?.find((task) => task.id === taskId) ?? taskSnapshot;
    const tempId = resolution === "postponed" ? nextTempTaskId-- : null;
    const now = new Date().toISOString();

    if (isMountedRef.current) {
      setPendingTaskIds((current) => {
        const next = new Set(current);
        next.add(taskId);
        return next;
      });
    }

    if (overdueTask) {
      queryClient.setQueryData<TaskCacheItem[]>(TASKS_QUERY_KEY, (current) => {
        const currentTasks = current ?? [];
        const resolvedTasks = currentTasks.map((task) => {
          if (task.id !== taskId) {
            return task;
          }

          return {
            ...task,
            done: resolution === "late_completed",
            completed_at: resolution === "late_completed" ? now : null,
            resolved_at: now,
            resolution,
          };
        });

        if (resolution !== "postponed" || tempId === null) {
          return resolvedTasks;
        }

        const nextOrder = getNextLocalOrder(resolvedTasks, targetDateKey);
        const postponedTask: TaskCacheItem = {
          ...overdueTask,
          id: tempId,
          clientKey: `optimistic-task-${tempId}`,
          done: false,
          completed_at: null,
          resolved_at: null,
          resolution: null,
          carried_from_id: taskId,
          delay_count: (overdueTask.delay_count || 0) + 1,
          date: targetDateKey,
          order: nextOrder,
        };

        return [...resolvedTasks, postponedTask];
      });
    }

    try {
      const createdTaskId = await resolveOverdueTask(taskId, resolution, targetDateKey);

      if (resolution === "postponed" && tempId !== null && createdTaskId) {
        queryClient.setQueryData<TaskCacheItem[]>(TASKS_QUERY_KEY, (current) =>
          (current ?? []).map((task) => {
            if (task.id !== tempId) {
              return task;
            }

            return { ...task, id: createdTaskId };
          })
        );
      }

      scheduleInvalidate();
      return createdTaskId;
    } catch (error) {
      if (previousTasks) {
        queryClient.setQueryData(TASKS_QUERY_KEY, previousTasks);
      } else {
        queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      }
      throw error;
    } finally {
      if (isMountedRef.current) {
        setPendingTaskIds((current) => {
          const next = new Set(current);
          next.delete(taskId);
          return next;
        });
      }
    }
  }, [queryClient, scheduleInvalidate]);

  const isOverdueTaskPending = useCallback((taskId: number) => {
    return pendingTaskIds.has(taskId);
  }, [pendingTaskIds]);

  return {
    isOverdueTaskPending,
    pendingTaskIds,
    resolveOverdueTaskOptimistically,
  };
};
