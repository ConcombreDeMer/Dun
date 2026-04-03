import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from 'expo-notifications';
import { Platform } from "react-native";
// import { useStore } from "../store/store";

// const store = useStore();

const REMINDER_IDS_STORAGE_KEY = "scheduledReminderIds";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions() {
  const settings = await Notifications.getPermissionsAsync();

  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const request = await Notifications.requestPermissionsAsync();
  return request.granted;
}

async function ensureNotificationChannel() {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync("daily-reminders", {
    name: "Rappels quotidiens",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
}

async function getStoredReminderIds() {
  const rawIds = await AsyncStorage.getItem(REMINDER_IDS_STORAGE_KEY);

  if (!rawIds) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(rawIds);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

async function cancelStoredReminderIds() {
  const existingIds = await getStoredReminderIds();

  if (existingIds.length > 0) {
    await Promise.all(existingIds.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));
  }

  await AsyncStorage.removeItem(REMINDER_IDS_STORAGE_KEY);
}

export async function scheduleDailyReminder(
  hour: number, 
  minute: number,
  insistanceActive: boolean = false,
  insistanceDelais: string = '',
  insistanceRepetitions: string = '',
  weekendsActive: boolean = true
) {
  await ensureNotificationChannel();
  await cancelStoredReminderIds();
  const scheduledIds: string[] = [];

  const scheduleNotification = async (triggerHour: number, triggerMinute: number, isMain: boolean) => {
    const content = isMain ? {
      title: 'Hello ! 👋',
      body: 'On check tes tâches du jour ?',
      sound: true,
    } : {
      title: 'Toujours là ? 👀',
      body: 'N\'oublie pas d\'aller vérifier tes tâches du jour !',
      sound: true,
    };

    if (weekendsActive) {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: triggerHour,
          minute: triggerMinute,
          channelId: 'daily-reminders',
        },
      });
      scheduledIds.push(notificationId);
    } else {
      // Si les week-ends sont désactivés, on programme pour chaque jour de la semaine
      // Expo WeeklyTrigger: 1 = Dimanche, 2 = Lundi, ..., 7 = Samedi
      const weekdays = [2, 3, 4, 5, 6];
      for (const weekday of weekdays) {
        const notificationId = await Notifications.scheduleNotificationAsync({
          content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday,
            hour: triggerHour,
            minute: triggerMinute,
            channelId: 'daily-reminders',
          },
        });
        scheduledIds.push(notificationId);
      }
    }
  };

  // Rappel principal
  await scheduleNotification(hour, minute, true);

  // Rappels d'insistance si activé
  if (insistanceActive && insistanceDelais && insistanceRepetitions) {
    const delay = parseInt(insistanceDelais, 10);
    const repetitions = parseInt(insistanceRepetitions, 10);

    if (!isNaN(delay) && !isNaN(repetitions) && delay > 0 && repetitions > 0) {
      for (let i = 1; i <= repetitions; i++) {
        const totalMinutes = minute + (delay * i);
        const newHour = Math.floor(hour + (totalMinutes / 60)) % 24;
        const newMinute = totalMinutes % 60;

        await scheduleNotification(newHour, newMinute, false);
      }
    }
  }

  await AsyncStorage.setItem(REMINDER_IDS_STORAGE_KEY, JSON.stringify(scheduledIds));
}

// clear badge number on app open
export async function clearBadgeNumber() {
  await Notifications.setBadgeCountAsync(0);
}

export async function cancelDailyReminder() {
  await cancelStoredReminderIds();
}
