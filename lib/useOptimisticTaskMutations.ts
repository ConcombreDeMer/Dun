import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toAppDateKey } from "./date";
import { createTask, deleteTask, moveTaskDate } from "./tasks";

type TaskCacheItem = {
  id: number;
  clientKey?: string;
  name: string;
  description: string;
  done: boolean;
  order: number;
  date: string;
};

type CreateTaskInput = {
  name: string;
  description?: string;
  dateKey: string;
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
      done: false,
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
      });

      queryClient.setQueryData<TaskCacheItem[]>(TASKS_QUERY_KEY, (current) =>
        (current ?? []).map((task) => {
          if (task.id !== tempId) {
            return task;
          }

          const { clientKey: _clientKey, ...confirmedTask } = task;
          return { ...confirmedTask, id: realTaskId };
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

  const deleteTaskOptimistically = useCallback(async (taskId: number) => {
    const previousTasks = queryClient.getQueryData<TaskCacheItem[]>(TASKS_QUERY_KEY);
    const deletedTask = previousTasks?.find((task) => task.id === taskId);

    if (!deletedTask) {
      return;
    }

    if (isMountedRef.current) {
      setPendingDeleteIds((current) => {
        const next = new Set(current);
        next.add(taskId);
        return next;
      });
    }

    queryClient.setQueryData<TaskCacheItem[]>(TASKS_QUERY_KEY, (current) =>
      normalizeOrdersForDate(
        removeTaskFromCache(current, taskId),
        toAppDateKey(deletedTask.date)
      )
    );

    try {
      await deleteTask(taskId);
      scheduleInvalidate();
    } catch (error) {
      queryClient.setQueryData<TaskCacheItem[]>(TASKS_QUERY_KEY, (current) => {
        if (current?.some((task) => task.id === taskId)) {
          return current;
        }

        return [...(current ?? []), deletedTask];
      });
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

  const moveTaskDateOptimistically = useCallback(async (taskId: number, dateKey: string) => {
    const previousTasks = queryClient.getQueryData<TaskCacheItem[]>(TASKS_QUERY_KEY);
    const movedTask = previousTasks?.find((task) => task.id === taskId);

    if (!movedTask || toAppDateKey(movedTask.date) === dateKey) {
      return;
    }

    if (isMountedRef.current) {
      setPendingMoveIds((current) => {
        const next = new Set(current);
        next.add(taskId);
        return next;
      });
    }

    queryClient.setQueryData<TaskCacheItem[]>(TASKS_QUERY_KEY, (current) => {
      const currentTasks = current ?? [];
      const sourceDateKey = toAppDateKey(movedTask.date);
      const nextOrder = getNextLocalOrder(
        currentTasks.filter((task) => task.id !== taskId),
        dateKey
      );
      const movedTasks = currentTasks.map((task) =>
        task.id === taskId ? { ...task, date: dateKey, order: nextOrder } : task
      );

      return normalizeOrdersForDate(movedTasks, sourceDateKey);
    });

    try {
      await moveTaskDate(taskId, dateKey);
      scheduleInvalidate();
    } catch (error) {
      queryClient.setQueryData<TaskCacheItem[]>(TASKS_QUERY_KEY, (current) =>
        (current ?? []).map((task) =>
          task.id === taskId ? movedTask : task
        )
      );
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
