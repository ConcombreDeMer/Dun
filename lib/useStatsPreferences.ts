import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_STATS_PREFERENCES,
  StatsPreferenceKey,
  StatsPreferences,
} from "./calculateStats";
import { supabase } from "./supabase";

type ProfileStatsPreferencesRow = {
  stats_include_today: boolean | null;
  stats_include_following: boolean | null;
  stats_include_empty: boolean | null;
  stats_include_rest: boolean | null;
};

const STATS_PREFERENCES_QUERY_KEY = ["profile", "stats-preferences"] as const;

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

const getCurrentUserId = async () => {
  const { data, error } = await supabase.auth.getUser();

  if (error) throw error;
  if (!data.user?.id) throw new Error("Utilisateur non trouvé");

  return data.user.id;
};

const fetchStatsPreferences = async () => {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from("Profiles")
    .select("stats_include_today, stats_include_following, stats_include_empty, stats_include_rest")
    .eq("id", userId)
    .single();

  if (error) throw error;

  return mapProfilePreferences(data);
};

const updateStatsPreference = async (key: StatsPreferenceKey, value: boolean) => {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from("Profiles")
    .update({ [preferenceColumns[key]]: value })
    .eq("id", userId);

  if (error) throw error;
};

export const useStatsPreferences = () => {
  const queryClient = useQueryClient();
  const isMountedRef = useRef(true);
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

  const preferencesQuery = useQuery({
    queryKey: STATS_PREFERENCES_QUERY_KEY,
    queryFn: fetchStatsPreferences,
  });

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
    const currentPreferences =
      queryClient.getQueryData<StatsPreferences>(STATS_PREFERENCES_QUERY_KEY) ??
      preferencesQuery.data ??
      DEFAULT_STATS_PREFERENCES;

    if (currentPreferences[key] === value) return;

    const mutationId = mutationIdsRef.current[key] + 1;
    mutationIdsRef.current[key] = mutationId;
    const previousValue = currentPreferences[key];

    setPending(key, true);
    queryClient.setQueryData<StatsPreferences>(STATS_PREFERENCES_QUERY_KEY, {
      ...currentPreferences,
      [key]: value,
    });

    try {
      await updateStatsPreference(key, value);
      queryClient.invalidateQueries({ queryKey: STATS_PREFERENCES_QUERY_KEY });
    } catch (error) {
      if (mutationIdsRef.current[key] === mutationId) {
        queryClient.setQueryData<StatsPreferences>(STATS_PREFERENCES_QUERY_KEY, (current) => ({
          ...(current ?? DEFAULT_STATS_PREFERENCES),
          [key]: previousValue,
        }));
      }

      console.error("Erreur lors de la mise à jour des préférences stats:", error);
    } finally {
      if (mutationIdsRef.current[key] === mutationId) {
        setPending(key, false);
      }
    }
  }, [preferencesQuery.data, queryClient, setPending]);

  const isPreferencePending = useCallback((key: StatsPreferenceKey) => pendingKeys.has(key), [pendingKeys]);

  return {
    isPreferencePending,
    isStatsPreferencesLoading: preferencesQuery.isLoading,
    preferences: preferencesQuery.data ?? DEFAULT_STATS_PREFERENCES,
    setPreferenceOptimistically,
  };
};
