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
                    onPress: () => {
                        // Implémenter la logique de suppression
                        Alert.alert("Succès", "Toutes les tâches ont été supprimées");
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

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Paramètres</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
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
                    <TouchableOpacity
                        style={[styles.settingButton, { backgroundColor: colors.card }]}
                        onPress={toggleTheme}
                    >
                        <View style={styles.settingInfo}>
                            <Text style={[styles.settingLabel, { color: colors.text }]}>
                                {theme === 'light' ? '☀️ Mode clair' : '🌙 Mode sombre'}
                            </Text>
                            <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                                {theme === 'light' ? 'Passer au mode sombre' : 'Passer au mode clair'}
                            </Text>
                        </View>
                        <Text style={[styles.settingArrow, { color: colors.text }]}>›</Text>
                    </TouchableOpacity>
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

                <View style={styles.bottomSpacer} />
            </ScrollView>

            <TouchableOpacity
                onPress={() => router.back()}
                style={[styles.backButton, { backgroundColor: colors.button }]}
            >
                <Image
                    style={{ width: 34, height: 34 }}
                    source={getImageSource('home', theme)}
                ></Image>
            </TouchableOpacity>
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
        paddingBottom: 120,
    },

    section: {
        marginBottom: 40,
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
