import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useAuthUserId } from "./AuthSessionContext";
import { supabase } from "./supabase";

export type ProgressBarPreference = 1 | 2;

export const PROGRESS_BAR_PREFERENCE_QUERY_KEY = ["profile", "custom_progressbar"] as const;
export const DEFAULT_PROGRESS_BAR_PREFERENCE: ProgressBarPreference = 2;

const normalizeProgressBarPreference = (value: unknown): ProgressBarPreference => {
  if (value === 1 || value === 2) {
    return value;
  }

  return DEFAULT_PROGRESS_BAR_PREFERENCE;
};

const fetchProgressBarPreference = async (): Promise<ProgressBarPreference> => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return DEFAULT_PROGRESS_BAR_PREFERENCE;
  }

  const { data, error } = await supabase
    .from("Profiles")
    .select("custom_progressbar")
    .eq("id", user.id)
    .single();

  if (error) {
    throw error;
  }

  return normalizeProgressBarPreference(data?.custom_progressbar);
};

const saveProgressBarPreference = async (preference: ProgressBarPreference) => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const { error } = await supabase
    .from("Profiles")
    .update({ custom_progressbar: preference })
    .eq("id", user.id);

  if (error) {
    throw error;
  }
};

export const useProgressBarPreference = () => {
  const userId = useAuthUserId();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => [...PROGRESS_BAR_PREFERENCE_QUERY_KEY, userId] as const, [userId]);

  const preferenceQuery = useQuery({
    queryKey,
    queryFn: fetchProgressBarPreference,
    enabled: !!userId,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });

  const preference = preferenceQuery.data ?? DEFAULT_PROGRESS_BAR_PREFERENCE;

  const mutation = useMutation({
    mutationFn: saveProgressBarPreference,
    onMutate: async (nextPreference) => {
      await queryClient.cancelQueries({ queryKey });

      const previousPreference = queryClient.getQueryData<ProgressBarPreference>(
        queryKey
      );

      queryClient.setQueryData(queryKey, nextPreference);

      return { previousPreference };
    },
    onError: (_error, _nextPreference, context) => {
      queryClient.setQueryData(
        queryKey,
        context?.previousPreference ?? DEFAULT_PROGRESS_BAR_PREFERENCE
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    preference,
    setPreference: mutation.mutate,
    isSaving: mutation.isPending,
    isLoading: preferenceQuery.isLoading,
    isPreferenceLoaded: preferenceQuery.data !== undefined,
    error: mutation.error ?? preferenceQuery.error,
  };
};
