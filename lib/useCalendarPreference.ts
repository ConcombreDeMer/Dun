import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";

export type CalendarPreference = 1 | 2;

export const CALENDAR_PREFERENCE_QUERY_KEY = ["profile", "custom_calendar"] as const;

const normalizeCalendarPreference = (value: unknown): CalendarPreference => {
  return value === 2 ? 2 : 1;
};

const fetchCalendarPreference = async (): Promise<CalendarPreference> => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return 1;
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
  const queryClient = useQueryClient();

  const preferenceQuery = useQuery({
    queryKey: CALENDAR_PREFERENCE_QUERY_KEY,
    queryFn: fetchCalendarPreference,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });

  const preference = preferenceQuery.data ?? 1;

  const mutation = useMutation({
    mutationFn: saveCalendarPreference,
    onMutate: async (nextPreference) => {
      await queryClient.cancelQueries({ queryKey: CALENDAR_PREFERENCE_QUERY_KEY });

      const previousPreference = queryClient.getQueryData<CalendarPreference>(
        CALENDAR_PREFERENCE_QUERY_KEY
      );

      queryClient.setQueryData(CALENDAR_PREFERENCE_QUERY_KEY, nextPreference);

      return { previousPreference };
    },
    onError: (_error, _nextPreference, context) => {
      queryClient.setQueryData(
        CALENDAR_PREFERENCE_QUERY_KEY,
        context?.previousPreference ?? 1
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CALENDAR_PREFERENCE_QUERY_KEY });
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
