import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_STATS_PREFERENCES,
  StatsPreferenceKey,
  StatsPreferences,
} from "./calculateStats";
import { useProfile, useUpdateProfile } from "./profile";

type ProfileStatsPreferencesRow = {
  stats_include_today: boolean | null;
  stats_include_following: boolean | null;
  stats_include_empty: boolean | null;
  stats_include_rest: boolean | null;
};

const preferenceColumns: Record<StatsPreferenceKey, keyof ProfileStatsPreferencesRow> = {
  includeToday: "stats_include_today",
  includeFutureDays: "stats_include_following",
  includeEmptyDays: "stats_include_empty",
  includeRestDays: "stats_include_rest",
};

const mapProfilePreferences = (row?: ProfileStatsPreferencesRow | null): StatsPreferences => ({
  includeToday: row?.stats_include_today ?? DEFAULT_STATS_PREFERENCES.includeToday,
  includeFutureDays: row?.stats_include_following ?? DEFAULT_STATS_PREFERENCES.includeFutureDays,
  includeEmptyDays: row?.stats_include_empty ?? DEFAULT_STATS_PREFERENCES.includeEmptyDays,
  includeRestDays: row?.stats_include_rest ?? DEFAULT_STATS_PREFERENCES.includeRestDays,
});

export const useStatsPreferences = () => {
  const isMountedRef = useRef(true);
  const profileQuery = useProfile();
  const updateProfileMutation = useUpdateProfile();
  const [optimisticPreferences, setOptimisticPreferences] = useState<StatsPreferences | null>(null);
  const mutationIdsRef = useRef<Record<StatsPreferenceKey, number>>({
    includeToday: 0,
    includeFutureDays: 0,
    includeEmptyDays: 0,
    includeRestDays: 0,
  });
  const [pendingKeys, setPendingKeys] = useState<Set<StatsPreferenceKey>>(() => new Set());

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const profilePreferences = useMemo(
    () => mapProfilePreferences(profileQuery.data),
    [profileQuery.data]
  );
  const preferences = optimisticPreferences ?? profilePreferences;

  useEffect(() => {
    setOptimisticPreferences(null);
  }, [profilePreferences]);

  const setPending = useCallback((key: StatsPreferenceKey, pending: boolean) => {
    if (!isMountedRef.current) return;

    setPendingKeys((current) => {
      const next = new Set(current);

      if (pending) {
        next.add(key);
      } else {
        next.delete(key);
      }

      return next;
    });
  }, []);

  const setPreferenceOptimistically = useCallback(async (key: StatsPreferenceKey, value: boolean) => {
    const currentPreferences = optimisticPreferences ?? profilePreferences;

    if (currentPreferences[key] === value) return;

    const mutationId = mutationIdsRef.current[key] + 1;
    mutationIdsRef.current[key] = mutationId;
    const previousValue = currentPreferences[key];

    setPending(key, true);
    setOptimisticPreferences({ ...currentPreferences, [key]: value });

    try {
      await updateProfileMutation.mutateAsync({
        [preferenceColumns[key]]: value,
      } as Partial<ProfileStatsPreferencesRow>);
    } catch (error) {
      if (mutationIdsRef.current[key] === mutationId) {
        setOptimisticPreferences({ ...currentPreferences, [key]: previousValue });
      }

      console.error("Erreur lors de la mise à jour des préférences stats:", error);
    } finally {
      if (mutationIdsRef.current[key] === mutationId) {
        setPending(key, false);
      }
    }
  }, [optimisticPreferences, profilePreferences, setPending, updateProfileMutation]);

  const isPreferencePending = useCallback((key: StatsPreferenceKey) => pendingKeys.has(key), [pendingKeys]);

  return {
    isPreferencePending,
    isStatsPreferencesLoading: profileQuery.isLoading,
    preferences,
    setPreferenceOptimistically,
  };
};
