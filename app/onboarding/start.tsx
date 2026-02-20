import PrimaryButton from '@/components/primaryButton';
import * as Haptics from "expo-haptics";
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Dimensions,
    Image,
    StyleSheet,
    Text,
    View
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp,
    FadeOutDown,
    useSharedValue
} from 'react-native-reanimated';
import { useTheme } from '../../lib/ThemeContext';


export default function StartScreen() {
    const router = useRouter();
    const { colors, theme } = useTheme();
    const styles = createStyles(colors);
    const LottieView = require("lottie-react-native").default;
    const screenWidth = React.useState(Dimensions.get('window').width)[0];
    const screenHeight = React.useState(Dimensions.get('window').height)[0];

    const scale = useSharedValue(0.8);
    const opacity = useSharedValue(0);


    const goToRegister = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push('/onboarding/register');
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
                <View style={styles.pin}>
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
                </Text>
            </Animated.View>

        </View >
    );
}

const createStyles = (colors: any) =>
    StyleSheet.create({
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
