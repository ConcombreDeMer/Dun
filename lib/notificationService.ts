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

export async function scheduleDailyReminder(hour: number, minute: number) {
  await Notifications.cancelAllScheduledNotificationsAsync();
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
}

// clear badge number on app open
export async function clearBadgeNumber() {
  await Notifications.setBadgeCountAsync(0);
}

export async function cancelDailyReminder() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}