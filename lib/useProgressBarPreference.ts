import { useProfile, useUpdateProfile } from "./profile";

export type ProgressBarPreference = 1 | 2;

export const PROGRESS_BAR_PREFERENCE_QUERY_KEY = ["profile", "custom_progressbar"] as const;
export const DEFAULT_PROGRESS_BAR_PREFERENCE: ProgressBarPreference = 2;

const normalizeProgressBarPreference = (value: unknown): ProgressBarPreference => {
  if (value === 1 || value === 2) {
    return value;
  }

  return DEFAULT_PROGRESS_BAR_PREFERENCE;
};

export const useProgressBarPreference = () => {
  const profileQuery = useProfile();
  const updateProfileMutation = useUpdateProfile();
  const preference = normalizeProgressBarPreference(profileQuery.data?.custom_progressbar);

  return {
    preference,
    setPreference: (nextPreference: ProgressBarPreference) =>
      updateProfileMutation.mutate({ custom_progressbar: nextPreference }),
    isSaving: updateProfileMutation.isPending,
    isLoading: profileQuery.isLoading,
    isPreferenceLoaded: profileQuery.data !== undefined,
    error: updateProfileMutation.error ?? profileQuery.error,
  };
};
