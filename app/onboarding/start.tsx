import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Keyboard,
    Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../lib/ThemeContext';
import { supabase } from '../../lib/supabase';
import Animated, {
    FadeIn,
    FadeOut,
    SlideInUp,
    SlideOutDown,
    ZoomIn,
    ZoomOut,
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    FadeInUp,
    FadeOutDown,
    FadeInDown,
} from 'react-native-reanimated';
import * as Haptics from "expo-haptics";
import AsyncStorage from '@react-native-async-storage/async-storage';


export default function StartScreen() {
    const router = useRouter();
    const { colors, theme } = useTheme();
    const styles = createStyles(colors);
    const LottieView = require("lottie-react-native").default;


    useEffect(() => {
        const checkEmail = async () => {
            console.log("Vérification de l'email dans le stockage local...");
            const email = await AsyncStorage.getItem('verif_email');
            if (email !== null) {
                console.log("Email non vérifié détecté, redirection vers la page de re-vérification.");
                router.replace('/onboarding/reVerifEmail');
            }
        };
        checkEmail();
    }, []);


    const goToRegister = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push('/onboarding/register');
    };


    return (
        <Pressable
            style={styles.content}
            onPress={() => Keyboard.dismiss()}
        >

            <Animated.View
                style={styles.animationContainer}
                entering={FadeIn.springify().duration(1500)}
                exiting={FadeOut.springify()}
            >
                <LottieView
                    source={require("../../assets/animations/Onboard.json")}
                    autoPlay
                    loop={false}
                    style={styles.lottieAnimation}
                />
            </Animated.View>

            <Animated.View
                style={styles.buttonSection}
                entering={FadeInUp.springify().delay(1500).duration(1500)}
                exiting={FadeOutDown.springify().delay(100).duration(500)}

            >
                <View style={styles.pin}>
                    <Text>~ 30 sec</Text>
                </View>
                <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: colors.actionButton }]}
                    onPress={goToRegister}>
                    <Text style={[styles.primaryButtonText, { color: colors.buttonText }]}>
                        Créer un compte
                    </Text>
                </TouchableOpacity>


                <TouchableOpacity
                    style={[
                        styles.secondaryButton,
                        { borderColor: colors.border, borderWidth: 1.5 },
                    ]}
                    onPress={() => router.push('/onboarding/login')}
                >
                    <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                        Se connecter
                    </Text>
                </TouchableOpacity>

                <Text style={[styles.footerInfo, { color: colors.textSecondary }]}>
                    Aucune donnée personnelle ne sera partagée
                </Text>
            </Animated.View>

        </Pressable >
    );
}

const createStyles = (colors: any) =>
    StyleSheet.create({
        content: {
            flex: 1,
            justifyContent: 'space-between',
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

    });
