import { QueryKey, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { useAuthUserId } from "./AuthSessionContext";
import { DAYS_QUERY_KEY } from "./daysQueryKeys";
import { TAG_USAGE_STATS_QUERY_KEY } from "./tags";
import { clearOptimisticTaskDone, getOptimisticTaskDone, setOptimisticTaskDone, setTaskDone } from "./tasks";

type ToggleTaskDoneOptions = {
  queryKeys: QueryKey[];
  errorTitle?: string;
  errorMessage?: string;
  onError?: (taskId: number, previousDone: boolean) => void;
  onSuccess?: (taskId: number, nextDone: boolean) => void;
};

const updateTaskInCache = (data: unknown, taskId: number, nextDone: boolean) => {
  if (Array.isArray(data)) {
    return data.map((task) =>
      task?.id === taskId ? { ...task, done: nextDone } : task
    );
  }

  if (data && typeof data === "object" && (data as any).id === taskId) {
    return { ...(data as any), done: nextDone };
  }

  return data;
};

export const useToggleTaskDone = ({
  queryKeys,
  errorTitle = "Erreur",
  errorMessage = "Impossible de mettre à jour la tâche. Réessaie.",
  onError,
  onSuccess,
}: ToggleTaskDoneOptions) => {
  const userId = useAuthUserId();
  const queryClient = useQueryClient();
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<number>>(() => new Set());
  const pendingTaskIdsRef = useRef<Set<number>>(new Set());
  const desiredDoneByTaskIdRef = useRef<Map<number, boolean>>(new Map());
  const inFlightTaskIdsRef = useRef<Set<number>>(new Set());
  const rollbackDoneByTaskIdRef = useRef<Map<number, boolean>>(new Map());
  const invalidateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearScheduledInvalidate = useCallback(() => {
    if (invalidateTimeoutRef.current) {
      clearTimeout(invalidateTimeoutRef.current);
      invalidateTimeoutRef.current = null;
    }
  }, []);

  const scheduleInvalidate = useCallback(() => {
    clearScheduledInvalidate();

    invalidateTimeoutRef.current = setTimeout(() => {
      queryKeys.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey });
      });
      queryClient.invalidateQueries({ queryKey: [DAYS_QUERY_KEY, userId] });
      queryClient.invalidateQueries({ queryKey: TAG_USAGE_STATS_QUERY_KEY });
    }, 350);
  }, [clearScheduledInvalidate, queryClient, queryKeys, userId]);

  useEffect(() => {
    return () => {
      if (invalidateTimeoutRef.current) {
        clearTimeout(invalidateTimeoutRef.current);
      }
    };
  }, []);

  const isTaskPending = useCallback((taskId: number) => {
    return pendingTaskIds.has(taskId);
  }, [pendingTaskIds]);

  const markTaskPending = useCallback((taskId: number) => {
    pendingTaskIdsRef.current = new Set(pendingTaskIdsRef.current);
    pendingTaskIdsRef.current.add(taskId);
    setPendingTaskIds((current) => {
      const next = new Set(current);
      next.add(taskId);
      return next;
    });
  }, []);

  const unmarkTaskPending = useCallback((taskId: number) => {
    pendingTaskIdsRef.current = new Set(pendingTaskIdsRef.current);
    pendingTaskIdsRef.current.delete(taskId);
    setPendingTaskIds((current) => {
      const next = new Set(current);
      next.delete(taskId);
      return next;
    });
  }, []);

  const updateTaskDoneEverywhere = useCallback((taskId: number, nextDone: boolean) => {
    queryKeys.forEach((queryKey) => {
      queryClient.setQueryData(queryKey, (current: unknown) =>
        updateTaskInCache(current, taskId, nextDone)
      );
    });
  }, [queryClient, queryKeys]);

  const persistLatestTaskDone = useCallback(async (taskId: number) => {
    if (inFlightTaskIdsRef.current.has(taskId)) {
      return;
    }

    inFlightTaskIdsRef.current = new Set(inFlightTaskIdsRef.current);
    inFlightTaskIdsRef.current.add(taskId);

    let finalSavedDone: boolean | undefined;
    try {
      while (true) {
        const desiredDone = desiredDoneByTaskIdRef.current.get(taskId);

        if (desiredDone === undefined) {
          return;
        }

        await setTaskDone(taskId, desiredDone, userId ?? undefined);
        finalSavedDone = desiredDone;

        if (desiredDoneByTaskIdRef.current.get(taskId) === desiredDone) {
          break;
        }
      }

      desiredDoneByTaskIdRef.current.delete(taskId);
      rollbackDoneByTaskIdRef.current.delete(taskId);
      clearOptimisticTaskDone(taskId);
      unmarkTaskPending(taskId);

      if (finalSavedDone !== undefined) {
        onSuccess?.(taskId, finalSavedDone);
      }

      if (pendingTaskIdsRef.current.size === 0) {
        scheduleInvalidate();
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la tâche:", error);
      const rollbackDone = rollbackDoneByTaskIdRef.current.get(taskId);

      desiredDoneByTaskIdRef.current.delete(taskId);
      rollbackDoneByTaskIdRef.current.delete(taskId);
      clearOptimisticTaskDone(taskId);
      unmarkTaskPending(taskId);

      if (rollbackDone !== undefined) {
        updateTaskDoneEverywhere(taskId, rollbackDone);
        onError?.(taskId, rollbackDone);
      }

      Alert.alert(errorTitle, errorMessage);
    } finally {
      inFlightTaskIdsRef.current = new Set(inFlightTaskIdsRef.current);
      inFlightTaskIdsRef.current.delete(taskId);
    }
  }, [
    errorMessage,
    errorTitle,
    onError,
    onSuccess,
    scheduleInvalidate,
    unmarkTaskPending,
    updateTaskDoneEverywhere,
    userId,
  ]);

  const toggleTaskDone = useCallback(async (taskId: number, currentDone: boolean) => {
    const currentOptimisticDone = getOptimisticTaskDone(taskId);
    const nextDone = !(currentOptimisticDone ?? currentDone);

    clearScheduledInvalidate();

    if (!rollbackDoneByTaskIdRef.current.has(taskId)) {
      rollbackDoneByTaskIdRef.current.set(taskId, currentDone);
    }

    desiredDoneByTaskIdRef.current.set(taskId, nextDone);
    setOptimisticTaskDone(taskId, nextDone);
    markTaskPending(taskId);
    updateTaskDoneEverywhere(taskId, nextDone);

    void Promise.all(
      queryKeys.map((queryKey) => queryClient.cancelQueries({ queryKey }))
    );

    void persistLatestTaskDone(taskId);
    return true;
  }, [
    clearScheduledInvalidate,
    markTaskPending,
    persistLatestTaskDone,
    queryClient,
    queryKeys,
    updateTaskDoneEverywhere,
  ]);

  return {
    isTaskPending,
    pendingTaskIds,
    toggleTaskDone,
  };
};
