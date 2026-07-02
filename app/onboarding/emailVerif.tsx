import { getImageSource } from '@/lib/imageHelper';
import PrimaryButton from '@/components/primaryButton';
import Squircle from '@/components/Squircle';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React, { useEffect, useState } from 'react';
import {
    Image,
    Keyboard,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp,
    FadeOutDown,
    ZoomIn
} from 'react-native-reanimated';
import { useFont } from '../../lib/FontContext';
import { useAppTranslation } from '../../lib/i18n';
import { useTheme } from '../../lib/ThemeContext';
import { supabase } from '../../lib/supabase';

export default function EmailVerificationScreen() {
    const router = useRouter();
    const { colors, actualTheme } = useTheme();
    const { t } = useAppTranslation();
    const { fontSizes } = useFont();
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
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: email.trim(),
                options: {
                    emailRedirectTo: 'dun://auth/callback',
                },
            });

            if (error) {
                console.error('Erreur lors de l\'envoi:', error);
                const errorMessage = error.message || '';

                // Extraire le temps d'attente de l'erreur
                const waitTimeMatch = errorMessage.match(/after (\d+) seconds/);
                if (waitTimeMatch) {
                    const waitSeconds = parseInt(waitTimeMatch[1], 10);
                    setRetryWaitTime(waitSeconds);
                    setRetryError(t('onboarding.emailVerification.resendWait'));
                } else {
                    setRetryError(t('onboarding.emailVerification.resendError'));
                }
            } else {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                setTimeLeft(3600); // Réinitialiser le compte à rebours
                setRetrySuccess(t('onboarding.emailVerification.resent'));
            }
        } catch (err) {
            console.error('Erreur:', err);
            setRetryError(t('onboarding.emailVerification.genericError'));
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } finally {
            setLoading(false);
        }
    };

    const styles = createStyles(colors, fontSizes);

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
                        {t('onboarding.emailVerification.successTitle')}
                    </Animated.Text>

                    <Animated.Text
                        entering={FadeInUp.springify().delay(400)}
                        style={[styles.successSubtitle, { color: colors.textSecondary }]}
                    >
                        {t('onboarding.emailVerification.successSubtitle')}
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
                <Animated.View
                    style={styles.header}
                    entering={FadeInUp.delay(200).duration(600)}>
                    <Text style={[styles.title, { color: colors.text }]}>
                        {t('onboarding.emailVerification.title')}
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.text }]}>
                        {t('onboarding.emailVerification.subtitle')}
                    </Text>
                </Animated.View>

                <Animated.View
                    entering={FadeInUp.springify().delay(500).duration(800)}
                    style={styles.content}
                >
                    <Squircle style={[styles.verificationCard, { backgroundColor: colors.card }]}>
                        <View style={[styles.iconSurface, { backgroundColor: colors.background }]}>
                            <SymbolView name="envelope.badge" size={34} tintColor={colors.textSecondary} />
                        </View>

                        <View style={styles.emailGroup}>
                            <Text style={[styles.emailLabel, { color: colors.textSecondary }]}>
                                {t('onboarding.emailVerification.sentTo')}
                            </Text>
                            <Text numberOfLines={2} style={[styles.emailValue, { color: colors.text }]}>
                                {email}
                            </Text>
                        </View>

                        <Text style={[styles.instructions, { color: colors.textSecondary }]}>
                            {t('onboarding.emailVerification.instructions')}
                        </Text>

                        <View style={[styles.timerContainer, { backgroundColor: colors.background }]}>
                            <Text style={[styles.timerLabel, { color: colors.textSecondary }]}>
                                {t('onboarding.emailVerification.expiresIn')}
                            </Text>
                            <Text style={[styles.timer, { color: colors.text }]}>
                                {formatTime(timeLeft)}
                            </Text>
                        </View>
                    </Squircle>
                </Animated.View>


                <Animated.View
                    style={styles.buttonSection}
                    entering={FadeInDown.springify().delay(200).duration(600)}
                    exiting={FadeOutDown.springify().delay(100).duration(500)}

                >
                    <PrimaryButton
                        title={t('onboarding.emailVerification.checked')}
                        onPress={checkEmailVerification}
                    />


                    {retrySuccess !== '' && (
                        <Animated.View
                            entering={FadeInDown.springify()}
                            exiting={FadeOutDown.springify()}
                            style={[styles.statusMessage, { backgroundColor: '#DFF4E5' }]}
                        >
                            <Text style={[styles.statusMessageText, { color: '#2D7A45' }]}>
                                {retrySuccess}
                            </Text>
                        </Animated.View>
                    )}

                    {retryError !== '' && (
                        <Animated.View
                            entering={FadeInDown.springify()}
                            style={[styles.statusMessage, { backgroundColor: '#F7C1C1' }]}
                        >
                            <Text style={[styles.statusMessageText, { color: '#A10606' }]}>
                                {retryError}
                                {retryWaitTime > 0 && ` ${retryWaitTime}s`}
                            </Text>
                        </Animated.View>
                    )}

                    <PrimaryButton
                        title={t('onboarding.emailVerification.resend')}
                        type="reverse"
                        onPress={resendVerificationEmail}
                        disabled={loading || retryWaitTime > 0}
                    />

                    <Text style={[styles.footerInfo, { color: colors.textSecondary }]}>
                        {t('onboarding.emailVerification.spam')}
                    </Text>
                </Animated.View>
            </SafeAreaView>
        </Pressable>
    );
}

const createStyles = (colors: any, fontSizes: any) =>
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
            right: 20,
            alignItems: 'flex-start',
        },

        title: {
            fontSize: fontSizes['6xl'],
            fontFamily: 'Satoshi-Black',
        },

        subtitle: {
            fontSize: fontSizes['2xl'],
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
            paddingHorizontal: 20,
            width: '100%',
        },
        verificationCard: {
            alignItems: 'center',
            borderRadius: 30,
            gap: 18,
            paddingHorizontal: 22,
            paddingVertical: 24,
            maxWidth: 420,
            width: '100%',
            boxShadow: '0px 6px 10px rgba(0, 0, 0, 0.1)',
        },
        iconSurface: {
            alignItems: 'center',
            borderRadius: 28,
            height: 56,
            justifyContent: 'center',
            width: 56,
        },
        emailGroup: {
            alignItems: 'center',
            gap: 6,
            width: '100%',
        },
        emailLabel: {
            fontFamily: 'Satoshi-Medium',
            fontSize: fontSizes.sm,
            textAlign: 'center',
        },
        emailValue: {
            fontFamily: 'Satoshi-Bold',
            fontSize: fontSizes.lg,
            textAlign: 'center',
        },
        instructions: {
            fontFamily: 'Satoshi-Regular',
            fontSize: fontSizes.base,
            lineHeight: fontSizes.base + 6,
            textAlign: 'center',
        },
        timerContainer: {
            alignItems: 'center',
            borderRadius: 18,
            paddingHorizontal: 18,
            paddingVertical: 14,
            width: '100%',
        },
        timerLabel: {
            fontFamily: 'Satoshi-Medium',
            fontSize: fontSizes.xs,
            marginBottom: 8,
        },
        timer: {
            fontSize: fontSizes['4xl'],
            fontFamily: 'Satoshi-Bold',
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
            fontSize: fontSizes['4xl'],
            fontFamily: 'Satoshi-Bold',
            marginBottom: 8,
            textAlign: 'center',
        },
        successSubtitle: {
            fontSize: fontSizes.base,
            fontFamily: 'Satoshi-Regular',
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
            gap: 12,
        },
        footerInfo: {
            fontSize: fontSizes.xs,
            fontFamily: 'Satoshi-Regular',
            lineHeight: fontSizes.xs + 5,
            textAlign: 'center',
            width: '100%',
            marginTop: 6,
        },
        statusMessage: {
            borderRadius: 16,
            paddingHorizontal: 14,
            paddingVertical: 10,
        },
        statusMessageText: {
            fontFamily: 'Satoshi-Medium',
            fontSize: fontSizes.sm,
            textAlign: 'center',
        },
    });
