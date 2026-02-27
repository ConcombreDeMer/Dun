import * as Google from 'expo-auth-session/providers/google';
import * as Haptics from "expo-haptics";
import { useRouter } from 'expo-router';
import { SquircleButton } from 'expo-squircle-view';
import { SymbolView } from "expo-symbols";
import React from 'react';
import {
    Dimensions,
    Image,
    Pressable,
    StyleSheet,
    View
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp,
    FadeOutDown,
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';
import { useTheme } from '../../lib/ThemeContext';
import { supabase } from '../../lib/supabase';


export default function StartScreen() {
    const router = useRouter();
    const { colors, theme } = useTheme();
    const styles = createStyles(colors);
    const LottieView = require("lottie-react-native").default;
    const screenWidth = React.useState(Dimensions.get('window').width)[0];
    const screenHeight = React.useState(Dimensions.get('window').height)[0];

    const scale = useSharedValue(0.8);
    const opacity = useSharedValue(0);
    const authButtonsX = useSharedValue(0);
    const registerButtonsX = useSharedValue(screenWidth);
    const [error, setError] = React.useState('');

    const authButtonsAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: authButtonsX.value }],
        };
    });

    const registerButtonsAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: registerButtonsX.value }],
        };
    });

    const goToRegister = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push('/onboarding/register');
    };

    const goToEmail = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        authButtonsX.value = withSpring(-screenWidth);
        registerButtonsX.value = withSpring(0);
    }

    const goBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        authButtonsX.value = withSpring(0);
        registerButtonsX.value = withSpring(screenWidth);
    }

    const [request, response, promptAsync] = Google.useAuthRequest({
        clientId: '655132375234-u8q4aig0tprhb7m8a4e5r2jn42nvo7ne.apps.googleusercontent.com',
        // ...
    });

    const handleGoogleSignIn = async () => {
        const result = await promptAsync();

        if (result?.type === 'success' && result.authentication?.idToken) {
            const { idToken } = result.authentication;

            const { data, error } = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: idToken,
            });

            if (!error && data.user) {
                // Créer le profil si nécessaire
                const { data: profileData } = await supabase
                    .from('Profiles')
                    .select('*')
                    .eq('id', data.user.id)
                    .single();

                if (!profileData) {
                    await supabase
                        .from('Profiles')
                        .insert({
                            id: data.user.id,
                            email: data.user.email,
                            name: data.user.user_metadata?.name || 'User'
                        });
                }

                router.replace('/');
            } else {
                setError(error?.message || 'Erreur de connexion Google');
            }
        }
    };

    return (
        <View
            style={[styles.content, { backgroundColor: colors.background }]}
        >

            <View
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 100,
                }}
            >
                <Animated.Text
                    style={{
                        fontSize: 60,
                        fontFamily: 'Satoshi-Black',
                        color: colors.text,
                        textAlign: 'center',
                        letterSpacing: -2,
                    }}
                    entering={FadeInUp.springify().delay(3000).duration(1000)}
                    exiting={FadeOutDown.springify().duration(500)}
                >
                    Dun.
                </Animated.Text>
                <Animated.Text
                    style={{
                        fontSize: 24,
                        fontFamily: 'Satoshi-Bold',
                        color: colors.textSecondary,
                        textAlign: 'center',
                        width: '50%',
                        lineHeight: 26,

                    }}
                    entering={FadeInUp.springify().delay(3000).duration(1000)}
                    exiting={FadeOutDown.springify().delay(100).duration(500)}
                >
                    Prend le contrôle de tes journées
                </Animated.Text>
            </View>

            <View
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 20,
                    position: 'absolute',
                    zIndex: 1,
                    top: '20%',
                    left: 0,
                    right: 0,
                    height: '50%',

                }}
            >
                <Animated.View
                    style={styles.imageContainer}
                    entering={FadeInUp.springify().delay(1000).duration(3000)}
                    exiting={FadeOutDown.springify().duration(500)}
                >
                    <Image
                        source={require('@/assets/images/character/1.png')}
                        style={styles.characterImage}
                        resizeMode="contain"
                    />
                </Animated.View>

                <Animated.View
                    style={[styles.imageContainer, { marginTop: 300 }]}
                    entering={FadeInDown.springify().delay(1000).duration(3000)}
                    exiting={FadeOutDown.springify().duration(500)}
                >
                    <Image
                        source={require('@/assets/images/character/0.png')}
                        style={styles.characterImage}
                        resizeMode="contain"
                    />
                </Animated.View>

            </View>





            <Animated.View
                style={styles.buttonSection}
                entering={FadeInDown.springify().delay(3000).duration(1500)}
                exiting={FadeOutDown.springify().duration(500)}

            >
                {/* <View style={styles.pin}>
                    <Text>~ 30 sec</Text>
                </View>

                <PrimaryButton
                    title="Créer un compte"
                    onPress={goToRegister}
                />

                <PrimaryButton
                    title="Se connecter"
                    onPress={() => router.push('/onboarding/login')}
                    type="reverse"
                />

                <Text style={[styles.footerInfo, { color: colors.textSecondary }]}>
                    Aucune donnée personnelle ne sera partagée
                </Text> */}

                <Animated.View
                    style={[
                        {
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: 12,
                        },
                        authButtonsAnimatedStyle,
                    ]}
                >

                    <SquircleButton
                        cornerSmoothing={100} // 0-100
                        preserveSmoothing={true} // false matches figma, true has more rounding
                        style={[styles.squircleButton, { borderColor: "black", backgroundColor: "transparent" }]}
                        onPress={goToEmail}

                    >
                        <SymbolView
                            name="envelope.fill"
                            style={{ height: "90%" }}
                            type="palette"
                            tintColor="black"
                        />

                        <Animated.Text
                            style={{
                                fontSize: 16,
                                fontFamily: 'Satoshi-Medium',
                                color: colors.text,
                            }}
                        >
                            Continuer avec un email
                        </Animated.Text>
                    </SquircleButton>

                    <SquircleButton
                        cornerSmoothing={100} // 0-100
                        preserveSmoothing={true} // false matches figma, true has more rounding
                        style={[styles.squircleButton, { borderColor: "black", backgroundColor: "black" }]}
                    >
                        <SymbolView
                            name="applelogo"
                            style={{ height: "90%" }}
                            type="palette"
                            tintColor="white"
                        />

                        <Animated.Text
                            style={{
                                fontSize: 16,
                                fontFamily: 'Satoshi-Medium',
                                color: "white",
                            }}
                        >
                            Continuer avec Apple
                        </Animated.Text>
                    </SquircleButton>

                    <SquircleButton
                        cornerSmoothing={100} // 0-100
                        preserveSmoothing={true} // false matches figma, true has more rounding
                        style={[styles.squircleButton, { borderColor: "#C9C9C9", backgroundColor: "#d8d8d8" }]}
                        onPress={handleGoogleSignIn}
                    >
                        <Image
                            source={require('@/assets/images/google.png')}
                            style={{ height: 30, width: 30 }}
                            resizeMode="cover"
                        >

                        </Image>

                        <Animated.Text
                            style={{
                                fontSize: 16,
                                fontFamily: 'Satoshi-Medium',
                                color: colors.text,
                            }}
                        >
                            Continuer avec Google
                        </Animated.Text>
                    </SquircleButton>
                </Animated.View>

                <Animated.View
                    style={[
                        {
                            display: 'flex',
                            flexDirection: 'row',
                            justifyContent: 'center',
                            alignItems: 'center',
                            position: 'absolute',
                            bottom: 0,
                            marginHorizontal: 20,
                            width: '90%',
                        },
                        registerButtonsAnimatedStyle,
                    ]}
                >
                    <Pressable
                        onPress={goBack}
                        style={{
                            position: 'absolute',
                            left: "10%",
                            top: -44,
                            display: 'flex',
                            flexDirection: 'row',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: 4,
                            borderRadius: 20,
                            borderWidth: 1.5,
                            borderColor: colors.textSecondary,
                            width: 30,
                            height: 30,
                        }}
                    >
                        <SymbolView
                            name="chevron.left"
                            type="palette"
                            tintColor={colors.textSecondary}
                            style={{ width: 18, height: 18 }}
                        />
                    </Pressable>

                    <View
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: 12,
                            width: '100%',
                        }}
                    >
                        <SquircleButton
                            cornerSmoothing={100} // 0-100
                            preserveSmoothing={true} // false matches figma, true has more rounding
                            style={[styles.squircleButton, { borderColor: "black", backgroundColor: "black" }]}
                            onPress={goToRegister}

                        >

                            <Animated.Text
                                style={{
                                    fontSize: 16,
                                    fontFamily: 'Satoshi-Medium',
                                    color: "white",
                                }}
                            >
                                Créer un compte
                            </Animated.Text>
                        </SquircleButton>

                        <SquircleButton
                            cornerSmoothing={100} // 0-100
                            preserveSmoothing={true} // false matches figma, true has more rounding
                            style={[styles.squircleButton, { borderColor: "black", backgroundColor: "transparent" }]}
                            onPress={() => router.push('/onboarding/login')}

                        >
                            <Animated.Text
                                style={{
                                    fontSize: 16,
                                    fontFamily: 'Satoshi-Medium',
                                    color: colors.text,
                                }}
                            >
                                Se connecter
                            </Animated.Text>
                        </SquircleButton>

                    </View>



                </Animated.View>
            </Animated.View>

        </View >
    );
}

const createStyles = (colors: any) =>
    StyleSheet.create({

        squircleButton: {
            width: '80%',
            height: 48,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            borderRadius: 18,
            borderWidth: 1.5,
            alignSelf: 'center',
            paddingHorizontal: 20,
            gap: 20,
        },


        content: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
        },

        buttonSection: {
            zIndex: 2,
            position: 'absolute',
            bottom: 50,
            width: '90%',
            alignSelf: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
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
        animationContainer: {
            height: '100%',
            width: '100%',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 0,
            position: 'absolute',
        },

        lottieAnimation: {
            width: '100%',
            height: '100%',
        },

        imageContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            marginVertical: 40,
            position: 'absolute',
        },

        characterImage: {
            width: 200,
            height: 200,
        },

    });
