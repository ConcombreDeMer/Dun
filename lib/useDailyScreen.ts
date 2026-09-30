import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getRestEndStatus, toDailyDateKey } from './date';
import { supabaseDailyRepository } from './dailyRepository';
import { supabaseRestRepository } from './restRepository';
import { supabaseProfileRepository } from './profileRepository';
import { patchProfileCache } from './profile';
import { supabase } from './supabase';

export function useDailyScreen(isAuthLoading: boolean, isAuthenticated: boolean) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const pendingTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    useEffect(() => {
        if (isAuthLoading || !isAuthenticated) return;

        const checkDailyFirstOpen = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const today = toDailyDateKey(new Date());

                const profile = await supabaseProfileRepository.get(
                    user.id, 'last_opened, hasDoneDaily, restMode, restEndDate, dailyEnabled'
                );

                const restStatus = getRestEndStatus(profile.restEndDate, today);
                if (restStatus === 'active') {
                    router.push('/rest');
                    return;
                } else if (restStatus === 'expired') {
                    const currentRestEndDate = await supabaseRestRepository.expireIfPast(user.id, today);
                    if (getRestEndStatus(currentRestEndDate, today) === 'active') {
                        router.push('/rest');
                        return;
                    }
                    patchProfileCache(queryClient, user.id, { restMode: false, restEndDate: null });
                }

                if (profile.last_opened === null) {
                    // Cas du premier lancement de l'app après inscription : on initialise last_opened et on redirige vers le daily
                    await supabaseDailyRepository.openDay(user.id, today);
                    patchProfileCache(queryClient, user.id, { last_opened: today, hasDoneDaily: false });
                    router.push('/daily');
                    return;
                }

                if (profile.last_opened !== today) {
                    // Nouveau jour : on met à jour la date et on reset le booléen
                    await supabaseDailyRepository.openDay(user.id, today);
                    patchProfileCache(queryClient, user.id, { last_opened: today, hasDoneDaily: false });

                    const timeoutId = setTimeout(() => {
                        router.push('/daily');
                    }, 800);
                    pendingTimeoutsRef.current.push(timeoutId);
                } else {
                    // Même jour : on vérifie si l'utilisateur a déjà checké son daily
                    if (!profile.hasDoneDaily) {
                        const timeoutId = setTimeout(() => {
                            router.push('/daily');
                        }, 800);
                        pendingTimeoutsRef.current.push(timeoutId);
                    }
                    // Si hasDoneDaily est true, on ne fait rien (on skip le daily)
                }
            } catch (error) {
                console.error('Erreur lors de la vérification de la date:', error);
            }
        };

        // Nous ne faisons la vérification initiale que si nous ne sommes pas sur la page d'index
        // car la page d'index s'occupe déjà de ça
        // checkDailyFirstOpen();

        // Vérification quand l'app revient au premier plan
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                checkDailyFirstOpen();
            }
        });

        return () => {
            pendingTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
            pendingTimeoutsRef.current = [];
            subscription.remove();
        };
    }, [isAuthLoading, isAuthenticated, queryClient, router]);
}
