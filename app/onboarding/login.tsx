import PrimaryButton from '@/components/primaryButton';
import SimpleInput from '@/components/textInput';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Image,
    Keyboard,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, {
    FadeIn,
    FadeInUp,
    FadeOut,
    FadeOutDown
} from 'react-native-reanimated';
import { useTheme } from '../../lib/ThemeContext';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
    const router = useRouter();
    const { colors, theme } = useTheme();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const styles = createStyles(colors);

    const handleLogin = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setError('');

        // Validation simple
        if (!email.trim()) {
            setError('Veuillez entrer votre email');
            return;
        }
        if (!password.trim()) {
            setError('Veuillez entrer votre mot de passe');
            return;
        }

        setLoading(true);
        try {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password: password.trim(),
            });

            if (signInError) {
                if (signInError.message === 'Email not confirmed') {
                    router.push({
                        pathname: '/onboarding/reVerifEmail',
                        params: {
                            email: email.trim(),
                        }
                    });
                }
                setError(signInError.message);
                setLoading(false);
                return;
            }

            // chercher si le user existe dans la table "profiles"
            if (data.user) {
                const { data: profileData, error: profileError } = await supabase
                    .from('Profiles')
                    .select('*')
                    .eq('id', data.user.id)
                    .single();

                // if (profileError) {
                //     console.error('Erreur lors de la récupération du profil:', profileError);
                //     setError('Erreur lors de la récupération du profil. Veuillez réessayer.');
                //     setLoading(false);
                //     return;
                // }

                if (!profileData) {
                    console.log('Aucun profil trouvé pour cet utilisateur, création en cours...');
                    console.log('Données utilisateur:', data.user);
                    
                    // créer le profil
                    const { error: createProfileError } = await supabase
                        .from('Profiles')
                        .insert({
                            id: data.user.id,
                            email: data.user.email,
                            name : data.user.user_metadata.name
                        });

                    if (createProfileError) {
                        console.error('Erreur lors de la création du profil:', createProfileError);
                        setError('Erreur lors de la création du profil. Veuillez réessayer.');
                        setLoading(false);
                        return;
                    }
                    setLoading(false);
                }

                router.replace('/');
            }
        } catch (err: any) {
            setError(err.message || 'Erreur de connexion. Veuillez réessayer.');
            setLoading(false);
        }
    };

    const handleBackPress = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    };

    return (
        <Pressable
            style={styles.content}
            onPress={() => Keyboard.dismiss()}
        >
            {/* Header */}
            <Animated.View
                entering={FadeIn.springify().delay(1500).duration(1500)}
                exiting={FadeOut.springify()}
                style={styles.headerContainer}
            >
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleBackPress}
                >
                    <Image
                        style={{ width: 24, height: 24 }}
                        source={require('../../assets/images/dark/cancel.png')}
                    />
                </TouchableOpacity>
            </Animated.View>

            {/* Form Container */}
            <View style={styles.formContainer}>
                <Animated.View
                    entering={FadeInUp.springify().delay(500).duration(1500)}
                    exiting={FadeOutDown.springify()}
                >
                    <Text style={[styles.title, { color: colors.text }]}>Bienvenue</Text>
                </Animated.View>

                <Animated.View
                    entering={FadeInUp.springify().delay(800).duration(1500)}
                    exiting={FadeOutDown.springify()}
                    style={styles.inputContainer}
                >
                    <SimpleInput
                        placeholder="Email"
                        placeholderTextColor={colors.textSecondary}
                        value={email}
                        onChangeText={setEmail}
                        center
                        scale="large"
                    />
                </Animated.View>

                <Animated.View
                    entering={FadeInUp.springify().delay(1100).duration(1500)}
                    exiting={FadeOutDown.springify()}
                    style={styles.inputContainer}
                >
                    <SimpleInput
                        placeholder="Mot de passe"
                        placeholderTextColor={colors.textSecondary}
                        value={password}
                        onChangeText={setPassword}
                        center
                        scale="large"
                        password
                    />
                </Animated.View>

                {error ? (
                    <Animated.Text
                        entering={FadeInUp.springify()}
                        exiting={FadeOut.springify()}
                        style={[styles.errorText, { color: colors.danger }]}
                    >
                        {error}
                    </Animated.Text>
                ) : null}
            </View>

            {/* Footer */}
            <Animated.View
                style={styles.buttonSection}
                entering={FadeInUp.springify().delay(1500).duration(1000)}
                exiting={FadeOutDown.springify().delay(100).duration(1500)}
            >
                <PrimaryButton
                    title={loading ? 'Connexion...' : 'Se connecter'}
                    size="L"
                    onPress={handleLogin}
                    disabled={loading}
                />

                <TouchableOpacity onPress={() => router.push('/onboarding/register')}>
                    <Text style={[styles.footerLink, { color: colors.actionButton }]}>
                        Pas encore de compte ? S'inscrire
                    </Text>
                </TouchableOpacity>
            </Animated.View>
        </Pressable>
    );
}

const createStyles = (colors: any) =>
    StyleSheet.create({
        content: {
            width: '100%',
            height: '100%',
            paddingHorizontal: 23,
            paddingVertical: 23,
            backgroundColor: colors.background,
        },
        headerContainer: {
            position: 'absolute',
            width: '100%',
            top: 70,
            alignSelf: 'center',
            zIndex: 3,
            alignItems: 'flex-start',
        },
        backButton: {
            height: 30,
            width: 30,
            borderRadius: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
        },
        title: {
            fontSize: 55,
            fontFamily: 'Satoshi-Black',
            fontWeight: '700',
        },
        subtitle: {
            fontSize: 16,
            fontWeight: '400',
        },
        formContainer: {
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            transform: [{ translateY: -100 }],
            alignItems: 'center',
            zIndex: 1,
        },
        inputContainer: {
            width: '90%',
            alignItems: 'center',
            marginTop: 10,
            marginHorizontal: 'auto',
        },
        textInput: {
            borderWidth: 1,
            borderRadius: 8,
            padding: 12,
            width: '80%',
            height: 60,
            textAlign: 'center',
            fontSize: 18,
            fontWeight: '600',
            zIndex: 1,
        },
        errorText: {
            fontSize: 12,
            fontWeight: '500',
            marginTop: 8,
            textAlign: 'center',
            zIndex: 0,
        },
        buttonSection: {
            zIndex: 2,
            position: 'absolute',
            bottom: 50,
            width: '90%',
            alignSelf: 'center',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
        },
        validateButton: {
            height: 70,
            width: '80%',
            borderRadius: 100,
            position: 'relative',
            left: 0,
            alignItems: 'center',
            justifyContent: 'center',
            alignSelf: 'center',
        },
        validateButtonText: {
            fontSize: 20,
            fontWeight: '600',
            fontFamily: 'Satoshi-Bold',
        },
        footerLink: {
            fontSize: 14,
            fontWeight: '600',
            textDecorationLine: 'underline',
            textAlign: 'center',
        },
    });
