import * as Device from "expo-device";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { STORAGE_KEYS } from "@/constants/config";

/**
 * Request permission and return the Expo push token.
 * Returns null if permission denied or running on a simulator.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn("Push notifications require a real device");
    return null;
  }

  try {
    const notifications = await import("expo-notifications");
    const { setNotificationHandler, getPermissionsAsync, requestPermissionsAsync, setNotificationChannelAsync, getExpoPushTokenAsync } = notifications;
    setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    const { status: existingStatus } = await getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") return null;

    if (Platform.OS === "android") {
      await setNotificationChannelAsync("default", {
        name: "UNIQUE Notifications",
        importance: 5, // AndroidImportance.MAX
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#6C63FF",
      });
    }

    const token = (await getExpoPushTokenAsync()).data;
    return token;
  } catch {
    return null;
  }
}

/**
 * Schedule a daily reminder at the given time (HH:MM).
 * Cancels any existing daily reminder first.
 */
export async function scheduleDailyReminder(timeStr: string, goalCount: number): Promise<void> {
  try {
    const { cancelAllScheduledNotificationsAsync, scheduleNotificationAsync } = await import("expo-notifications");

    await cancelAllScheduledNotificationsAsync();

    const [hours, minutes] = timeStr.split(":").map(Number);

    await scheduleNotificationAsync({
      content: {
        title: "وقت الدراسة 📚",
        body: `هدفك اليوم: ${goalCount} ${goalCount === 1 ? "درس" : "دروس"}. واصل التقدم!`,
        sound: "default",
      },
      trigger: {
        hour: hours,
        minute: minutes,
        repeats: true,
      } as any,
    });
  } catch {
    // Notifications unavailable (e.g. Expo Go)
  }
}

export async function cancelDailyReminder(): Promise<void> {
  try {
    const { cancelAllScheduledNotificationsAsync } = await import("expo-notifications");
    await cancelAllScheduledNotificationsAsync();
  } catch {
    // Notifications unavailable (e.g. Expo Go)
  }
}
