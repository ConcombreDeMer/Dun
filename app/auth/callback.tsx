import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

export default function AuthCallbackScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const params = useLocalSearchParams();

    useEffect(() => {
        const handleDeepLink = async () => {
            try {
                // Petit délai pour laisser Supabase traiter le token
                await new Promise(resolve => setTimeout(resolve, 500));

                // Récupérer la session depuis Supabase
                const { data: { session }, error } = await supabase.auth.getSession();
                
                if (error) {
                    console.error('Erreur lors de la récupération de la session:', error);
                    router.replace('/onboarding/start');
                    return;
                }

                if (session) {
                    // Vérifier si l'email a été confirmé
                    const user = session.user;
                    if (user.email_confirmed_at) {
                        // Email confirmé - redirection vers successMail
                        router.replace('/onboarding/successMail');
                    } else {
                        // Email toujours non confirmé
                        router.replace('/onboarding/emailVerif');
                    }
                } else {
                    // Pas de session, redirection vers le login
                    console.log('Pas de session trouvée');
                    router.replace('/onboarding/login');
                }
            } catch (err) {
                console.error('Erreur lors du traitement du callback:', err);
                router.replace('/onboarding/start');
            }
        };

        handleDeepLink();
    }, []);

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
            <ActivityIndicator size="large" color={colors.actionButton} />
            <Text style={{ marginTop: 20, color: colors.text }}>Vérification de votre compte...</Text>
        </View>
    );
}
