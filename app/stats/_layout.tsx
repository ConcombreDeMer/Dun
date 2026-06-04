import { useTheme } from "@/lib/ThemeContext";
import { Stack } from "expo-router";

export default function StatsStackLayout() {
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
      <Stack.Screen
        name="streakExplain"
        options={{
          title: "Streak Explanation",
        }}
      />
      <Stack.Screen
        name="chargeExplain"
        options={{
          title: "Charge Explanation",
        }}
      />
      <Stack.Screen
        name="completionExplain"
        options={{
          title: "Completion Explanation",
        }}
      />
      <Stack.Screen
        name="adjustmentExplain"
        options={{
          title: "Adjustment Rate Explanation",
        }}
      />
    </Stack>
  );
}
