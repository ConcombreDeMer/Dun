import AsyncStorage from "@react-native-async-storage/async-storage";
import { createInstance } from "i18next";
import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { initReactI18next, useTranslation } from "react-i18next";
import { supabase } from "./supabase";
import { resources } from "./i18n/resources";

const LANGUAGE_STORAGE_KEY = "appLanguage";
const SUPPORTED_LANGUAGES = ["fr", "en"] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const I18nReadyContext = createContext(false);
const i18n = createInstance();

const getDeviceLanguage = (): AppLanguage => {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
  if (locale.startsWith("fr")) {
    return "fr";
  }

  if (locale.startsWith("en")) {
    return "en";
  }

  return "en";
};

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    defaultNS: "translation",
    ns: ["translation"],
    lng: "fr",
    fallbackLng: "fr",
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: "v4",
  });
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const applyLanguage = async (language: AppLanguage) => {
      if (i18n.language !== language) {
        await i18n.changeLanguage(language);
      }

      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    };

    const persistUserLanguage = async (userId: string, language: AppLanguage) => {
      const { error } = await supabase
        .from("Profiles")
        .update({ language })
        .eq("id", userId);

      if (error) {
        throw error;
      }
    };

    const getStoredLanguage = async (): Promise<AppLanguage | null> => {
      const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      return isSupportedLanguage(storedLanguage) ? storedLanguage : null;
    };

    const bootstrapLanguage = async () => {
      const storedLanguage = await getStoredLanguage();
      const fallbackLanguage = storedLanguage ?? getDeviceLanguage();
      await applyLanguage(fallbackLanguage);
    };

    const resolveLanguageFromProfile = async () => {
      try {
        const deviceLanguage = getDeviceLanguage();
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError && sessionError.message !== "Auth session missing!") {
          console.error("Erreur lors de la récupération de la session pour la langue:", sessionError);
        }

        const userId = sessionData.session?.user?.id;

        if (!userId) {
          await applyLanguage(deviceLanguage);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("Profiles")
          .select("language")
          .eq("id", userId)
          .single();

        if (profileError) {
          console.error("Erreur lors de la récupération de la langue du profil:", profileError);
          await applyLanguage(deviceLanguage);
          return;
        }

        if (isSupportedLanguage(profile?.language)) {
          await applyLanguage(profile.language);
          return;
        }

        await applyLanguage(deviceLanguage);
        await persistUserLanguage(userId, deviceLanguage);
      } catch (error) {
        console.error("Erreur lors du chargement de la langue:", error);
      }
    };

    const initializeLanguage = async () => {
      try {
        await bootstrapLanguage();
      } catch (error) {
        console.error("Erreur lors de l'initialisation locale de la langue:", error);
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }

      await resolveLanguageFromProfile();
    };

    initializeLanguage();

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED") {
        return;
      }

      void resolveLanguageFromProfile();
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return <I18nReadyContext.Provider value={isReady}>{children}</I18nReadyContext.Provider>;
}

export function useI18nReady() {
  return useContext(I18nReadyContext);
}

export function useAppTranslation() {
  const translation = useTranslation();

  return {
    ...translation,
    language: normalizeLanguage(translation.i18n.resolvedLanguage),
    setLanguage: async (language: AppLanguage) => {
      await translation.i18n.changeLanguage(language);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError && sessionError.message !== "Auth session missing!") {
        console.error("Erreur session lors de la sauvegarde de la langue:", sessionError);
        return;
      }

      const userId = sessionData.session?.user?.id;

      if (!userId) {
        return;
      }

      const { error } = await supabase
        .from("Profiles")
        .update({ language })
        .eq("id", userId);

      if (error) {
        console.error("Erreur lors de la sauvegarde de la langue en base:", error);
      }
    },
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
}

function normalizeLanguage(language?: string): AppLanguage {
  return isSupportedLanguage(language) ? language : "fr";
}

function isSupportedLanguage(language: string | null | undefined): language is AppLanguage {
  return SUPPORTED_LANGUAGES.includes(language as AppLanguage);
}
