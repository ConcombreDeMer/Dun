import { Platform } from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";

let hasConfiguredRevenueCat = false;
let configuredApiKey: string | null = null;
let currentRevenueCatUserId: string | null = null;

function getRevenueCatApiKey() {
  return process.env.EXPO_PUBLIC_REVENUECAT_KEY?.trim() || null;
}

export function initializeRevenueCat(appUserID?: string | null) {
  if (Platform.OS !== "ios") {
    return false;
  }

  const apiKey = getRevenueCatApiKey();

  if (!apiKey) {
    console.warn("Cle API RevenueCat manquante dans les variables d'environnement (.env)");
    return false;
  }

  const normalizedAppUserID = appUserID?.trim() || null;

  if (
    hasConfiguredRevenueCat
    && configuredApiKey === apiKey
    && currentRevenueCatUserId === normalizedAppUserID
  ) {
    return true;
  }

  Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  Purchases.configure(
    normalizedAppUserID
      ? { apiKey, appUserID: normalizedAppUserID }
      : { apiKey }
  );

  hasConfiguredRevenueCat = true;
  configuredApiKey = apiKey;
  currentRevenueCatUserId = normalizedAppUserID;

  return true;
}

export async function syncRevenueCatUser(userId: string | null) {
  if (!userId) {
    if (currentRevenueCatUserId === null) {
      return;
    }

    await Purchases.logOut();
    currentRevenueCatUserId = null;
    return;
  }

  const isReady = initializeRevenueCat(userId);

  if (!isReady) {
    return;
  }

  currentRevenueCatUserId = userId;
}
