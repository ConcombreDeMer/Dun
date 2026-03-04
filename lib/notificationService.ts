import * as BackgroundFetch from "expo-background-fetch";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import * as TaskManager from "expo-task-manager";

const MORNING_REMINDER_TASK = "MORNING_REMINDER_TASK";

// Configuration initiale
export const initNotifications = async () => {
  // Demander les permissions
  const { status } = await Notifications.requestPermissionsAsync();
  
  if (status !== "granted") {
    console.warn("❌ Permissions de notifications non accordées");
  }

  // Configurer les catégories d'actions pour les notifications
  await Notifications.setNotificationCategoryAsync("MORNING_REMINDER", [
    {
      identifier: "START",
      buttonTitle: "🚀 Démarrer",
      options: {
        opensAppToForeground: true,
      },
    },
    {
      identifier: "SNOOZE",
      buttonTitle: "😴 Repos",
      options: {
        opensAppToForeground: false,
      },
    },
  ]);

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
};

// Rappel de tâche
export const scheduleTaskReminder = async (
  taskTitle: string,
  delay: number = 5 * 60
) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Rappel de tâche",
      body: `N'oublie pas: ${taskTitle}`,
      data: { type: "task_reminder" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(delay, 60),
    },
  });
};

export const triggerNotificationNow = async (title: string, body: string) => {
  console.log("🔔 Notification immédiate:", title, body);
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { type: "immediate_notification" },
      categoryIdentifier: "MORNING_REMINDER",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
    },
  });
};

// Configurer la tâche de fond quotidienne
export const setupMorningReminderTask = async () => {
  try {
    TaskManager.defineTask(MORNING_REMINDER_TASK, async () => {
      const now = new Date();
      const hour = now.getHours();

      if (hour === 8) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Bonne journée! 👋",
            body: "Crée tes tâches pour aujourd'hui",
            data: { type: "morning_reminder" },
            badge: 1,
            sound: true,
            categoryIdentifier: "MORNING_REMINDER",
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 1,
          },
        });
      }

      return BackgroundFetch.BackgroundFetchResult.NewData;
    });

    await BackgroundFetch.registerTaskAsync(MORNING_REMINDER_TASK, {
      minimumInterval: 60 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });

    console.log("✅ Tâche matin programmée");
  } catch (error) {
    console.error("❌ Erreur tâche matin:", error);
  }
};

// Gérer les actions des notifications
export const setupNotificationResponseListener = () => {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const action = response.actionIdentifier;
      const notification = response.notification;

      if (action === "START") {
        console.log("✅ Utilisateur a cliqué sur Démarrer");
        // Ici tu peux naviguer vers la page de création de tâche ou autre
        router.push("/create-task");
      } else if (action === "SNOOZE") {
        console.log("😴 Utilisateur a cliqué sur Repos - snooze de 1h");
        // Programmer une nouvelle notification dans 1 heure
        setTimeout(() => {
          triggerNotificationNow("Rappel 🔔", "C'est l'heure de créer tes tâches!");
        }, 60 * 60 * 1000);
      }
    }
  );

  return subscription;
};

export const cancelAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};