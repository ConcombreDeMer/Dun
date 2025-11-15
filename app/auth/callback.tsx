import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/ThemeContext';

export default function AuthCallbackScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const params = useLocalSearchParams();

    useEffect(() => {
        const handleDeepLink = async () => {
            try {
                // Récupérer la session depuis Supabase
                const { data: { session }, error } = await supabase.auth.getSession();
                
                if (error) {
                    console.error('Erreur lors de la récupération de la session:', error);
                    router.replace('/onboarding/start');
                    return;
                }

                if (session) {
                    // L'utilisateur est authentifié
                    console.log('Utilisateur authentifié:', session.user.email);
                    router.replace('/');
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
