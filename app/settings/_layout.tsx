import { useTheme } from "@/lib/ThemeContext";
import { Stack } from "expo-router";

export default function SettingsStackLayout() {
  const { colors } = useTheme();

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
      <Stack.Screen name="account" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="display" />
      <Stack.Screen name="colors" />
      <Stack.Screen name="tags" />
      <Stack.Screen name="subscription" />
      <Stack.Screen name="premium" />
      <Stack.Screen name="changeEmail" />
      <Stack.Screen name="ExportData" />
    </Stack>
  );
}
