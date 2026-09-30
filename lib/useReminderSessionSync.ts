import { useEffect } from "react";
import { useAuthUserId } from "./AuthSessionContext";
import { syncDailyReminderForProfile } from "./notificationService";
import { useProfile } from "./profile";
import { useSubscription } from "./subscription";

export function useReminderSessionSync() {
  const userId = useAuthUserId();
  const profile = useProfile().data;
  const { isPremium, isLoading } = useSubscription();

  useEffect(() => {
    if (!userId || !profile || isLoading) return;
    void syncDailyReminderForProfile(userId, {
      ...profile,
      alertInsistanceActive: isPremium && Boolean(profile.alertInsistanceActive),
    }).catch((error) => {
      console.error("Échec de la réconciliation des rappels:", error);
    });
  }, [userId, profile, isPremium, isLoading]);
}
