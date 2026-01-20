import SecondaryButton from "@/components/secondaryButton";
import { useRouter } from "expo-router";
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PrimaryButton from "../../components/primaryButton";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/ThemeContext";


export default function ChangeEmail() {

    const { colors } = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    const [userData, setUserData] = useState<{ name: string; email: string }>({ name: '', email: '' });
    const [newEmail, setNewEmail] = useState<string>('');
    const [timeRemaining, setTimeRemaining] = useState<{ minutes: number; seconds: number }>({ minutes: 8, seconds: 35 });
    const [isResending, setIsResending] = useState(false);
    const [isExpired, setIsExpired] = useState(false);
    const router = useRouter();

    const fetchUserData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                console.log("user", user);
                setUserData(
                    {
                        name: user.user_metadata.name || '',
                        email: user.email || '',
                    }
                );
                if (user.new_email) {
                    setNewEmail(user.new_email);
                }
                if (user.email_change_sent_at) {
                    console.log("user.email_change_sent_at", user.email_change_sent_at);
                    getCountDownTime(user.email_change_sent_at);
                }
            }
        } catch (error) {
            console.error("Erreur lors de la récupération des données utilisateur:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const getCountDownTime = (date: string) => {
        // Parse la date ISO directement (convertie automatiquement en heure locale)
        const sentDate = new Date(date);

        // 1 heure d'expiration
        const expiryTime = new Date(sentDate.getTime() + 60 * 60 * 1000);

        // prendre le temps entre maintenant et expiryTime
        const now = new Date();
        const diff = expiryTime.getTime() - now.getTime();

        // calculer les minutes et secondes restantes
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeRemaining({ minutes, seconds });
    };

    useEffect(() => {
        if (timeRemaining.minutes <= 0 && timeRemaining.seconds <= 0) {
            setIsExpired(true);
        }
    }, [timeRemaining]);

    useEffect(() => {
        fetchUserData();
    }, []);


    // Timer countdown
    useEffect(() => {
        const interval = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev.seconds === 0) {
                    if (prev.minutes === 0) {
                        clearInterval(interval);
                        return { minutes: 0, seconds: 0 };
                    }
                    return { minutes: prev.minutes - 1, seconds: 59 };
                }
                return { ...prev, seconds: prev.seconds - 1 };
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const cancelEmailChange = async () => {
        try {
            await supabase.rpc("cancel_email_change");
            alert("Le changement d'email a été annulé.");
            fetchUserData();
        } catch (error) {
            console.error("Erreur lors de l'annulation du changement d'email :", error);
            alert("Une erreur est survenue lors de l'annulation du changement d'email.");
        }
        router.back();
    }

    const handleResend = async () => {
        setIsResending(true);
        try {
            // Resend confirmation emails
            // This would typically call your backend
        } catch (error) {
            console.error("Erreur lors du renvoi:", error);
        } finally {
            setIsResending(false);
        }
    };

    return (
        <View
            style={[styles.container, { backgroundColor: colors.background }]}
        >
            <View
                style={{position: 'absolute', top: 60, left: 20}}
            >
                <SecondaryButton
                    onPress={() => router.back()}
                    image="back"
                />
            </View>
            {/* Email Icon */}
            <View style={styles.iconContainer}>
                <Text style={styles.icon}>✉️</Text>
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: colors.text }]}>
                Un changement d'email
            </Text>

            {/* Subtitle */}
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                est en cours sur votre compte
            </Text>

            {/* Email Display Box */}
            <View style={[styles.emailBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {/* Old Email */}
                <View style={styles.emailSection}>
                    <Text style={[styles.emailLabel, { color: colors.textSecondary }]}>
                        Ancienne adresse mail
                    </Text>
                    <Text style={[styles.emailText, { color: colors.text }]}>
                        {userData.email}
                    </Text>
                </View>

                {/* Arrow */}
                <View style={styles.arrowContainer}>
                    <Text style={[styles.arrow, { color: colors.textSecondary }]}>↓</Text>
                </View>

                {/* New Email */}
                <View style={styles.emailSection}>
                    <Text style={[styles.emailLabel, { color: colors.textSecondary }]}>
                        Nouvelle adresse mail
                    </Text>
                    <Text style={[styles.emailText, { color: colors.text }]}>
                        {newEmail}
                    </Text>
                </View>
            </View>

            {/* Confirmation Message */}
            <Text style={[styles.confirmationText, { color: colors.textSecondary }]}>
                Afin de valider ce changement,{'\n'}
                2 emails de confirmation ont été envoyés{'\n'}
                à l'ancien et au nouvel email.
            </Text>

            {/* Awaiting Confirmation Button */}
            <TouchableOpacity
                style={[styles.awaitingButton, { backgroundColor: '#E8D4B0' }]}
                disabled
            >
                <Text style={styles.awaitingButtonText}>
                    En attente de confirmation
                </Text>
            </TouchableOpacity>

            {/* Cancel Link */}
            <View style={styles.cancelContainer}>
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
                    Si vous n'êtes pas à l'origine de ce changement,
                </Text>
                <Text
                    onPress={cancelEmailChange}
                    style={[styles.cancelLink, { color: colors.text }]}>
                    annulez le ici
                </Text>
            </View>


            {
                isExpired &&

                <Text style={[styles.confirmationText, { color: colors.danger }]}>
                    Le délai de confirmation a expiré.
                </Text>



            }

            {
                !isExpired &&
                < Text style={[styles.timerText, { color: colors.textSecondary }]}>
                    Les emails de confirmation expirent dans{'\n'}
                    {timeRemaining.minutes} minutes et {timeRemaining.seconds.toString().padStart(2, '0')} secondes
                </Text>
            }



            {/* Resend Button */}
            <PrimaryButton
                title="Renvoyer"
                onPress={handleResend}
                disabled={isResending}
                image='edit'
                style={styles.resendButton}
                size='M'
            />
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 60,
        display: 'flex',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 20,
        paddingTop: 40,
        paddingBottom: 40,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 10,
    },
    icon: {
        fontSize: 48,
    },
    title: {
        fontSize: 28,
        fontFamily: 'Satoshi-Bold',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 18,
        fontFamily: 'Satoshi-Regular',
        textAlign: 'center',
        marginBottom: 30,
    },
    emailBox: {
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        marginBottom: 30,
        alignItems: 'center',
        width: '80%',
    },
    emailSection: {
        alignItems: 'center',
        width: '100%',
    },
    emailLabel: {
        fontSize: 14,
        fontFamily: 'Satoshi-Regular',
        marginBottom: 6,
    },
    emailText: {
        fontSize: 18,
        fontFamily: 'Satoshi-Bold',
        textAlign: 'center',
    },
    arrowContainer: {
        marginVertical: 16,
    },
    arrow: {
        fontSize: 24,
    },
    confirmationText: {
        fontSize: 16,
        fontFamily: 'Satoshi-Regular',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 24,
    },
    awaitingButton: {
        width: '80%',
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    awaitingButtonText: {
        fontSize: 18,
        fontFamily: 'Satoshi-Regular',
        color: '#333333',
    },
    cancelContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: 30,
    },
    cancelText: {
        fontSize: 16,
        fontFamily: 'Satoshi-Regular',
        textAlign: 'center',
        lineHeight: 24,
    },
    cancelLink: {
        fontSize: 16,
        fontFamily: 'Satoshi-Bold',
        textDecorationLine: 'underline',
    },
    timerText: {
        fontSize: 14,
        fontFamily: 'Satoshi-Regular',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    resendButton: {
        marginBottom: 20,
    },
});