import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useAuthUserId } from "./AuthSessionContext";
import { parseIntegerInput } from "./notificationLimits";
import { cancelDailyReminder, scheduleDailyReminder } from "./notificationService";
import { patchProfileCache, profileQueryKey, useProfile } from "./profile";
import { useSubscription } from "./subscription";
import { supabase } from "./supabase";
import { useTheme } from "./ThemeContext";

const isNeutralColorTheme = (value: string | null | undefined) => {
  return !value || value === "neutral" || value === "neutre";
};

export const usePremiumDowngradeCompliance = () => {
  const userId = useAuthUserId();
  const queryClient = useQueryClient();
  const profileQuery = useProfile();
  const { colorTheme, setColorTheme } = useTheme();
  const { isLoading: isSubscriptionLoading, isPremium } = useSubscription();
  const handledSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    const profile = profileQuery.data;

    if (isSubscriptionLoading || isPremium || !userId || !profile) {
      return;
    }

    const needsColorReset = colorTheme !== "neutral" || !isNeutralColorTheme(profile.display_color);
    const needsNotificationReset = Boolean(profile.alertInsistanceActive || profile.alertWeekendsActive);
    const notificationSignature = [
      profile.alertSetupActive,
      profile.alertSetupHour,
      profile.alertSetupMinute,
      profile.alertInsistanceActive,
      profile.alertInsistanceDelais,
      profile.alertInsistanceRepetitions,
      profile.alertWeekendsActive,
    ].join(":");
    const signature = [
      userId,
      colorTheme,
      profile.display_color,
      notificationSignature,
    ].join("|");

    if (!needsColorReset && !needsNotificationReset) {
      return;
    }

    if (handledSignatureRef.current === signature) {
      return;
    }

    handledSignatureRef.current = signature;

    void (async () => {
      const patch: Record<string, unknown> = {};

      if (needsNotificationReset) {
        patch.alertInsistanceActive = false;
        patch.alertWeekendsActive = false;
      }

      try {
        if (needsColorReset) {
          await setColorTheme("neutral");
          patchProfileCache(queryClient, userId, { display_color: "neutre" });
        }

        if (Object.keys(patch).length > 0) {
          const { error } = await supabase
            .from("Profiles")
            .update(patch)
            .eq("id", userId);

          if (error) {
            throw error;
          }

          patchProfileCache(queryClient, userId, {
            alertInsistanceActive: false,
            alertWeekendsActive: false,
          });
        }

        if (needsNotificationReset) {
          if (profile.alertSetupActive) {
            const hour = parseIntegerInput(profile.alertSetupHour);
            const minute = parseIntegerInput(profile.alertSetupMinute);

            if (
              hour !== null &&
              minute !== null &&
              hour >= 0 &&
              hour <= 23 &&
              minute >= 0 &&
              minute <= 59
            ) {
              await scheduleDailyReminder(hour, minute, false, "", "", false);
            }
          } else {
            await cancelDailyReminder();
          }
        }

        queryClient.invalidateQueries({ queryKey: profileQueryKey(userId) });
      } catch (error) {
        handledSignatureRef.current = null;
        console.error("Erreur lors de la remise en conformité premium:", error);
      }
    })();
  }, [
    colorTheme,
    isPremium,
    isSubscriptionLoading,
    profileQuery.data,
    queryClient,
    setColorTheme,
    userId,
  ]);
};
