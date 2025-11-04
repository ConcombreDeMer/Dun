import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import React from "react";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "Satoshi-Regular": require("../assets/fonts/Satoshi-Regular.otf"),
    "Satoshi-Medium": require("../assets/fonts/Satoshi-Medium.otf"),
    "Satoshi-Bold": require("../assets/fonts/Satoshi-Bold.otf"),
    "Satoshi-Black": require("../assets/fonts/Satoshi-Black.otf"),
    "Satoshi-Variable": require("../assets/fonts/Satoshi-Variable.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#ffffffff",
        },
        headerTintColor: "#000000ff",
        headerTitleStyle: {
          fontWeight: "bold",
          fontSize: 18,
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
    </Stack>
  );
}