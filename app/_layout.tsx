import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import React from "react";
import { ThemeProvider, useTheme } from "../lib/ThemeContext";
import { StatusBar } from "expo-status-bar";

SplashScreen.preventAutoHideAsync();

function RootLayoutContent() {
  const { colors, isLoading } = useTheme();

  const [fontsLoaded] = useFonts({
    "Satoshi-Regular": require("../assets/fonts/Satoshi-Regular.otf"),
    "Satoshi-Medium": require("../assets/fonts/Satoshi-Medium.otf"),
    "Satoshi-Bold": require("../assets/fonts/Satoshi-Bold.otf"),
    "Satoshi-Black": require("../assets/fonts/Satoshi-Black.otf"),
    "Satoshi-Variable": require("../assets/fonts/Satoshi-Variable.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isLoading]);

  if (!fontsLoaded || isLoading) {
    return null;
  }

  return (
    
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
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutContent />
    </ThemeProvider>
  );
}