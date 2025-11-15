import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../lib/ThemeContext';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
    const router = useRouter();
    const { colors } = useTheme();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
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
                setError(signInError.message);
                setLoading(false);
                return;
            }

            if (data.user) {
                router.replace('/');
            }
        } catch (err: any) {
            setError(err.message || 'Erreur de connexion. Veuillez réessayer.');
            setLoading(false);
        }
    };

    const styles = createStyles(colors);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                {/* Header */}
                <View style={styles.headerContainer}>
                    <Text style={[styles.title, { color: colors.text }]}>Bienvenue</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Connectez-vous à votre compte
                    </Text>
                </View>

                {/* Form */}
                <View style={styles.formContainer}>
                    {/* Email Input */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Email</Text>
                        <TextInput
                            style={[
                                styles.input,
                                {
                                    backgroundColor: colors.input,
                                    color: colors.text,
                                    borderColor: colors.border,
                                },
                            ]}
                            placeholder="votre@email.com"
                            placeholderTextColor={colors.inputPlaceholder}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={email}
                            onChangeText={setEmail}
                            editable={!loading}
                        />
                    </View>

                    {/* Password Input */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Mot de passe</Text>
                        <TextInput
                            style={[
                                styles.input,
                                {
                                    backgroundColor: colors.input,
                                    color: colors.text,
                                    borderColor: colors.border,
                                },
                            ]}
                            placeholder="••••••••"
                            placeholderTextColor={colors.inputPlaceholder}
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                            editable={!loading}
                        />
                    </View>

                    {/* Error Message */}
                    {error ? (
                        <Text style={[styles.errorText, { color: colors.danger }]}>
                            {error}
                        </Text>
                    ) : null}

                    {/* Login Button */}
                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: colors.button }]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={colors.buttonText} />
                        ) : (
                            <Text style={[styles.buttonText, { color: colors.buttonText }]}>
                                Se connecter
                            </Text>
                        )}
                    </TouchableOpacity>

                    {/* Forgot Password Link */}
                    <TouchableOpacity>
                        <Text style={[styles.link, { color: colors.textSecondary }]}>
                            Mot de passe oublié ?
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <View style={styles.footerContainer}>
                    <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                        Pas encore de compte ?{' '}
                    </Text>
                    <TouchableOpacity onPress={() => router.push('/onboarding/register')}>
                        <Text style={[styles.footerLink, { color: colors.button }]}>
                            S'inscrire
                        </Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
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
            justifyContent: 'space-between',
            paddingVertical: 20,
        },
        headerContainer: {
            marginTop: 40,
            marginBottom: 40,
        },
        title: {
            fontSize: 32,
            fontWeight: '700',
            marginBottom: 8,
        },
        subtitle: {
            fontSize: 16,
            fontWeight: '400',
        },
        formContainer: {
            marginVertical: 20,
        },
        inputGroup: {
            marginBottom: 20,
        },
        label: {
            fontSize: 14,
            fontWeight: '600',
            marginBottom: 8,
        },
        input: {
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 8,
            borderWidth: 1,
            fontSize: 16,
        },
        errorText: {
            fontSize: 14,
            marginBottom: 16,
            marginTop: -8,
        },
        button: {
            paddingVertical: 14,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 8,
        },
        buttonText: {
            fontSize: 16,
            fontWeight: '600',
        },
        link: {
            fontSize: 14,
            textAlign: 'center',
            marginTop: 16,
            textDecorationLine: 'underline',
        },
        footerContainer: {
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 20,
        },
        footerText: {
            fontSize: 14,
        },
        footerLink: {
            fontSize: 14,
            fontWeight: '600',
            textDecorationLine: 'underline',
        },
    });
