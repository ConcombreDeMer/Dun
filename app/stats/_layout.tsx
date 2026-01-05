import { Stack } from 'expo-router';
import { useTheme } from '../../lib/ThemeContext';

export default function StatsLayout() {
    const { colors } = useTheme();

    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: colors.background,
                },
                headerTintColor: colors.text,
                headerTitleStyle: {
                    fontWeight: 'bold',
                    fontSize: 18,
                    color: colors.text,
                },
                headerShown: false,
            }}
        >
            <Stack.Screen
                name="general"
                options={{
                    title: 'Stats Générales',
                }}
            />
            <Stack.Screen
                name="streakExplain"
                options={{
                    title: 'Streak Explanation',
                    presentation: 'modal',
                    animation: 'slide_from_bottom',
                }}
            />
            <Stack.Screen
                name="chargeExplain"
                options={{
                    title: 'Charge Explanation',
                    presentation: 'modal',
                    animation: 'slide_from_bottom',
                }}
            />
            <Stack.Screen
                name="completionExplain"
                options={{
                    title: 'Completion Explanation',
                    presentation: 'modal',
                    animation: 'slide_from_bottom',
                }}
            />
        </Stack>
    );
}
