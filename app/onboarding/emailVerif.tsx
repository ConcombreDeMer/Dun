import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ActivityIndicator,
    Pressable,
    Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { useTheme } from '../../lib/ThemeContext';
import { supabase } from '../../lib/supabase';
import Animated, {
    FadeIn,
    FadeOut,
    FadeInUp,
    FadeOutDown,
    ZoomIn,
} from 'react-native-reanimated';
import { getImageSource } from '@/lib/imageHelper';
import { Image } from 'react-native';
import * as Haptics from 'expo-haptics';

export default function EmailVerificationScreen() {
    const router = useRouter();
    const { colors, theme } = useTheme();
    const { email } = useLocalSearchParams<{ email: string }>();

    const [loading, setLoading] = useState(false);
    const [checkingVerification, setCheckingVerification] = useState(false);
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
    const [isVerified, setIsVerified] = useState(false);

    // Compte à rebours
    useEffect(() => {
        const interval = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Formater le temps (MM:SS)
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // Vérifier si l'email a été confirmé
    const checkEmailVerification = async () => {
        console.log('Vérification de l\'email pour:', email);
        setCheckingVerification(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user?.email_confirmed_at) {
                console.log('Email vérifié pour:', email);
                setIsVerified(true);
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                // Naviguer vers l'accueil après 1.5 secondes
                setTimeout(() => {
                    router.replace('/onboarding/successMail');
                }, 1500);
            } else {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                console.log('Email non encore vérifié pour:', email);
            }
        } catch (error) {
            console.error('Erreur lors de la vérification:', error);
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } finally {
            setCheckingVerification(false);
        }
    };

    // Renvoyer l'email de vérification
    const resendVerificationEmail = async () => {
        if (!email) return;

        setLoading(true);
        try {
            // Resend verification email using signUp with the same email
            const { error } = await supabase.auth.signUp({
                email: email.trim(),
                password: 'dummy-password', // Dummy password, will be ignored
            });

            if (error) {
                console.error('Erreur lors de l\'envoi:', error);
            } else {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                setTimeLeft(300); // Réinitialiser le compte à rebours
            }
        } catch (err) {
            console.error('Erreur:', err);
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
                            source={getImageSource('success', theme)}
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
                    entering={FadeInUp.springify()}
                    style={styles.header}
                >
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Image
                            style={styles.backIcon}
                            source={getImageSource('back', theme)}
                        />
                    </TouchableOpacity>
                </Animated.View>

                {/* Content */}
                <View style={styles.content}>
                    {/* Icon */}
                    <Animated.View
                        entering={FadeIn.springify().delay(200)}
                        style={styles.iconContainer}
                    >
                        <Image
                            source={getImageSource('mail', theme)}
                            style={styles.mailIcon}
                        />
                    </Animated.View>

                    {/* Title */}
                    <Animated.Text
                        entering={FadeInUp.springify().delay(400)}
                        style={[styles.title, { color: colors.text }]}
                    >
                        Vérifiez votre email
                    </Animated.Text>

                    {/* Subtitle with email */}
                    <Animated.Text
                        entering={FadeInUp.springify().delay(600)}
                        style={[styles.subtitle, { color: colors.textSecondary }]}
                    >
                        Nous avons envoyé un lien de vérification à
                    </Animated.Text>

                    <Animated.Text
                        entering={FadeInUp.springify().delay(800)}
                        style={[styles.emailText, { color: colors.actionButton }]}
                    >
                        {email}
                    </Animated.Text>

                    {/* Instructions */}
                    <Animated.View
                        entering={FadeInUp.springify().delay(1000)}
                        style={styles.instructionsContainer}
                    >
                        <Text style={[styles.instructions, { color: colors.textSecondary }]}>
                            • Ouvrez votre email{'\n'}
                            • Cliquez sur le lien de vérification{'\n'}
                            • Revenez ici pour continuer
                        </Text>
                    </Animated.View>

                    {/* Timer */}
                    <Animated.View
                        entering={FadeInUp.springify().delay(1200)}
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

                {/* Footer Buttons */}
                <Animated.View
                    entering={FadeInUp.springify().delay(1400)}
                    style={styles.footer}
                >
                    {/* Check Button */}
                    <TouchableOpacity
                        style={[styles.primaryButton, { backgroundColor: colors.actionButton }]}
                        onPress={checkEmailVerification}
                    // disabled={checkingVerification || isVerified}
                    >
                        {checkingVerification ? (
                            <ActivityIndicator color={colors.buttonText} />
                        ) : (
                            <Text style={[styles.primaryButtonText, { color: colors.buttonText }]}>
                                J'ai vérifié mon email
                            </Text>
                        )}
                    </TouchableOpacity>

                    {/* Resend Button */}
                    <TouchableOpacity
                        style={[
                            styles.secondaryButton,
                            {
                                borderColor: colors.border,
                                opacity: loading ? 0.5 : 1,
                            },
                        ]}
                        onPress={resendVerificationEmail}
                        disabled={loading || timeLeft <= 0}
                    >
                        {loading ? (
                            <ActivityIndicator color={colors.text} />
                        ) : (
                            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                                {timeLeft <= 0 ? 'Renvoi possible' : 'Renvoyer l\'email'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    {/* Info Text */}
                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                        Vérifiez également votre dossier spam
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
            flexDirection: 'row',
            justifyContent: 'flex-start',
            marginBottom: 20,
            marginTop: 10,
        },
        backButton: {
            width: 44,
            height: 44,
            borderRadius: 50,
            backgroundColor: colors.input,
            alignItems: 'center',
            justifyContent: 'center',
        },
        backIcon: {
            width: 24,
            height: 24,
        },
        content: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        iconContainer: {
            marginBottom: 30,
        },
        mailIcon: {
            width: 80,
            height: 80,
        },
        title: {
            fontSize: 28,
            fontWeight: '700',
            marginBottom: 16,
            textAlign: 'center',
        },
        subtitle: {
            fontSize: 14,
            fontWeight: '400',
            textAlign: 'center',
            marginBottom: 4,
        },
        emailText: {
            fontSize: 16,
            fontWeight: '600',
            textAlign: 'center',
            marginBottom: 30,
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
        },
        primaryButton: {
            paddingVertical: 14,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
        },
        primaryButtonText: {
            fontSize: 16,
            fontWeight: '600',
        },
        secondaryButton: {
            paddingVertical: 14,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
        },
        secondaryButtonText: {
            fontSize: 16,
            fontWeight: '600',
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
    });
