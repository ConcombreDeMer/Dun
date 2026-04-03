import { Platform } from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";

let hasConfiguredRevenueCat = false;
let configuredApiKey: string | null = null;
let currentRevenueCatUserId: string | null = null;

function getRevenueCatApiKey() {
  return process.env.EXPO_PUBLIC_REVENUECAT_KEY?.trim() || null;
}

export function initializeRevenueCat() {
  if (Platform.OS !== "ios") {
    return false;
  }

  const apiKey = getRevenueCatApiKey();

  if (!apiKey) {
    console.warn("Cle API RevenueCat manquante dans les variables d'environnement (.env)");
    return false;
  }

  if (hasConfiguredRevenueCat && configuredApiKey === apiKey) {
    return true;
  }

  Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  Purchases.configure({ apiKey });

  hasConfiguredRevenueCat = true;
  configuredApiKey = apiKey;

  return true;
}

export async function syncRevenueCatUser(userId: string | null) {
  const isReady = initializeRevenueCat();

  if (!isReady) {
    return;
  }

  if (userId) {
    if (currentRevenueCatUserId === userId) {
      return;
    }

    await Purchases.logIn(userId);
    currentRevenueCatUserId = userId;
    return;
  }

  if (currentRevenueCatUserId === null) {
    return;
  }

  await Purchases.logOut();
  currentRevenueCatUserId = null;
}
