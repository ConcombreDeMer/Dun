import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useAuthUserId } from "./AuthSessionContext";
import { supabase } from "./supabase";

export type ProfilePreferencesRow = {
  id: string;
  name: string | null;
  hasName: boolean | null;
  hasSeenTutorial: boolean | null;
  last_opened: string | null;
  hasDoneDaily: boolean | null;
  restMode: boolean | null;
  restEndDate: string | null;
  dailyEnabled: boolean | null;
  lockPastDaysEnabled: boolean | null;
  alertSetupActive: boolean | null;
  alertSetupHour: string | number | null;
  alertSetupMinute: string | number | null;
  alertInsistanceActive: boolean | null;
  alertInsistanceDelais: string | number | null;
  alertInsistanceRepetitions: string | number | null;
  alertWeekendsActive: boolean | null;
  custom_calendar: number | null;
  custom_progressbar: number | null;
  display_theme: string | null;
  display_color: string | null;
  display_font: string | null;
  stats_include_today: boolean | null;
  stats_include_following: boolean | null;
  stats_include_empty: boolean | null;
  stats_include_rest: boolean | null;
};

export const PROFILE_QUERY_KEY = ["profile"] as const;

export const profileQueryKey = (userId: string | null) =>
  [...PROFILE_QUERY_KEY, userId] as const;

export const PROFILE_SELECT_COLUMNS = [
  "id",
  "name",
  "hasName",
  "hasSeenTutorial",
  "last_opened",
  "hasDoneDaily",
  "restMode",
  "restEndDate",
  "dailyEnabled",
  "lockPastDaysEnabled",
  "alertSetupActive",
  "alertSetupHour",
  "alertSetupMinute",
  "alertInsistanceActive",
  "alertInsistanceDelais",
  "alertInsistanceRepetitions",
  "alertWeekendsActive",
  "custom_calendar",
  "custom_progressbar",
  "display_theme",
  "display_color",
  "display_font",
  "stats_include_today",
  "stats_include_following",
  "stats_include_empty",
  "stats_include_rest",
].join(", ");

export const fetchProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from("Profiles")
    .select(PROFILE_SELECT_COLUMNS)
    .eq("id", userId)
    .single();

  if (error) {
    throw error;
  }

  return data as unknown as ProfilePreferencesRow;
};

export const patchProfileCache = (
  queryClient: QueryClient,
  userId: string | null | undefined,
  patch: Partial<Omit<ProfilePreferencesRow, "id">>
) => {
  if (!userId) {
    return;
  }

  queryClient.setQueryData<ProfilePreferencesRow>(profileQueryKey(userId), (current) =>
    current ? { ...current, ...patch } : current
  );
};

export const useProfile = () => {
  const userId = useAuthUserId();
  const queryKey = useMemo(() => profileQueryKey(userId), [userId]);

  return useQuery({
    queryKey,
    queryFn: () => fetchProfile(userId as string),
    enabled: !!userId,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });
};

export const useUpdateProfile = () => {
  const userId = useAuthUserId();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => profileQueryKey(userId), [userId]);

  return useMutation({
    mutationFn: async (patch: Partial<Omit<ProfilePreferencesRow, "id">>) => {
      if (!userId) {
        return;
      }

      const { error } = await supabase
        .from("Profiles")
        .update(patch)
        .eq("id", userId);

      if (error) {
        throw error;
      }
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey });
      const previousProfile = queryClient.getQueryData<ProfilePreferencesRow>(queryKey);

      queryClient.setQueryData<ProfilePreferencesRow>(queryKey, (current) =>
        current ? { ...current, ...patch } : current
      );

      return { previousProfile };
    },
    onError: (_error, _patch, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(queryKey, context.previousProfile);
      }
    },
  });
};
