import { getImageSource } from '@/lib/imageHelper';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Image,
    Keyboard,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp,
    FadeOutDown,
    ZoomIn
} from 'react-native-reanimated';
import { useTheme } from '../../lib/ThemeContext';
import { supabase } from '../../lib/supabase';

export default function EmailVerificationScreen() {
    const router = useRouter();
    const { colors, actualTheme } = useTheme();
    const { email } = useLocalSearchParams<{ email: string }>();

    const [loading, setLoading] = useState(false);
    const [checkingVerification, setCheckingVerification] = useState(false);
    const [timeLeft, setTimeLeft] = useState(3600); // 1 heure
    const [isVerified, setIsVerified] = useState(false);
    const [retryError, setRetryError] = useState('');
    const [retryWaitTime, setRetryWaitTime] = useState(0);
    const [retrySuccess, setRetrySuccess] = useState('');

    // Compte à rebours du lien de vérification
    useEffect(() => {
        const interval = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Compte à rebours du temps d'attente pour renvoyer l'email
    useEffect(() => {
        if (retryWaitTime <= 0) return;

        const interval = setInterval(() => {
            setRetryWaitTime((prev) => {
                const newTime = prev - 1;
                if (newTime <= 0) {
                    setRetryError('');
                }
                return newTime > 0 ? newTime : 0;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [retryWaitTime]);

    // Afficher le message de succès pendant 3 secondes
    useEffect(() => {
        if (!retrySuccess) return;

        const timer = setTimeout(() => {
            setRetrySuccess('');
        }, 3000);

        return () => clearTimeout(timer);
    }, [retrySuccess]);

    // Formater le temps (MM:SS)
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // Vérifier si l'email a été confirmé
    const checkEmailVerification = async () => {
       router.replace('/onboarding/login');
    };

    // Renvoyer l'email de vérification
    const resendVerificationEmail = async () => {
        if (!email) return;

        setLoading(true);
        setRetryError('');
        setRetrySuccess('');
        try {
            // Resend verification email using signUp with the same email
            const { error } = await supabase.auth.signUp({
                email: email.trim(),
                password: 'dummy-password', // Dummy password, will be ignored
            });

            if (error) {
                console.error('Erreur lors de l\'envoi:', error);
                const errorMessage = error.message || '';
                
                // Extraire le temps d'attente de l'erreur
                const waitTimeMatch = errorMessage.match(/after (\d+) seconds/);
                if (waitTimeMatch) {
                    const waitSeconds = parseInt(waitTimeMatch[1], 10);
                    setRetryWaitTime(waitSeconds);
                    setRetryError('Email non envoyé, veuillez attendre');
                } else {
                    setRetryError('Une erreur s\'est produite lors de l\'envoi de l\'email');
                }
            } else {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                setTimeLeft(3600); // Réinitialiser le compte à rebours
                setRetrySuccess('Email renvoyé avec succès!');
            }
        } catch (err) {
            console.error('Erreur:', err);
            setRetryError('Une erreur s\'est produite');
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } finally {
            setLoading(false);
        }
    };

    const styles = createStyles(colors);

    if (isVerified) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.successContainer}>
                    <Animated.View
                        entering={ZoomIn.springify()}
                        style={styles.successIconContainer}
                    >
                        <Image
                            source={getImageSource('success', actualTheme)}
                            style={styles.successIcon}
                        />
                    </Animated.View>

                    <Animated.Text
                        entering={FadeInUp.springify().delay(200)}
                        style={[styles.successTitle, { color: colors.text }]}
                    >
                        Email vérifié ! 🎉
                    </Animated.Text>

                    <Animated.Text
                        entering={FadeInUp.springify().delay(400)}
                        style={[styles.successSubtitle, { color: colors.textSecondary }]}
                    >
                        Redirection en cours...
                    </Animated.Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <Pressable
            style={[styles.container, { backgroundColor: colors.background }]}
            onPress={() => Keyboard.dismiss()}
        >
            <SafeAreaView style={styles.safeArea}>
                {/* Header */}

                <Animated.View
                    style={styles.header}
                    entering={FadeInUp.delay(200).duration(600)}>
                    <Text style={[styles.title, { color: colors.text }]}>
                        Vérification
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.text }]}>
                        de ton email
                    </Text>
                </Animated.View>

                {/* Content */}
                <View style={styles.content}>

                    {/* Email Address */}

                    <View style={styles.email}>

                        <Animated.Text
                            entering={FadeInUp.springify().delay(1000).duration(1000)}
                            style={[styles.emailText, {
                                color: colors.actionButton, fontWeight: '300',
                            }]}
                        >
                            <Text>Un email de vérification a été envoyé à</Text>
                        </Animated.Text>

                        <Animated.Text
                            entering={FadeInUp.springify().delay(1000).duration(1000)}
                            style={[styles.emailText, {
                                color: colors.actionButton, fontWeight: '600',
                            }]}
                        >
                            {email}
                        </Animated.Text>

                    </View>

                    {/* Instructions */}
                    <Animated.View
                        entering={FadeInUp.springify().delay(1000).duration(1000)}
                        style={styles.instructionsContainer}
                    >
                        <Text style={[styles.instructions, { color: colors.textSecondary }]}>
                            • Ouvres tes email{'\n'}
                            • Cliques sur le lien de vérification{'\n'}
                            • Reviens ici pour continuer
                        </Text>
                    </Animated.View>

                    {/* Timer */}
                    <Animated.View
                        entering={FadeInUp.springify().delay(1000).duration(1000)}
                        style={[styles.timerContainer, { backgroundColor: colors.input, borderColor: colors.border }]}
                    >
                        <Text style={[styles.timerLabel, { color: colors.textSecondary }]}>
                            Expiration du lien dans:
                        </Text>
                        <Text style={[styles.timer, { color: colors.actionButton }]}>
                            {formatTime(timeLeft)}
                        </Text>
                    </Animated.View>
                </View>


                <Animated.View
                    style={styles.buttonSection}
                    entering={FadeInDown.springify().delay(200).duration(600)}
                    exiting={FadeOutDown.springify().delay(100).duration(500)}

                >

                    <TouchableOpacity
                        style={[styles.primaryButton, { backgroundColor: colors.actionButton }]}
                        onPress={checkEmailVerification}
                    >
                        <Text style={[styles.primaryButtonText, { color: colors.buttonText }]}>
                            J'ai vérifié mon email
                        </Text>
                    </TouchableOpacity>


                    {retrySuccess !== '' && (
                        <Animated.Text
                            entering={FadeInDown.springify()}
                            exiting={FadeOutDown.springify()}
                            style={[styles.successMessage, { color: '#4CAF50' }]}
                        >
                            {retrySuccess}
                        </Animated.Text>
                    )}

                    {retryError !== '' && (
                        <Animated.Text
                            entering={FadeInDown.springify()}
                            style={[styles.errorMessage, { color: colors.actionButton }]}
                        >
                            {retryError}
                            {retryWaitTime > 0 && ` ${retryWaitTime}s`}
                        </Animated.Text>
                    )}

                    <TouchableOpacity
                        style={[
                            styles.secondaryButton,
                            {
                                borderColor: loading || retryWaitTime > 0 ? colors.border : colors.border,
                                borderWidth: 1.5,
                                opacity: loading || retryWaitTime > 0 ? 0.5 : 1,
                            },
                        ]}
                        onPress={resendVerificationEmail}
                        disabled={loading || retryWaitTime > 0}
                    >

                        {/* ici */}
                        <Text style={[
                            styles.secondaryButtonText,
                            {
                                color: loading || retryWaitTime > 0 ? colors.textSecondary : colors.text
                            }
                        ]}>
                            Renvoyer l'email
                        </Text>
                    </TouchableOpacity>

                    {/* Footer Info */}
                    <Text style={[styles.footerInfo, { color: colors.textSecondary }]}>
                        N'oublie pas de consulter tes spams / indésirables
                    </Text>
                </Animated.View>
            </SafeAreaView>
        </Pressable>
    );
}

const createStyles = (colors: any) =>
    StyleSheet.create({
        container: {
            flex: 1,
        },
        safeArea: {
            flex: 1,
            paddingHorizontal: 20,
        },
        header: {
            position: 'absolute',
            top: 80,
            left: 20,
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
        content: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 100,
        },

        email: {
            marginBottom: 20,
        },

        emailText: {
            fontSize: 16,
            textAlign: 'center',
            marginBottom: 5,
        },
        instructionsContainer: {
            backgroundColor: colors.input,
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
            borderWidth: 1,
            borderColor: colors.border,
        },
        instructions: {
            fontSize: 13,
            fontWeight: '400',
            lineHeight: 20,
        },
        timerContainer: {
            borderRadius: 12,
            padding: 16,
            alignItems: 'center',
            borderWidth: 1,
            marginBottom: 40,
        },
        timerLabel: {
            fontSize: 12,
            fontWeight: '500',
            marginBottom: 8,
        },
        timer: {
            fontSize: 32,
            fontWeight: '700',
            fontFamily: 'monospace',
        },
        footer: {
            gap: 12,
            paddingBottom: 20,
            width: '80%',
            alignSelf: 'center',
        },

        infoText: {
            fontSize: 12,
            textAlign: 'center',
            marginTop: 8,
        },
        successContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        successIconContainer: {
            marginBottom: 20,
        },
        successIcon: {
            width: 100,
            height: 100,
        },
        successTitle: {
            fontSize: 28,
            fontWeight: '700',
            marginBottom: 8,
            textAlign: 'center',
        },
        successSubtitle: {
            fontSize: 16,
            fontWeight: '400',
            textAlign: 'center',
        },
        buttonSection: {
            marginBottom: 30,
            zIndex: 2,
            position: 'absolute',
            bottom: 50,
            width: '90%',
            alignSelf: 'center',
            display: 'flex',
            flexDirection: 'column',
        },
        pin: {
            alignSelf: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 20,
            position: 'absolute',
            top: -10,
            right: 0,
            zIndex: 2,
            backgroundColor: colors.input,
            borderColor: colors.border,
            borderWidth: 1,

        },
        primaryButton: {
            paddingVertical: 16,
            borderRadius: 50,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
            borderColor: colors.actionButton,
            borderWidth: 1.5
        },
        primaryButtonText: {
            fontSize: 16,
            fontWeight: '600',
        },
        secondaryButton: {
            paddingVertical: 16,
            borderRadius: 50,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
        },
        secondaryButtonText: {
            fontSize: 16,
            fontWeight: '600',
        },
        footerInfo: {
            fontSize: 12,
            textAlign: 'center',
            width: '100%',
            marginTop: 20,
        },
        errorMessage: {
            fontSize: 13,
            fontWeight: '500',
            textAlign: 'center',
            marginBottom: 12,
            paddingHorizontal: 12,
            zIndex: 1,
        },
        successMessage: {
            fontSize: 13,
            fontWeight: '500',
            textAlign: 'center',
            marginBottom: 12,
            paddingHorizontal: 12,
            zIndex: 1,
        },
    });
