import { QueryKey, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { setTaskDone } from "./tasks";

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
  const queryClient = useQueryClient();
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<number>>(() => new Set());
  const pendingTaskIdsRef = useRef<Set<number>>(new Set());
  const invalidateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleInvalidate = useCallback(() => {
    if (invalidateTimeoutRef.current) {
      clearTimeout(invalidateTimeoutRef.current);
    }

    invalidateTimeoutRef.current = setTimeout(() => {
      queryKeys.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey });
      });
      queryClient.invalidateQueries({ queryKey: ["days"] });
    }, 350);
  }, [queryClient, queryKeys]);

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

  const toggleTaskDone = useCallback(async (taskId: number, currentDone: boolean) => {
    if (pendingTaskIdsRef.current.has(taskId)) {
      return false;
    }

    const nextDone = !currentDone;

    pendingTaskIdsRef.current = new Set(pendingTaskIdsRef.current);
    pendingTaskIdsRef.current.add(taskId);
    setPendingTaskIds((current) => {
      const next = new Set(current);
      next.add(taskId);
      return next;
    });

    queryKeys.forEach((queryKey) => {
      queryClient.setQueryData(queryKey, (current: unknown) =>
        updateTaskInCache(current, taskId, nextDone)
      );
    });

    try {
      await setTaskDone(taskId, nextDone);
      onSuccess?.(taskId, nextDone);
      scheduleInvalidate();
      return true;
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la tâche:", error);
      queryKeys.forEach((queryKey) => {
        queryClient.setQueryData(queryKey, (current: unknown) =>
          updateTaskInCache(current, taskId, currentDone)
        );
      });
      onError?.(taskId, currentDone);
      Alert.alert(errorTitle, errorMessage);
      return false;
    } finally {
      pendingTaskIdsRef.current = new Set(pendingTaskIdsRef.current);
      pendingTaskIdsRef.current.delete(taskId);
      setPendingTaskIds((current) => {
        const next = new Set(current);
        next.delete(taskId);
        return next;
      });
    }
  }, [
    errorMessage,
    errorTitle,
    onError,
    onSuccess,
    queryClient,
    queryKeys,
    scheduleInvalidate,
  ]);

  return {
    isTaskPending,
    pendingTaskIds,
    toggleTaskDone,
  };
};
