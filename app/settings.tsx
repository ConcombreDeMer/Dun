import { useRouter } from "expo-router";
import {
    Text,
    View,
    TouchableOpacity,
    Alert,
    StyleSheet,
    Image,
    ScrollView,
    Switch,
} from "react-native";
import { useState } from "react";
import { useTheme } from "../lib/ThemeContext";
import { getImageSource } from "../lib/imageHelper";
import { supabase } from "../lib/supabase";
import { taskEmitter } from "../lib/eventEmitter";
import PrimaryButton from "@/components/primaryButton";
import Headline from "@/components/headline";
import NavItem from "@/components/navItem";
import SwitchItem from "@/components/switchItem";

export default function Settings() {
    const router = useRouter();
    const { theme, toggleTheme, colors } = useTheme();
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);


    const handleClearAllTasks = () => {
        Alert.alert(
            "Supprimer toutes les tâches",
            "Êtes-vous sûr de vouloir supprimer toutes les tâches ? Cette action est irréversible.",
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
                            const { error } = await supabase
                                .from("Tasks")
                                .delete()
                                .neq("id", 0); // Supprime tous les enregistrements

                            if (error) {
                                console.error("Erreur lors de la suppression des tâches:", error);
                                Alert.alert("Erreur", "Impossible de supprimer les tâches");
                                return;
                            }

                            // Émettre l'événement de suppression
                            taskEmitter.emit("taskDeleted");
                            Alert.alert("Succès", "Toutes les tâches ont été supprimées");
                        } catch (error) {
                            console.error("Erreur:", error);
                            Alert.alert("Erreur", "Une erreur s'est produite");
                        }
                    },
                    style: "destructive",
                },
            ]
        );
    };

    const handleAbout = () => {
        Alert.alert(
            "À propos",
            "Dun - Gestionnaire de tâches\nVersion 1.0.0\n\nUne application simple pour gérer vos tâches quotidiennes."
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

                            if (error) {
                                console.error("Erreur lors de la déconnexion:", error);
                                Alert.alert("Erreur", "Impossible de se déconnecter");
                                return;
                            }

                            // Rediriger vers le login
                            router.replace('/onboarding/start');
                        } catch (error) {
                            console.error("Erreur:", error);
                            Alert.alert("Erreur", "Une erreur s'est produite");
                        }
                    },
                    style: "destructive",
                },
            ]
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Headline title="Paramètres" subtitle="de l'application" />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >




                <NavItem image="profile" title="Compte" />
                <NavItem image="notification" title="Notifications" />
                <NavItem image="display" title="Affichage" />
                <SwitchItem image="display" title="Mode sombre" event={toggleTheme} currentValue={theme === 'dark'} />







                {/* Section Notifications */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Notifications</Text>
                    <View style={[styles.settingItem, { backgroundColor: colors.card }]}>
                        <View style={styles.settingInfo}>
                            <Text style={[styles.settingLabel, { color: colors.text }]}>
                                Activer les notifications
                            </Text>
                            <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                                Recevez des rappels pour vos tâches
                            </Text>
                        </View>
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={setNotificationsEnabled}
                            trackColor={{ false: "#ccc", true: "#000" }}
                            thumbColor="#fff"
                        />
                    </View>
                </View>

                {/* Section Apparence */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Apparence</Text>
                    <View style={[styles.settingItem, { backgroundColor: colors.card }]}>
                        <View style={styles.settingInfo}>
                            <Text style={[styles.settingLabel, { color: colors.text }]}>
                                {theme === 'light' ? '☀️ Mode clair' : '🌙 Mode sombre'}
                            </Text>
                            <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                                {theme === 'light' ? 'Passer au mode sombre' : 'Passer au mode clair'}
                            </Text>
                        </View>
                        <Switch
                            value={theme === 'dark'}
                            onValueChange={toggleTheme}
                            trackColor={{ false: "#ccc", true: "#000" }}
                            thumbColor="#fff"
                        />
                    </View>
                </View>

                {/* Section Données */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Données</Text>
                    <TouchableOpacity
                        style={[styles.settingButton, { backgroundColor: colors.card }]}
                        onPress={handleClearAllTasks}
                    >
                        <View style={styles.settingInfo}>
                            <Text style={[styles.settingLabel, { color: colors.danger }]}>
                                Supprimer toutes les tâches
                            </Text>
                            <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                                Cette action est irréversible
                            </Text>
                        </View>
                        <Text style={[styles.settingArrow, { color: colors.danger }]}>›</Text>
                    </TouchableOpacity>
                </View>

                {/* Section À propos */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>À propos</Text>
                    <TouchableOpacity
                        style={[styles.settingButton, { backgroundColor: colors.card }]}
                        onPress={handleAbout}
                    >
                        <View style={styles.settingInfo}>
                            <Text style={[styles.settingLabel, { color: colors.text }]}>
                                À propos de Dun
                            </Text>
                            <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                                Version 1.0.0
                            </Text>
                        </View>
                        <Text style={[styles.settingArrow, { color: colors.text }]}>›</Text>
                    </TouchableOpacity>
                </View>

                {/* Section Compte */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Compte</Text>
                    <TouchableOpacity
                        style={[styles.settingButton, { backgroundColor: colors.card }]}
                        onPress={handleLogout}
                    >
                        <View style={styles.settingInfo}>
                            <Text style={[styles.settingLabel, { color: colors.danger }]}>
                                Déconnexion
                            </Text>
                            <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                                Quitter votre compte
                            </Text>
                        </View>
                        <Text style={[styles.settingArrow, { color: colors.danger }]}>›</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.bottomSpacer} />
            </ScrollView>
            {/* 
            <TouchableOpacity
                onPress={() => router.back()}
                style={[styles.backButton, { backgroundColor: colors.actionButton }]}
            >
                <Image
                    style={{ width: 34, height: 34 }}
                    source={getImageSource('home', theme)}
                ></Image>
            </TouchableOpacity> */}


            <PrimaryButton
                style={{ position: "absolute", bottom: 23, right: 23 }}
                image="home"
                size="small"
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
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        backgroundColor: "#fff",
    },

    header: {
        marginBottom: 30,
    },

    title: {
        fontSize: 55,
        fontFamily: 'Satoshi-Black',
    },

    scrollContent: {
        marginTop: 20,
        paddingBottom: 120,
        display: "flex",
        flexDirection: "column",
        gap: 12,
    },

    section: {
    },

    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 15,
        color: "#000",
        fontFamily: "Satoshi-Bold",
    },

    settingItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#f5f5f5",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },

    settingButton: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#f5f5f5",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },

    settingInfo: {
        flex: 1,
    },

    settingLabel: {
        fontSize: 16,
        fontWeight: "600",
        color: "#000",
        marginBottom: 4,
    },

    settingDescription: {
        fontSize: 13,
        color: "#999",
        fontWeight: "500",
    },

    settingArrow: {
        fontSize: 24,
        color: "#000",
        marginLeft: 12,
    },

    bottomSpacer: {
        height: 40,
    },

    backButton: {
        alignItems: "center",
        justifyContent: "center",
        height: 70,
        width: 70,
        borderRadius: 100,
        backgroundColor: "#000000ff",
        position: "absolute",
        bottom: 30,
        right: 30,
    },
});
