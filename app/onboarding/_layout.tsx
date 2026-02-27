import { Stack } from 'expo-router';
import { useTheme } from '../../lib/ThemeContext';

export default function OnboardingLayout() {
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
        name="start"
        options={{
          title: 'Démarrage',
        }}
      />
      <Stack.Screen
        name="login"
        options={{
          title: 'Connexion',
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          title: 'Inscription',
        }}
      />
      <Stack.Screen
        name="successMail"
        options={{
          title: 'Success Email',
        }}
      />
      <Stack.Screen
        name="emailVerif"
        options={{
          title: 'Vérification Email',
        }}
      />

      <Stack.Screen
        name="tutorial"
        options={{
          title: 'Tutoriel',
        }}
      />

    </Stack>
  );
}
