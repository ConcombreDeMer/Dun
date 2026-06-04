import { Alert } from "react-native";

export const LATE_ADJUSTMENT_CONFIRMATION_CANCELLED = "LATE_ADJUSTMENT_CONFIRMATION_CANCELLED";

export type LateAdjustmentCandidate = {
  late_adjusted_at?: string | null;
  resolved_at?: string | null;
};

export const needsLateAdjustmentConfirmation = (task?: LateAdjustmentCandidate | null) => {
  return Boolean(task?.resolved_at && !task.late_adjusted_at);
};

export const createLateAdjustmentCancelledError = () => {
  return new Error(LATE_ADJUSTMENT_CONFIRMATION_CANCELLED);
};

export const isLateAdjustmentConfirmationCancelled = (error: unknown) => {
  return error instanceof Error && error.message === LATE_ADJUSTMENT_CONFIRMATION_CANCELLED;
};

export const confirmLateAdjustment = (t: (key: string) => string) => {
  return new Promise<boolean>((resolve) => {
    Alert.alert(
      t("task.lateAdjustmentAlert.title"),
      t("task.lateAdjustmentAlert.message"),
      [
        {
          text: t("common.actions.cancel"),
          onPress: () => resolve(false),
          style: "cancel",
        },
        {
          text: t("task.lateAdjustmentAlert.continue"),
          onPress: () => resolve(true),
        },
      ]
    );
  });
};
