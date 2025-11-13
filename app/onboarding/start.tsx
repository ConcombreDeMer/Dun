import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../lib/ThemeContext';

const LottieView = require("lottie-react-native").default;


export default function StartScreen() {
    const router = useRouter();
    const { colors } = useTheme();

    const styles = createStyles(colors);

    return (
        <View style={styles.content}>
            <View style={styles.animationContainer}>
                <LottieView
                    source={require("../../assets/animations/Onboard.json")}
                    autoPlay
                    loop={false}
                    style={styles.lottieAnimation}
                />
            </View>
            {/* Button Section */}
            <View style={styles.buttonSection}>
                {/* Register Button */}
                <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: colors.actionButton }]}
                    onPress={() => router.push('/onboarding/register')}
                >
                    <Text style={[styles.primaryButtonText, { color: colors.buttonText }]}>
                        Créer un compte
                    </Text>
                </TouchableOpacity>

                {/* Login Button */}
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
            </View>

            {/* Footer Info */}
            <Text style={[styles.footerInfo, { color: colors.textSecondary }]}>
                Aucune donnée personnelle ne sera partagée
            </Text>
        </View>
    );
}

const createStyles = (colors: any) =>
    StyleSheet.create({
        container: {
            flex: 1,
        },
        content: {
            flex: 1,
            justifyContent: 'space-between',
        },
        headerSection: {
            marginTop: 40,
            marginBottom: 20,
            alignItems: 'center',
        },
        appName: {
            fontSize: 48,
            fontWeight: '700',
            marginBottom: 8,
        },
        appTagline: {
            fontSize: 16,
            fontWeight: '400',
            textAlign: 'center',
        },
        middleSection: {
            flex: 1,
            justifyContent: 'center',
            marginVertical: 40,
        },
        illustrationBox: {
            paddingVertical: 24,
            paddingHorizontal: 16,
            borderRadius: 12,
            marginBottom: 16,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
        },
        featureIcon: {
            fontSize: 28,
            marginRight: 12,
        },
        featureText: {
            fontSize: 16,
            fontWeight: '500',
            flex: 1,
        },
        buttonSection: {
            marginBottom: 30,
            zIndex: 2,
            position: 'absolute',
            bottom: 80,
            width: '90%',
            paddingHorizontal: 20,
            alignSelf: 'center',
        },
        primaryButton: {
            paddingVertical: 16,
            borderRadius: 8,
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
            borderRadius: 8,
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
            position: 'absolute',
            bottom: 40,
            width: '100%',
        },
        animationContainer: {
            height: '100%',
            width: '100%',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'red',
            zIndex: 0,
            position: 'absolute',
        },

        lottieAnimation: {
            width: '100%',
            height: '100%',
        },
    });
