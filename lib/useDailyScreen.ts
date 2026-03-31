import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from './supabase';

export function useDailyScreen(isAuthLoading: boolean, isAuthenticated: boolean) {
    const router = useRouter();

    useEffect(() => {
        if (isAuthLoading || !isAuthenticated) return;

        const checkDailyFirstOpen = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const today = new Date().toISOString().split('T')[0];

                const { data: profile, error } = await supabase
                    .from('Profiles')
                    .select('last_opened, hasDoneDaily, restMode, restEndDate',)
                    .eq('id', user.id)
                    .single();

                if (error) {
                    console.error('Erreur lors de la récupération du profil:', error);
                    return;
                }

                // if (profile.restMode) {
                //     router.push('/rest');
                //     return;
                // }

                if (profile.restEndDate && profile.restEndDate > new Date().toISOString()) {
                    router.push('/rest');
                    return;
                } else if (profile.restEndDate && profile.restEndDate <= new Date().toISOString()) {
                    // Si la date de fin de pause est passée, on réinitialise le mode pause
                    await supabase
                        .from('Profiles')
                        .update({ restMode: false, restEndDate: null })
                        .eq('id', user.id);
                }

                if (profile.last_opened === null) {
                    // Cas du premier lancement de l'app après inscription : on initialise last_opened et on redirige vers le daily
                    await supabase
                        .from('Profiles')
                        .update({ last_opened: today, hasDoneDaily: false })
                        .eq('id', user.id);
                    router.push('/daily');
                    return;
                }

                if (profile.last_opened !== today) {
                    // Nouveau jour : on met à jour la date et on reset le booléen
                    await supabase
                        .from('Profiles')
                        .update({ last_opened: today, hasDoneDaily: false })
                        .eq('id', user.id);

                    setTimeout(() => {
                        router.push('/daily');
                    }, 800);
                } else {
                    // Même jour : on vérifie si l'utilisateur a déjà checké son daily
                    if (!profile.hasDoneDaily) {
                        setTimeout(() => {
                            router.push('/daily');
                        }, 800);
                    }
                    // Si hasDoneDaily est true, on ne fait rien (on skip le daily)
                }
            } catch (error) {
                console.error('Erreur lors de la vérification de la date:', error);
            }
        };

        // Vérification initiale 
        checkDailyFirstOpen();

        // Vérification quand l'app revient au premier plan
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                checkDailyFirstOpen();
            }
        });

        return () => {
            subscription.remove();
        };
    }, [isAuthLoading, isAuthenticated, router]);
}