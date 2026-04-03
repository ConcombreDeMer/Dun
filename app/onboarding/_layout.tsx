import { Stack } from 'expo-router';
import { useAppTranslation } from '../../lib/i18n';
import { useTheme } from '../../lib/ThemeContext';

export default function OnboardingLayout() {
  const { colors } = useTheme();
  const { t } = useAppTranslation();

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
          title: t('onboarding.start.title'),
        }}
      />
      <Stack.Screen
        name="login"
        options={{
          title: t('onboarding.login.title'),
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          title: t('onboarding.register.title'),
        }}
      />
      <Stack.Screen
        name="successMail"
        options={{
          title: t('onboarding.successMail.title'),
        }}
      />
      <Stack.Screen
        name="emailVerif"
        options={{
          title: t('onboarding.emailVerification.title'),
        }}
      />

      <Stack.Screen
        name="tutorial"
        options={{
          title: t('onboarding.tutorial.title'),
        }}
      />

    </Stack>
  );
}
