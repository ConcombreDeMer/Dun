import { Session } from "@supabase/supabase-js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider, usePathname, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useMemo, useState } from "react";
import { Appearance } from "react-native";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { FontProvider } from "../lib/FontContext";
import { I18nProvider, useAppTranslation, useI18nReady } from "../lib/i18n";
import { syncRevenueCatUser } from "../lib/revenuecat";
import { SubscriptionProvider } from "../lib/subscription";
import { supabase } from "../lib/supabase";
import { ThemeProvider, useTheme } from "../lib/ThemeContext";
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://22e24a375245f570d6a9c3e6ebfb71af@o4511662072594432.ingest.de.sentry.io/4511662116896848',

  environment: __DEV__ ? 'development' : 'production',
  sendDefaultPii: false,
  enableLogs: __DEV__,

  replaysSessionSampleRate: __DEV__ ? 0.1 : 0.02,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration()],

  beforeSend(event) {
    if (event.user) {
      event.user = event.user.id ? { id: event.user.id } : undefined;
    }

    return event;
  },
});

SplashScreen.preventAutoHideAsync();

// Créer le QueryClient une seule fois - PAS à chaque render!
let queryClientInstance: QueryClient | null = null;

const getQueryClient = () => {
  if (!queryClientInstance) {
    queryClientInstance = new QueryClient({
      defaultOptions: {
        queries: {
          gcTime: 1000 * 60 * 5,
          staleTime: 1000 * 60 * 2,
        },
      },
    });
  }
  return queryClientInstance;
};

function RootLayoutContent() {
  const { colors, actualTheme, isLoading } = useTheme();
  const { t } = useAppTranslation();
  const isI18nReady = useI18nReady();
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [fontsLoaded] = useFonts({
    "Satoshi-Regular": require("../assets/fonts/Satoshi-Regular.otf"),
    "Satoshi-Medium": require("../assets/fonts/Satoshi-Medium.otf"),
    "Satoshi-Bold": require("../assets/fonts/Satoshi-Bold.otf"),
    "Satoshi-Black": require("../assets/fonts/Satoshi-Black.otf"),
    "Satoshi-Variable": require("../assets/fonts/Satoshi-Variable.ttf"),
  });

  const queryClient = useMemo(() => getQueryClient(), []);
  const navigationTheme = actualTheme === "dark" ? DarkTheme : DefaultTheme;

  useEffect(() => {
    Sentry.setUser(session?.user?.id ? { id: session.user.id } : null);
  }, [session?.user?.id]);

  useEffect(() => {
    Sentry.setTag("route", pathname ?? "unknown");
    Sentry.setTag("theme", actualTheme);
  }, [actualTheme, pathname]);

  useEffect(() => {
    Appearance.setColorScheme(actualTheme);
  }, [actualTheme]);

  // Détection du premier lancement quotidien (seulement si l'utilisateur est bien connecté)

  // Initialiser l'authentification et écouter les changements
  useEffect(() => {
    let authListener: any = null;

    const initAuth = async () => {
      // Essayer de récupérer la session existante
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError && sessionError.message !== "Auth session missing!") {
        console.error("Erreur session:", sessionError);
      }

      const session = sessionData?.session ?? null;
      setSession(session);
      setIsAuthLoading(false);
    };

    // Initialiser et s'abonner aux changements
    initAuth();

    const { data } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession ?? null);
      setIsAuthLoading(false);

      if (event === 'SIGNED_OUT') {
        try {
          await syncRevenueCatUser(null);
        } catch (e) {
          console.error("Erreur RevenueCat logOut:", e);
        }
      }
    });

    authListener = data?.subscription;

    return () => {
      authListener?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (fontsLoaded && !isLoading && !isAuthLoading && isI18nReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isLoading, isAuthLoading, isI18nReady]);

  // Redirection basée sur l'authentification
  useEffect(() => {
    if (isAuthLoading) return;

    const isOnboardingRoute = pathname?.startsWith("/onboarding") ?? false;
    const isAuthCallbackRoute = pathname?.startsWith("/auth") ?? false;

    if (!session) {
      if (!isOnboardingRoute && !isAuthCallbackRoute) {
        router.replace("/onboarding/start");
      }  
      return;
    }

    const checkUserAndRedirect = async () => {
      try {
        const { data: profileData, error } = await supabase
          .from("Profiles")
          .select("hasName")
          .eq("id", session.user.id)
          .single();

        if (error) {
          console.error("Erreur profil:", error);
          if (!isOnboardingRoute) {
            router.replace("/onboarding/tutorial");
          }  
          return;
        }

        const hasName = profileData?.hasName ?? false;

        if (!hasName && !isOnboardingRoute) {
          router.replace("/onboarding/tutorial");
        } else if (hasName && isOnboardingRoute) {
          router.replace("/home");
        }
      } catch (error) {
        console.error("Erreur redirection:", error);
      }
    };

    checkUserAndRedirect();
  }, [isAuthLoading, pathname, router, session]);

  if (!fontsLoaded || isLoading || isAuthLoading || !isI18nReady) {
    return null;
  }

  return (

    <QueryClientProvider client={queryClient}>
      <SubscriptionProvider appUserID={session?.user?.id ?? null}>

      {/* <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "transparent",
          boxShadow: `inset 0px 40px 50px -40px ${colors.background}, inset 0px -120px 50px -40px ${colors.background}`,
          zIndex: 100,
        }}
      >

      </View> */}
        <NavigationThemeProvider value={navigationTheme}>
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: colors.background,
              },
              headerTintColor: colors.text,
              headerTitleStyle: {
                fontWeight: "bold",
                fontSize: 18,
                color: colors.text,
              },
              headerShown: false,
            }}
          >
            <Stack.Screen
              name="index"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="(tabs)"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="onboarding"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="auth/callback"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="settings"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="stats"
              options={{
                headerShown: false,
                presentation: "modal",
                animation: "slide_from_bottom",
                animationDuration: 200,
              }}
            />
            <Stack.Screen
              name="daily"
              options={{
                title: t("navigation.daily"),
                presentation: "fullScreenModal",
                headerShown: false,
                animation: "fade",
              }}
            />
            <Stack.Screen
              name="rest"
              options={{
                title: t("navigation.rest"),
                presentation: "fullScreenModal",
                headerShown: false,
                animation: "slide_from_bottom",
              }}
            />
          </Stack>
        </NavigationThemeProvider>
      </SubscriptionProvider>
    </QueryClientProvider>
  );
}
export default Sentry.wrap(function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <I18nProvider>
          <FontProvider>
            <RootLayoutContent />
          </FontProvider>
        </I18nProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
});
