import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { getRestEndStatus, toDailyDateKey } from '../lib/date';
import { supabaseDailyRepository } from '../lib/dailyRepository';
import { useAppTranslation } from '../lib/i18n';
import { fetchProfile, patchProfileCache, profileQueryKey } from '../lib/profile';
import { supabaseRestRepository } from '../lib/restRepository';
import { useTheme } from '../lib/ThemeContext';
import { supabase } from '../lib/supabase';

export default function Index() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { colors } = useTheme();
    const { t } = useAppTranslation();
    const [routingError, setRoutingError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        const checkRouting = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const userId = session?.user.id;

                if (!userId) {
                    // Non authentifié, _layout.tsx s'occupera de la redirection vers /onboarding/start
                    return;
                }

                const today = toDailyDateKey(new Date());

                const profile = await queryClient.fetchQuery({
                    queryKey: profileQueryKey(userId),
                    queryFn: () => fetchProfile(userId),
                    staleTime: 0,
                });

                const restStatus = getRestEndStatus(profile.restEndDate, today);
                if (restStatus === 'active') {
                    router.replace('/rest');
                    return;
                } else if (restStatus === 'expired') {
                    const currentRestEndDate = await supabaseRestRepository.expireIfPast(userId, today);
                    if (getRestEndStatus(currentRestEndDate, today) === 'active') {
                        router.replace('/rest');
                        return;
                    }
                    patchProfileCache(queryClient, userId, {
                        restMode: false,
                        restEndDate: null,
                    });
                }

                if (profile.dailyEnabled === false) {
                    router.replace('/home');
                    return;
                }

                if (profile.last_opened !== today) {
                    await supabaseDailyRepository.openDay(userId, today);
                    patchProfileCache(queryClient, userId, {
                        last_opened: today,
                        hasDoneDaily: false,
                    });
                    router.replace('/daily');
                    return;
                } else {
                    if (!profile.hasDoneDaily) {
                        router.replace('/daily');
                        return;
                    }
                }

                // Si aucune redirection spécifique n'est nécessaire, aller à /home
                router.replace('/home');

            } catch (error) {
                console.error('Erreur lors de la vérification initiale:', error);
                setRoutingError(true);
            }
        };

        checkRouting();
    }, [queryClient, retryCount, router]);

    if (routingError) {
        return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: colors.background }}>
            <Text style={{ color: colors.text }}>{t('common.alerts.genericError')}</Text>
            <Pressable accessibilityRole="button" onPress={() => { setRoutingError(false); setRetryCount((value) => value + 1); }}>
                <Text style={{ color: colors.text }}>{t('common.actions.retry')}</Text>
            </Pressable>
        </View>;
    }

    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
}
