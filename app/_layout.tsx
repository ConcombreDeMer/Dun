import { Session } from "@supabase/supabase-js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useMemo, useState } from "react";
import { Platform, View } from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";
import Navbar from "../components/navbar";
import { FontProvider } from "../lib/FontContext";
import { supabase } from "../lib/supabase";
import { ThemeProvider, useTheme } from "../lib/ThemeContext";
import { useDailyScreen } from "../lib/useDailyScreen";

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
  const { colors, isLoading } = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const redirectRef = React.useRef(false);

  const [fontsLoaded] = useFonts({
    "Satoshi-Regular": require("../assets/fonts/Satoshi-Regular.otf"),
    "Satoshi-Medium": require("../assets/fonts/Satoshi-Medium.otf"),
    "Satoshi-Bold": require("../assets/fonts/Satoshi-Bold.otf"),
    "Satoshi-Black": require("../assets/fonts/Satoshi-Black.otf"),
    "Satoshi-Variable": require("../assets/fonts/Satoshi-Variable.ttf"),
  });

  const queryClient = useMemo(() => getQueryClient(), []);

  // Détection du premier lancement quotidien (seulement si l'utilisateur est bien connecté)
  useDailyScreen(isAuthLoading, !!session);

  // Initialiser RevenueCat
  useEffect(() => {
    if (Platform.OS === 'ios') {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      // Remplacez process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY par votre clé si vous utilisez les variables d'environnement
      if (process.env.EXPO_PUBLIC_REVENUECAT_KEY) {
        Purchases.configure({ apiKey: process.env.EXPO_PUBLIC_REVENUECAT_KEY });
      } else {
        console.warn("Clé API RevenueCat manquante dans les variables d'environnement (.env)");
      }
    }
  }, []);

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

      if (session?.user?.id) {
        try {
          await Purchases.logIn(session.user.id);
        } catch (e) {
          console.error("Erreur RevenueCat initAuth logIn:", e);
        }
      }
    };

    // Initialiser et s'abonner aux changements
    initAuth();

    const { data } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession ?? null);
      setIsAuthLoading(false);

      if (newSession?.user?.id) {
        try {
          await Purchases.logIn(newSession.user.id);
        } catch (e) {
          console.error("Erreur RevenueCat logIn:", e);
        }
      } else if (event === 'SIGNED_OUT') {
        try {
          await Purchases.logOut();
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
    if (fontsLoaded && !isLoading && !isAuthLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isLoading, isAuthLoading]);

  // Redirection basée sur l'authentification
  useEffect(() => {
    if (isAuthLoading) return;

    if (!session) {
      if (!redirectRef.current) {
        redirectRef.current = true;
        router.replace("/onboarding/start");
      }
      return;
    }

    const checkUserAndRedirect = async () => {
      if (redirectRef.current) return;

      try {
        const { data: profileData, error } = await supabase
          .from("Profiles")
          .select("hasName")
          .eq("id", session.user.id)
          .single();

        if (error) {
          console.error("Erreur profil:", error);
          if (!redirectRef.current) {
            redirectRef.current = true;
            router.replace("/onboarding/tutorial");
          }
          return;
        }

        const hasName = profileData?.hasName ?? false;
        const isOnboarding = segments[0] === "onboarding";

        if (!hasName && !isOnboarding && !redirectRef.current) {
          redirectRef.current = true;
          router.replace("/onboarding/tutorial");
        } else if (hasName && isOnboarding && !redirectRef.current) {
          redirectRef.current = true;
          router.replace("/home");
        }
      } catch (error) {
        console.error("Erreur redirection:", error);
      }
    };

    checkUserAndRedirect();
  }, [session, isAuthLoading]);

  if (!fontsLoaded || isLoading || isAuthLoading) {
    return null;
  }

  // Vérifier si on est sur l'onboarding pour masquer la navbar
  const isOnboarding = segments[0] === "onboarding";
  const isSettingsSubroute = segments.length > 1 && segments[0] === "settings";
  const isDailyOrRest = segments[0] === "daily" || segments[0] === "rest";

  const duration = 200;
  

  return (

    <QueryClientProvider client={queryClient}>

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
      <View style={{ flex: 1 }}>
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
            name="onboarding"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="home"
            options={{
              title: "Accueil",
              animation: "fade",
              animationDuration: duration,
            }}
          />
          <Stack.Screen
            name="settings"
            options={{
              title: "Paramètres",
              animation: "fade",
              animationDuration: duration,
            }}
          />
          <Stack.Screen
            name="create-task"
            options={{
              title: "Créer une tâche",
              presentation: "modal",
              animation: "slide_from_bottom",
              animationDuration: duration,
            }}
          />
          <Stack.Screen
            name="stats"
            options={{
              title: "Statistiques",
              animation: "fade",
              animationDuration: duration,
            }}
          />
          <Stack.Screen
            name="daily"
            options={{
              title: "Nouveau Jour",
              presentation: "fullScreenModal",
              headerShown: false,
              animation: "fade",
            }}
          />
          <Stack.Screen
            name="rest"
            options={{
              title: "Repos",
              presentation: "fullScreenModal",
              headerShown: false,
              animation: "slide_from_bottom",
            }}
          />
        </Stack>
        {!isOnboarding && !isSettingsSubroute && !isDailyOrRest && <Navbar />}
      </View>
    </QueryClientProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <FontProvider>
        <RootLayoutContent />
      </FontProvider>
    </ThemeProvider>
  );
}