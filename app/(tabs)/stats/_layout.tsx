import { useTheme } from '@/lib/ThemeContext';
import { Stack } from 'expo-router';

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
                name="index"
                options={{
                    title: 'Stats Générales',
                }}
            />
        </Stack>
    );
}
