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




                <NavItem image="profile" title="Compte" onPress={() => router.push("/settings/account")}/>
                <NavItem image="notification" title="Notifications" onPress={() => router.push("/settings/notifications")}/>
                <NavItem image="display" title="Affichage" onPress={() => router.push("/settings/display")}/>
                <SwitchItem image="display" title="Mode sombre" event={toggleTheme} currentValue={theme === 'dark'} />





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
