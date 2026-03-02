import SimpleInput from '@/components/textInput';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SquircleButton } from 'expo-squircle-view';
import React, { useState } from 'react';
import {
    Keyboard,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
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
        console.log('Tentative de connexion avec email:', email);
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

                console.log('Utilisateur connecté:', data.user);

                const { data: profileData, error: profileError } = await supabase
                    .from('Profiles')
                    .select('*')
                    .eq('id', data.user.id)
                    .single();

                if (!profileData) {
                    console.log('Aucun profil trouvé pour cet utilisateur, création en cours...');
                    console.log('Données utilisateur:', data.user);

                    // créer le profil
                    const { error: createProfileError } = await supabase
                        .from('Profiles')
                        .insert({
                            id: data.user.id,
                            email: data.user.email,
                            name: data.user.user_metadata.name,
                        });

                    if (createProfileError) {
                        console.error('Erreur lors de la création du profil:', createProfileError);
                        setError('Erreur lors de la création du profil. Veuillez réessayer.');
                        setLoading(false);
                        return;
                    }
                    setLoading(false);
                    router.replace('/onboarding/tutorial');
                    return;
                }

                console.log('Profil trouvé:', profileData);
                if (profileData.hasName == false) {
                    console.log('Profil trouvé mais nom non défini, redirection vers le tutoriel pour compléter le profil.');
                    setLoading(false);
                    router.replace('/onboarding/tutorial');
                    return;
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
                        bold
                        fontSize="lg"
                        type="email-address"
                        cap='none'
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
                        bold
                        fontSize="lg"
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

                <Animated.View
                    entering={FadeInUp.springify().delay(1300).duration(1500)}
                    exiting={FadeOutDown.springify()}
                    style={{
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <SquircleButton
                        cornerSmoothing={100} // 0-100
                        preserveSmoothing={true} // false matches figma, true has more rounding
                        style={styles.squircleButton}
                        onPress={handleLogin}
                        disabled={loading}
                        backgroundColor={colors.actionButton}
                        activeOpacity={0.7}
                    >
                        <Text style={{
                            fontSize: 16,
                            fontFamily: 'Satoshi-Regular',
                            color: colors.background,
                        }}>
                            {loading ? 'Connexion...' : 'Se connecter'}
                        </Text>
                    </SquircleButton>
                </Animated.View>


            </View>
            <Animated.View
                entering={FadeInDown.springify().delay(200).duration(1500)}
                exiting={FadeOutDown.springify()}
                style={{ position: 'absolute', bottom: -50, width: '100%', height: 200, zIndex: 0, }}
            >
                <Image
                    style={{
                        width: "100%",
                        height: "100%",
                        alignSelf: 'center',
                    }}
                    source={require('../../assets/images/character/3.png')}
                    contentFit="contain"
                />
            </Animated.View>

        </Pressable>
    );
}

const createStyles = (colors: any) =>
    StyleSheet.create({
        content: {
            width: '100%',
            height: '100%',
            backgroundColor: colors.background,
        },
        headerContainer: {
            position: 'absolute',
            width: '100%',
            top: 70,
            alignSelf: 'center',
            zIndex: 3,
            alignItems: 'flex-start',
            paddingHorizontal: 20,
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
            top: '42%',
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

        squircleButton: {
            width: '60%',
            height: 48,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            borderRadius: 18,
            borderWidth: 1.5,
            alignSelf: 'center',
            paddingHorizontal: 20,
            gap: 20,
            marginTop: 20,
        },
        validateButtonText: {
            fontSize: 20,
            fontWeight: '600',
            fontFamily: 'Satoshi-Bold',
        },

    });
