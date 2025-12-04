import { useRouter } from "expo-router";
import {
    Text,
    View,
    TouchableOpacity,
    Alert,
    StyleSheet,
    Image,
    ScrollView,
} from "react-native";
import { useState, useEffect } from "react";
import { useTheme } from "../../lib/ThemeContext";
import { getImageSource } from "../../lib/imageHelper";
import { supabase } from "../../lib/supabase";
import PrimaryButton from "@/components/primaryButton";
import Headline from "@/components/headline";
import NavItem from "@/components/navItem";
import SettingItem from "@/components/settingItem";

export default function Account() {
    const router = useRouter();
    const { theme, colors } = useTheme();
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email) {
                setUserEmail(user.email);
            }
        } catch (error) {
            console.error("Erreur lors de la récupération des données utilisateur:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleChangePassword = () => {
        Alert.alert(
            "Changer le mot de passe",
            "Vous recevrez un email pour réinitialiser votre mot de passe.",
            [
                {
                    text: "Annuler",
                    onPress: () => { },
                    style: "cancel",
                },
                {
                    text: "Envoyer",
                    onPress: async () => {
                        try {
                            const { error } = await supabase.auth.resetPasswordForEmail(userEmail || "");
                            if (error) throw error;
                            Alert.alert("Succès", "Email de réinitialisation envoyé");
                        } catch (error) {
                            console.error("Erreur:", error);
                            Alert.alert("Erreur", "Impossible d'envoyer l'email");
                        }
                    },
                },
            ]
        );
    };

    const handleLogout = () => {
        Alert.alert(
            "Déconnexion",
            "Êtes-vous sûr de vouloir vous déconnecter ?",
            [
                {
                    text: "Annuler",
                    onPress: () => { },
                    style: "cancel",
                },
                {
                    text: "Déconnecter",
                    onPress: async () => {
                        try {
                            const { error } = await supabase.auth.signOut();
                            if (error) throw error;
                            router.replace('/onboarding/start');
                        } catch (error) {
                            console.error("Erreur:", error);
                            Alert.alert("Erreur", "Impossible de se déconnecter");
                        }
                    },
                    style: "destructive",
                },
            ]
        );
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            "Supprimer le compte",
            "Cette action est irréversible. Toutes vos données seront supprimées.",
            [
                {
                    text: "Annuler",
                    onPress: () => { },
                    style: "cancel",
                },
                {
                    text: "Supprimer",
                    onPress: async () => {
                        try {
                            // Supprimer les tâches d'abord
                            const { error: tasksError } = await supabase
                                .from("Tasks")
                                .delete()
                                .neq("id", 0);

                            if (tasksError) throw tasksError;

                            // Supprimer le compte
                            const { error: deleteError } = await supabase.rpc(
                                "delete_user"
                            );

                            if (deleteError) throw deleteError;

                            router.replace('/onboarding/start');
                            Alert.alert("Succès", "Compte supprimé");
                        } catch (error) {
                            console.error("Erreur:", error);
                            Alert.alert("Erreur", "Impossible de supprimer le compte");
                        }
                    },
                    style: "destructive",
                },
            ]
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Headline title="Compte" subtitle="Gérer votre compte" />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        Profil
                    </Text>
                    <View
                        style={[
                            styles.profileCard,
                            { backgroundColor: colors.card },
                        ]}
                    >
                        <View style={styles.avatarContainer}>
                            <Text style={styles.avatar}>
                                {userEmail?.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <View style={styles.profileInfo}>
                            <Text style={[styles.profileEmail, { color: colors.text }]}>
                                {userEmail || "Chargement..."}
                            </Text>
                            <Text
                                style={[
                                    styles.profileStatus,
                                    { color: colors.textSecondary },
                                ]}
                            >
                                Compte actif
                            </Text>
                        </View>
                    </View>
                </View>


                <SettingItem image="password" title="Changer le mot de passe" onPress={handleChangePassword}/>
                <SettingItem image="logout" title="Se déconnecter" type="danger" onPress={handleLogout}/>
                <SettingItem image="dead" title="Supprimer le compte" type="danger" onPress={handleDeleteAccount}/>

                
            </ScrollView>

            <PrimaryButton
                style={{ position: "absolute", bottom: 23, right: 23 }}
                image="back"
                size="XS"
                onPress={() => router.back()}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingLeft: 20,
        paddingRight: 20,
        paddingTop: 60,
        backgroundColor: "#fff",
    },

    scrollContent: {
        marginTop: 20,
        paddingBottom: 120,
        gap: 24,
    },

    section: {
        gap: 12,
    },

    sectionTitle: {
        fontSize: 14,
        fontWeight: "600",
        fontFamily: "Satoshi-Bold",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },

    profileCard: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 12,
        padding: 16,
        gap: 16,
    },

    avatarContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#000",
        alignItems: "center",
        justifyContent: "center",
    },

    avatar: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#fff",
        fontFamily: "Satoshi-Bold",
    },

    profileInfo: {
        flex: 1,
    },

    profileEmail: {
        fontSize: 16,
        fontWeight: "600",
        fontFamily: "Satoshi-Bold",
        marginBottom: 4,
    },

    profileStatus: {
        fontSize: 13,
        fontFamily: "Satoshi-Regular",
    },

    settingButton: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderRadius: 12,
        padding: 16,
        height: 64,
    },

    buttonLabel: {
        fontSize: 16,
        fontWeight: "600",
        fontFamily: "Satoshi-Bold",
    },
});
