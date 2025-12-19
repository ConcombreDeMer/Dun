import { Stack, useRouter, useSegments } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import React from "react";
import { ThemeProvider, useTheme } from "../lib/ThemeContext";
import { StatusBar } from "expo-status-bar";
import { supabase } from "../lib/supabase";
import { Session } from "@supabase/supabase-js";
import { View } from "react-native";
import Navbar from "../components/navbar";

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
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
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

  return (
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
          }}
        />
        <Stack.Screen
          name="details"
          options={{
            title: "Détails",
            presentation: "modal",
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            title: "Paramètres",
            animation: "slide_from_left",
            animationMatchesGesture: true,
          }}
        />
      </Stack>
      {!isOnboarding && <Navbar />}
    </View>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutContent />
    </ThemeProvider>
  );
}