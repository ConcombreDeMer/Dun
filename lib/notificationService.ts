import * as Notifications from 'expo-notifications';
// import { useStore } from "../store/store";

// const store = useStore();

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

// export async function setupAndroidChannel() {
//   if (Platform.OS === 'android') {
//     await Notifications.setNotificationChannelAsync('daily-reminders', {
//       name: 'Rappels quotidiens',
//       importance: Notifications.AndroidImportance.HIGH,
//       vibrationPattern: [0, 250, 250, 250],
//     });
//   }
// }

export async function scheduleDailyReminder(
  hour: number, 
  minute: number,
  insistanceActive: boolean = false,
  insistanceDelais: string = '',
  insistanceRepetitions: string = ''
) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  
  // Rappel principal
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Hello ! 👋',
      body: 'On check tes tâches du jour ?',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: 'daily-reminders',
    },
  });

  // Rappels d'insistance si activé
  if (insistanceActive && insistanceDelais && insistanceRepetitions) {
    const delay = parseInt(insistanceDelais, 10);
    const repetitions = parseInt(insistanceRepetitions, 10);

    if (!isNaN(delay) && !isNaN(repetitions) && delay > 0 && repetitions > 0) {
      for (let i = 1; i <= repetitions; i++) {
        const totalMinutes = minute + (delay * i);
        const newHour = Math.floor(hour + (totalMinutes / 60)) % 24;
        const newMinute = totalMinutes % 60;

        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Toujours là ? 👀',
            body: 'N\'oublie pas d\'aller vérifier tes tâches du jour !',
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: newHour,
            minute: newMinute,
            channelId: 'daily-reminders',
          },
        });
      }
    }
  }
}

// clear badge number on app open
export async function clearBadgeNumber() {
  await Notifications.setBadgeCountAsync(0);
}

export async function cancelDailyReminder() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}