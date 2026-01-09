import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
    FadeOutDown,
} from 'react-native-reanimated';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../lib/ThemeContext';

export default function ReVerifEmail() {
    const { colors } = useTheme();
    const router = useRouter();
    const { email } = useLocalSearchParams() as { email?: string };
    const [error, setError] = React.useState<string | null>(null);

    const handleRetry = async () => {
        if (!email) {
            console.error('Email not provided');
            return;
        }

        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: email,
                options: {
                    emailRedirectTo: Linking.createURL('/onboarding/successMail'),
                },
            });

            if (error) {
                console.error('Erreur lors de l\'envoi de l\'email:', error);
                setError('Une erreur est survenue lors de l\'envoi de l\'email. Veuillez réessayer.');
                return;
            } else {
                router.push({
                    pathname: '/onboarding/emailVerif',
                    params: { email: email }
                });
            }
        } catch (error) {
            console.error('Erreur:', error);
        }
    };

    const handleLogout = async () => {
        router.push('/onboarding/start');
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Animated.View
                style={styles.header}
                entering={FadeInUp.delay(300).duration(600)}>
                <Text style={[styles.title, { color: colors.text }]}>
                    Vérification
                </Text>
                <Text style={[styles.subtitle, { color: colors.text }]}>
                    De ton email
                </Text>
            </Animated.View>

            <Animated.View
                entering={FadeIn.delay(300).duration(600)}
                style={styles.message}
            >
                <Text style={[styles.messageText, { color: colors.text }]}>
                    Ton email
                </Text>
                <Text style={[styles.messageText, { color: colors.text, fontWeight: 700 }]}>{email}</Text>
                <Text style={[styles.messageText, { color: colors.text, }]}>n'a pas encore été vérifié</Text>
                <Text style={[styles.messageText, { color: colors.text, fontSize: 30 }]} >😕</Text>
            </Animated.View>


            <Animated.View
                style={styles.footer}
                entering={FadeInDown.delay(300).duration(600)}>

                {error &&
                    <Animated.View
                        entering={FadeInDown.delay(300).duration(600)}
                        exiting={FadeOutDown}
                    >
                        <Text style={{ textAlign: "center", color: "red" }}>{error}</Text>
                    </Animated.View>
                }

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.actionButton }]}
                    onPress={handleRetry}
                >
                    <Text style={[styles.buttonText, { color: colors.buttonText }]}>
                        Réessayer la vérification
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.buttonSecondary, { borderColor: colors.text }]}
                    onPress={handleLogout}
                >
                    <Text style={[styles.buttonSecondaryText, { color: colors.text }]}>
                        Se déconnecter
                    </Text>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        position: 'absolute',
        top: 80,
        left: 20,
        right: 20,
        alignItems: 'flex-start',
    },
    title: {
        fontSize: 55,
        fontFamily: 'Satoshi-Black',
    },
    subtitle: {
        fontSize: 26,
        marginLeft: 5,
        marginTop: -10,
        fontFamily: 'Satoshi-Regular',
        opacity: 0.7,
    },
    message: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        fontFamily: 'Satoshi-Regular',
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
    },
    messageText: {
        fontWeight: '300',
        fontSize: 20,
    },
    footer: {
        position: 'absolute',
        bottom: 40,
        width: '90%',
        paddingHorizontal: 20,
        gap: 12,
    },
    button: {
        height: 70,
        borderRadius: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        fontSize: 20,
        fontWeight: '600',
        fontFamily: 'Satoshi-Bold',
    },
    buttonSecondary: {
        height: 70,
        borderRadius: 100,
        borderWidth: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonSecondaryText: {
        fontSize: 20,
        fontWeight: '600',
        fontFamily: 'Satoshi-Bold',
    },
});
