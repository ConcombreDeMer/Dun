import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";

export type ProgressBarPreference = 1 | 2;

export const PROGRESS_BAR_PREFERENCE_QUERY_KEY = ["profile", "custom_progressbar"] as const;

const normalizeProgressBarPreference = (value: unknown): ProgressBarPreference => {
  return value === 2 ? 2 : 1;
};

const fetchProgressBarPreference = async (): Promise<ProgressBarPreference> => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return 1;
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
  const queryClient = useQueryClient();

  const preferenceQuery = useQuery({
    queryKey: PROGRESS_BAR_PREFERENCE_QUERY_KEY,
    queryFn: fetchProgressBarPreference,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });

  const preference = preferenceQuery.data ?? 1;

  const mutation = useMutation({
    mutationFn: saveProgressBarPreference,
    onMutate: async (nextPreference) => {
      await queryClient.cancelQueries({ queryKey: PROGRESS_BAR_PREFERENCE_QUERY_KEY });

      const previousPreference = queryClient.getQueryData<ProgressBarPreference>(
        PROGRESS_BAR_PREFERENCE_QUERY_KEY
      );

      queryClient.setQueryData(PROGRESS_BAR_PREFERENCE_QUERY_KEY, nextPreference);

      return { previousPreference };
    },
    onError: (_error, _nextPreference, context) => {
      queryClient.setQueryData(
        PROGRESS_BAR_PREFERENCE_QUERY_KEY,
        context?.previousPreference ?? 1
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PROGRESS_BAR_PREFERENCE_QUERY_KEY });
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
