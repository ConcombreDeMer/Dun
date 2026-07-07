import { useProfile, useUpdateProfile } from "./profile";

export type CalendarPreference = 1 | 2;

export const CALENDAR_PREFERENCE_QUERY_KEY = ["profile", "custom_calendar"] as const;
export const DEFAULT_CALENDAR_PREFERENCE: CalendarPreference = 1;

const normalizeCalendarPreference = (value: unknown): CalendarPreference => {
  if (value === 1 || value === 2) {
    return value;
  }

  return DEFAULT_CALENDAR_PREFERENCE;
};

export const useCalendarPreference = () => {
  const profileQuery = useProfile();
  const updateProfileMutation = useUpdateProfile();
  const preference = normalizeCalendarPreference(profileQuery.data?.custom_calendar);

  return {
    preference,
    setPreference: (nextPreference: CalendarPreference) =>
      updateProfileMutation.mutate({ custom_calendar: nextPreference }),
    isSaving: updateProfileMutation.isPending,
    isLoading: profileQuery.isLoading,
    isPreferenceLoaded: profileQuery.data !== undefined,
    error: updateProfileMutation.error ?? profileQuery.error,
  };
};
