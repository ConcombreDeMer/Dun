import { Platform } from "react-native";
import { requireNativeModule } from "expo";

type DunFoundationAINativeModule = {
  isAvailable(): Promise<boolean>;
  prewarm(): Promise<void>;
  analyzeDay(jsonPayload: string): Promise<string>;
  analyzeStats(jsonPayload: string): Promise<string>;
};

let nativeModule: DunFoundationAINativeModule | null | undefined;

const getNativeModule = () => {
  if (Platform.OS !== "ios") {
    return null;
  }

  if (nativeModule === undefined) {
    nativeModule = requireNativeModule<DunFoundationAINativeModule>("DunFoundationAI");
  }

  return nativeModule;
};

export const isFoundationAIAvailable = async () => {
  const module = getNativeModule();
  return module ? module.isAvailable() : false;
};

export const prewarmFoundationAI = async () => {
  const module = getNativeModule();
  if (!module) return;

  await module.prewarm();
};

export const analyzeDayWithFoundationAI = async (jsonPayload: string) => {
  const module = getNativeModule();

  if (!module) {
    throw new Error("Apple Foundation Models est uniquement disponible sur iOS compatible.");
  }

  return module.analyzeDay(jsonPayload);
};

export const analyzeStatsWithFoundationAI = async (jsonPayload: string) => {
  const module = getNativeModule();

  if (!module) {
    throw new Error("Apple Foundation Models est uniquement disponible sur iOS compatible.");
  }

  return module.analyzeStats(jsonPayload);
};
