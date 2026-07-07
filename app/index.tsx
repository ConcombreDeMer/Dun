import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { toDailyDateKey } from '../lib/date';
import { fetchProfile, patchProfileCache, profileQueryKey } from '../lib/profile';
import { useTheme } from '../lib/ThemeContext';
import { supabase } from '../lib/supabase';

export default function Index() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { colors } = useTheme();

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

                if (profile.restEndDate && profile.restEndDate > new Date().toISOString()) {
                    router.replace('/rest');
                    return;
                } else if (profile.restEndDate && profile.restEndDate <= new Date().toISOString()) {
                    await supabase
                        .from('Profiles')
                        .update({ restMode: false, restEndDate: null })
                        .eq('id', userId);
                    patchProfileCache(queryClient, userId, {
                        restMode: false,
                        restEndDate: null,
                    });
                }

                if(profile.dailyEnabled == false) {
                    router.replace('/home');
                    return;
                }

                if (profile.last_opened === null) {
                    await supabase
                        .from('Profiles')
                        .update({ last_opened: today, hasDoneDaily: false })
                        .eq('id', userId);
                    patchProfileCache(queryClient, userId, {
                        last_opened: today,
                        hasDoneDaily: false,
                    });
                    router.replace('/daily');
                    return;
                }

                if (profile.last_opened !== today) {
                    await supabase
                        .from('Profiles')
                        .update({ last_opened: today, hasDoneDaily: false })
                        .eq('id', userId);
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
                router.replace('/home');
            }
        };

        checkRouting();
    }, [queryClient, router]);

    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
}
