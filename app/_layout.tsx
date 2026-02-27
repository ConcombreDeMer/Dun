import { Session } from "@supabase/supabase-js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import Navbar from "../components/navbar";
import { FontProvider } from "../lib/FontContext";
import { supabase } from "../lib/supabase";
import { ThemeProvider, useTheme } from "../lib/ThemeContext";

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

  // Initialiser l'authentification et écouter les changements
  useEffect(() => {
    let authListener: any = null;

    const initAuth = async () => {
      // Essayer de récupérer la session existante
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError && sessionError.message !== "Auth session missing!") {
        console.error("Erreur session:", sessionError);
      }

      setSession(sessionData?.session ?? null);
      setIsAuthLoading(false);
    };

    // Initialiser et s'abonner aux changements
    initAuth();

    const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession ?? null);
      setIsAuthLoading(false);
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
          router.replace("/");
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
            name="index"
            options={{
              title: "Accueil",
              animation: "fade",
              animationDuration: duration,
            }}
          />
          <Stack.Screen
            name="details"
            options={{
              title: "Détails",
              presentation: "card",
              animation: "slide_from_left",
              animationMatchesGesture: true,
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
            name="edit-task"
            options={{
              title: "Modifier une tâche",
              animation: "fade",
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
        </Stack>
        {!isOnboarding && !isSettingsSubroute && <Navbar />}
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