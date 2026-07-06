import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useAuthUserId } from "./AuthSessionContext";
import { supabase } from "./supabase";

export type CalendarPreference = 1 | 2;

export const CALENDAR_PREFERENCE_QUERY_KEY = ["profile", "custom_calendar"] as const;
export const DEFAULT_CALENDAR_PREFERENCE: CalendarPreference = 1;

const normalizeCalendarPreference = (value: unknown): CalendarPreference => {
  if (value === 1 || value === 2) {
    return value;
  }

  return DEFAULT_CALENDAR_PREFERENCE;
};

const fetchCalendarPreference = async (): Promise<CalendarPreference> => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return DEFAULT_CALENDAR_PREFERENCE;
  }

  const { data, error } = await supabase
    .from("Profiles")
    .select("custom_calendar")
    .eq("id", user.id)
    .single();

  if (error) {
    throw error;
  }

  return normalizeCalendarPreference(data?.custom_calendar);
};

const saveCalendarPreference = async (preference: CalendarPreference) => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const { error } = await supabase
    .from("Profiles")
    .update({ custom_calendar: preference })
    .eq("id", user.id);

  if (error) {
    throw error;
  }
};

export const useCalendarPreference = () => {
  const userId = useAuthUserId();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => [...CALENDAR_PREFERENCE_QUERY_KEY, userId] as const, [userId]);

  const preferenceQuery = useQuery({
    queryKey,
    queryFn: fetchCalendarPreference,
    enabled: !!userId,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });

  const preference = preferenceQuery.data ?? DEFAULT_CALENDAR_PREFERENCE;

  const mutation = useMutation({
    mutationFn: saveCalendarPreference,
    onMutate: async (nextPreference) => {
      await queryClient.cancelQueries({ queryKey });

      const previousPreference = queryClient.getQueryData<CalendarPreference>(
        queryKey
      );

      queryClient.setQueryData(queryKey, nextPreference);

      return { previousPreference };
    },
    onError: (_error, _nextPreference, context) => {
      queryClient.setQueryData(
        queryKey,
        context?.previousPreference ?? DEFAULT_CALENDAR_PREFERENCE
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
