import { Session } from "@supabase/supabase-js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import Navbar from "../components/navbar";
import { FontProvider } from "../lib/FontContext";
import { supabase } from "../lib/supabase";
import { ThemeProvider, useTheme } from "../lib/ThemeContext";

SplashScreen.preventAutoHideAsync();

function RootLayoutContent() {
  const { colors, isLoading } = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [fontsLoaded] = useFonts({
    "Satoshi-Regular": require("../assets/fonts/Satoshi-Regular.otf"),
    "Satoshi-Medium": require("../assets/fonts/Satoshi-Medium.otf"),
    "Satoshi-Bold": require("../assets/fonts/Satoshi-Bold.otf"),
    "Satoshi-Black": require("../assets/fonts/Satoshi-Black.otf"),
    "Satoshi-Variable": require("../assets/fonts/Satoshi-Variable.ttf"),
  });

  // Écouter les changements d'authentification
  useEffect(() => {
    // Gérer les deep links (confirmation d'email, réinitialisation de mot de passe, etc.)
    const handleDeepLink = async () => {
      try {
        // Vérifier et traiter le fragment URL (token de confirmation)
        const { data, error } = await supabase.auth.refreshSession();
        if (error) {
          console.error("Erreur lors du refresh de session:", error);
        } else if (data.session) {
          setSession(data.session);
        }
      } catch (error) {
        console.error("Erreur lors de la gestion du deep link:", error);
      }
    };

    // Appeler immédiatement pour traiter les deep links
    handleDeepLink();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event);
        setSession(session);
        setIsAuthLoading(false);
      }
    );

    // Vérifier l'état de session actuel
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAuthLoading(false);
    });

    return () => {
      authListener?.subscription.unsubscribe();
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

    const isOnboarding = segments[0] === "onboarding";

    if (!session) {
      // Pas authentifié → rediriger vers onboarding/start
      if (!isOnboarding) {
        router.replace("/onboarding/start");
      }
    } else {
      // Authentifié → rediriger vers l'app principale
      if (isOnboarding) {
        router.replace("/");
      }
    }
  }, [session, isAuthLoading, segments]);

  if (!fontsLoaded || isLoading || isAuthLoading) {
    return null;
  }

  // Vérifier si on est sur l'onboarding pour masquer la navbar
  const isOnboarding = segments[0] === "onboarding";

  const duration = 200;

  const queryClient = new QueryClient();



  return (

    <QueryClientProvider client={queryClient}>

      <View
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

      </View>
      <View style={{ flex: 1, backgroundColor: "red" }}>
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
        {!isOnboarding && <Navbar />}
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