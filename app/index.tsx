import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useTheme } from '../lib/ThemeContext';
import { supabase } from '../lib/supabase';

export default function Index() {
    const router = useRouter();
    const { colors } = useTheme();

    useEffect(() => {
        const checkRouting = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    // Non authentifié, _layout.tsx s'occupera de la redirection vers /onboarding/start
                    return;
                }

                const today = new Date().toISOString().split('T')[0];

                const { data: profile, error } = await supabase
                    .from('Profiles')
                    .select('last_opened, hasDoneDaily, restMode, restEndDate')
                    .eq('id', user.id)
                    .single();

                if (error) {
                    console.error('Erreur lors de la récupération du profil:', error);
                    router.replace('/home');
                    return;
                }

                if (profile.restEndDate && profile.restEndDate > new Date().toISOString()) {
                    router.replace('/rest');
                    return;
                } else if (profile.restEndDate && profile.restEndDate <= new Date().toISOString()) {
                    await supabase
                        .from('Profiles')
                        .update({ restMode: false, restEndDate: null })
                        .eq('id', user.id);
                }

                if (profile.last_opened === null) {
                    await supabase
                        .from('Profiles')
                        .update({ last_opened: today, hasDoneDaily: false })
                        .eq('id', user.id);
                    router.replace('/daily');
                    return;
                }

                if (profile.last_opened !== today) {
                    await supabase
                        .from('Profiles')
                        .update({ last_opened: today, hasDoneDaily: false })
                        .eq('id', user.id);
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
    }, [router]);

    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
}
