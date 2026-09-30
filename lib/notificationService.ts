import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { i18n } from "./i18n";
import { NOTIFICATION_REMINDER_LIMITS, clampInteger, parseIntegerInput } from "./notificationLimits";

// Liste globale des anciennes versions, nettoyée à la première réconciliation.
const LEGACY_REMINDER_IDS_KEY = "scheduledReminderIds";
const REMINDER_SYNC_PENDING_PREFIX = "reminderSyncPending:";
const REMINDER_MARKER = "dunDailyReminder";
let activeReminderUserId: string | null | undefined;
let reminderOperation: Promise<void> = Promise.resolve();

export type ReminderPreferences = {
  alertSetupActive: boolean | null;
  alertSetupHour: string | number | null;
  alertSetupMinute: string | number | null;
  alertInsistanceActive: boolean | null;
  alertInsistanceDelais: string | number | null;
  alertInsistanceRepetitions: string | number | null;
  alertWeekendsActive: boolean | null;
};

type ReminderVariant = { title: string; body: string };
type ManagedReminder = Notifications.NotificationRequest;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function serializeReminderOperation(operation: () => Promise<void>) {
  const next = reminderOperation.catch(() => undefined).then(operation);
  reminderOperation = next.catch(() => undefined);
  return next;
}

export function setReminderSessionUser(userId: string | null) {
  // Synchrone : une programmation en vol revérifie le propriétaire à son retour.
  activeReminderUserId = userId;
}

function assertReminderSession(userId: string | null) {
  if (activeReminderUserId !== userId) {
    throw new Error("Le compte a changé pendant la programmation des rappels");
  }
}

const isManagedReminder = (request: ManagedReminder) =>
  request.content.data?.[REMINDER_MARKER] === true;

const reminderOwner = (request: ManagedReminder) => request.content.data?.userId;

async function getLegacyReminderIds(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(LEGACY_REMINDER_IDS_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

async function cancelReminderIds(ids: string[], owner: string | null) {
  for (const id of new Set(ids)) {
    assertReminderSession(owner);
    await Notifications.cancelScheduledNotificationAsync(id);
  }
}

async function listManagedReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.filter(isManagedReminder);
}

export function reconcileReminderOwner(userId: string | null) {
  return serializeReminderOperation(async () => {
    assertReminderSession(userId);
    const managed = await listManagedReminders();
    const legacyIds = await getLegacyReminderIds();
    const foreignIds = managed
      .filter((request) => userId === null || reminderOwner(request) !== userId)
      .map((request) => request.identifier);
    await cancelReminderIds([...foreignIds, ...legacyIds], userId);
    if (legacyIds.length > 0) await AsyncStorage.removeItem(LEGACY_REMINDER_IDS_KEY);
  });
}

function hasNotificationPermission(settings: Notifications.NotificationPermissionsStatus) {
  return settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function requestNotificationPermissions() {
  const settings = await Notifications.getPermissionsAsync();
  if (hasNotificationPermission(settings)) return true;
  const request = await Notifications.requestPermissionsAsync();
  return hasNotificationPermission(request);
}

async function ensureNotificationChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("daily-reminders", {
    name: "Rappels quotidiens",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
}

function getRandomReminderVariant(key: "main" | "insistence"): ReminderVariant {
  const variants = i18n.t(`settings.notifications.reminders.${key}`, {
    returnObjects: true,
  }) as ReminderVariant[];
  const validVariants = Array.isArray(variants)
    ? variants.filter((variant) => typeof variant.title === "string" && typeof variant.body === "string")
    : [];
  return validVariants.length > 0
    ? validVariants[Math.floor(Math.random() * validVariants.length)]
    : { title: "", body: "" };
}

type NormalizedReminder = {
  active: boolean;
  hour: number;
  minute: number;
  delay: number;
  repetitions: number;
  weekends: boolean;
  signature: string;
  expectedCount: number;
};

function normalizeReminder(preferences: ReminderPreferences): NormalizedReminder {
  const active = Boolean(preferences.alertSetupActive);
  const hour = parseIntegerInput(preferences.alertSetupHour);
  const minute = parseIntegerInput(preferences.alertSetupMinute);
  if (active && (hour === null || minute === null || hour < 0 || hour > 23 || minute < 0 || minute > 59)) {
    throw new Error("Heure du rappel invalide");
  }
  const parsedDelay = parseIntegerInput(preferences.alertInsistanceDelais);
  const parsedRepetitions = parseIntegerInput(preferences.alertInsistanceRepetitions);
  const repeated = Boolean(preferences.alertInsistanceActive);
  if (active && repeated && (parsedDelay === null || parsedRepetitions === null)) {
    throw new Error("Répétition du rappel invalide");
  }
  const delay = repeated && parsedDelay !== null
    ? clampInteger(parsedDelay, NOTIFICATION_REMINDER_LIMITS.delayMinutes.min, NOTIFICATION_REMINDER_LIMITS.delayMinutes.max)
    : 0;
  const repetitions = repeated && parsedRepetitions !== null
    ? clampInteger(parsedRepetitions, NOTIFICATION_REMINDER_LIMITS.repetitions.min, NOTIFICATION_REMINDER_LIMITS.repetitions.max)
    : 0;
  const weekends = preferences.alertWeekendsActive ?? true;
  const signature = JSON.stringify([hour, minute, delay, repetitions, weekends]);
  return {
    active, hour: hour ?? 0, minute: minute ?? 0, delay, repetitions, weekends, signature,
    expectedCount: (weekends ? 1 : 5) * (1 + repetitions),
  };
}

async function scheduleOneReminder(
  userId: string, normalized: NormalizedReminder, hour: number, minute: number,
  isMain: boolean, weekday?: number,
) {
  assertReminderSession(userId);
  const variant = getRandomReminderVariant(isMain ? "main" : "insistence");
  const content = {
    title: variant.title,
    body: variant.body,
    sound: true,
    data: { [REMINDER_MARKER]: true, userId, signature: normalized.signature },
  };
  const trigger = weekday === undefined
    ? { type: Notifications.SchedulableTriggerInputTypes.DAILY as const, hour, minute, channelId: "daily-reminders" }
    : { type: Notifications.SchedulableTriggerInputTypes.WEEKLY as const, weekday, hour, minute, channelId: "daily-reminders" };
  return Notifications.scheduleNotificationAsync({ content, trigger });
}

async function syncDailyReminderNow(userId: string, preferences: ReminderPreferences) {
  assertReminderSession(userId);
  const normalized = normalizeReminder(preferences);
  const managed = await listManagedReminders();
  const legacyIds = await getLegacyReminderIds();
  const pending = await hasPendingDailyReminder(userId);
  const own = managed.filter((request) => reminderOwner(request) === userId);
  const foreignIds = managed.filter((request) => reminderOwner(request) !== userId).map((request) => request.identifier);
  const alreadyCurrent = normalized.active && !pending && legacyIds.length === 0 && foreignIds.length === 0
    && own.length === normalized.expectedCount
    && own.every((request) => request.content.data?.signature === normalized.signature);
  if (alreadyCurrent) return;

  await markReminderSyncPending(userId);
  await cancelReminderIds(foreignIds, userId);
  if (!normalized.active) {
    await cancelReminderIds([...own.map((request) => request.identifier), ...legacyIds], userId);
    if (legacyIds.length > 0) await AsyncStorage.removeItem(LEGACY_REMINDER_IDS_KEY);
    await clearReminderSyncPending(userId);
    return;
  }

  const permission = await Notifications.getPermissionsAsync();
  if (!hasNotificationPermission(permission)) throw new Error("Notifications non autorisées");
  await ensureNotificationChannel();
  const newIds: string[] = [];
  let newSetComplete = false;
  try {
    for (let i = 0; i <= normalized.repetitions; i++) {
      const totalMinutes = normalized.minute + normalized.delay * i;
      const hour = (normalized.hour + Math.floor(totalMinutes / 60)) % 24;
      const minute = totalMinutes % 60;
      const weekdays = normalized.weekends ? [undefined] : [2, 3, 4, 5, 6];
      for (const weekday of weekdays) {
        const id = await scheduleOneReminder(userId, normalized, hour, minute, i === 0, weekday);
        newIds.push(id);
        assertReminderSession(userId);
      }
    }
    newSetComplete = true;
    await cancelReminderIds([...own.map((request) => request.identifier), ...legacyIds], userId);
    if (legacyIds.length > 0) await AsyncStorage.removeItem(LEGACY_REMINDER_IDS_KEY);
    await clearReminderSyncPending(userId);
  } catch (error) {
    if (!newSetComplete) {
      await Promise.allSettled(newIds.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
    }
    // Un ID échappé reste retrouvable par sa métadonnée native au prochain lancement.
    throw error;
  }
}

export function syncDailyReminderForProfile(userId: string, preferences: ReminderPreferences) {
  return serializeReminderOperation(() => syncDailyReminderNow(userId, preferences));
}

export function scheduleDailyReminder(
  userId: string, hour: number, minute: number, insistanceActive = false,
  insistanceDelais = "", insistanceRepetitions = "", weekendsActive = true,
) {
  return syncDailyReminderForProfile(userId, {
    alertSetupActive: true, alertSetupHour: hour, alertSetupMinute: minute,
    alertInsistanceActive: insistanceActive, alertInsistanceDelais: insistanceDelais,
    alertInsistanceRepetitions: insistanceRepetitions, alertWeekendsActive: weekendsActive,
  });
}

export function cancelDailyReminder(userId: string) {
  return syncDailyReminderForProfile(userId, {
    alertSetupActive: false, alertSetupHour: null, alertSetupMinute: null,
    alertInsistanceActive: false, alertInsistanceDelais: null,
    alertInsistanceRepetitions: null, alertWeekendsActive: null,
  });
}

export async function hasPendingDailyReminder(userId: string) {
  return Boolean(await AsyncStorage.getItem(`${REMINDER_SYNC_PENDING_PREFIX}${userId}`));
}

export async function markReminderSyncPending(userId: string) {
  await AsyncStorage.setItem(`${REMINDER_SYNC_PENDING_PREFIX}${userId}`, "1");
}

export async function clearReminderSyncPending(userId: string) {
  await AsyncStorage.removeItem(`${REMINDER_SYNC_PENDING_PREFIX}${userId}`);
}

export async function clearBadgeNumber() {
  await Notifications.setBadgeCountAsync(0);
}
