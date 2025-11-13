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
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.content}>
                {/* Header Section */}
                <View style={styles.headerSection}>
                    <View style={styles.animationContainer}>
                        <LottieView
                            source={require("../../assets/animations/Logo.json")}
                            autoPlay
                            loop={false}
                            style={styles.lottieAnimation}
                        />
                    </View>
                    <Text style={[styles.appTagline, { color: colors.textSecondary }]}>
                        Bienvenue dans Dun 👋
                    </Text>
                </View>

                {/* Illustration/Feature Section */}
                <View style={styles.middleSection}>
                    <View
                        style={[
                            styles.illustrationBox,
                            { backgroundColor: colors.card, borderColor: colors.border },
                        ]}
                    >
                        <Text style={[styles.featureIcon, { color: colors.button }]}>✓</Text>
                        <Text style={[styles.featureText, { color: colors.text }]}>
                            Organisez votre journée
                        </Text>
                    </View>

                    <View
                        style={[
                            styles.illustrationBox,
                            { backgroundColor: colors.card, borderColor: colors.border },
                        ]}
                    >
                        <Text style={[styles.featureIcon, { color: colors.button }]}>📅</Text>
                        <Text style={[styles.featureText, { color: colors.text }]}>
                            Planifiez facilement
                        </Text>
                    </View>

                    <View
                        style={[
                            styles.illustrationBox,
                            { backgroundColor: colors.card, borderColor: colors.border },
                        ]}
                    >
                        <Text style={[styles.featureIcon, { color: colors.button }]}>🎯</Text>
                        <Text style={[styles.featureText, { color: colors.text }]}>
                            Atteignez vos objectifs
                        </Text>
                    </View>
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
        </SafeAreaView>
    );
}

const createStyles = (colors: any) =>
    StyleSheet.create({
        container: {
            flex: 1,
        },
        content: {
            flex: 1,
            paddingHorizontal: 20,
            paddingVertical: 20,
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
            marginBottom: 10,
        },
        animationContainer: {
            height: 150,
            justifyContent: 'center',
            alignItems: 'center',
        },

        lottieAnimation: {
            width: 100,
            aspectRatio: 1,
        },
    });
