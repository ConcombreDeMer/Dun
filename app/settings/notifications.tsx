import Headline from "@/components/headline";
import SecondaryButton from "@/components/secondaryButton";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    Image,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { useTheme } from "../../lib/ThemeContext";
import { getImageSource } from "../../lib/imageHelper";

interface NotificationSettings {
    taskReminders: boolean;
    dailySummary: boolean;
    completionCelebration: boolean;
    dueTodayNotification: boolean;
    weeklyReport: boolean;
}

export default function Notifications() {
    const router = useRouter();
    const { theme, colors } = useTheme();
    const [settings, setSettings] = useState<NotificationSettings>({
        taskReminders: true,
        dailySummary: true,
        completionCelebration: true,
        dueTodayNotification: true,
        weeklyReport: false,
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const saved = await AsyncStorage.getItem("notificationSettings");
            if (saved) {
                setSettings(JSON.parse(saved));
            }
        } catch (error) {
            console.error("Erreur lors du chargement des paramètres:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const saveSettings = async (newSettings: NotificationSettings) => {
        try {
            await AsyncStorage.setItem(
                "notificationSettings",
                JSON.stringify(newSettings)
            );
            setSettings(newSettings);
        } catch (error) {
            console.error("Erreur lors de la sauvegarde des paramètres:", error);
        }
    };

    const toggleSetting = (key: keyof NotificationSettings) => {
        const newSettings = {
            ...settings,
            [key]: !settings[key],
        };
        saveSettings(newSettings);
    };

    const handleEnableAll = () => {
        const newSettings: NotificationSettings = {
            taskReminders: true,
            dailySummary: true,
            completionCelebration: true,
            dueTodayNotification: true,
            weeklyReport: true,
        };
        saveSettings(newSettings);
    };

    const handleDisableAll = () => {
        const newSettings: NotificationSettings = {
            taskReminders: false,
            dailySummary: false,
            completionCelebration: false,
            dueTodayNotification: false,
            weeklyReport: false,
        };
        saveSettings(newSettings);
    };

    const NotificationToggleItem = ({
        title,
        description,
        icon,
        settingKey,
    }: {
        title: string;
        description: string;
        icon: string;
        settingKey: keyof NotificationSettings;
    }) => (
        <View
            style={[
                styles.notificationItem,
                { backgroundColor: colors.card },
            ]}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <Image
                    style={{ width: 26, height: 26, tintColor: colors.text }}
                    source={getImageSource(icon, theme)}
                />
                <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>
                        {title}
                    </Text>
                    <Text
                        style={[
                            styles.itemDescription,
                            { color: colors.textSecondary },
                        ]}
                    >
                        {description}
                    </Text>
                </View>
            </View>
            <Switch
                trackColor={{ false: "#ccc", true: "#000" }}
                thumbColor="#fff"
                onValueChange={() => toggleSetting(settingKey)}
                value={settings[settingKey]}
                style={{ alignSelf: 'center' }}
            />
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View
                style={{ marginBottom: 20, flexDirection: "row", alignItems: "center", gap: 20 }}
            >
                <SecondaryButton
                    onPress={() => router.back()}
                    image="back"
                />
                <Headline title="Notifications" subtitle="Gérer vos alertes" />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        Actions rapides
                    </Text>
                    <View style={styles.buttonGroup}>
                        <TouchableOpacity
                            onPress={handleEnableAll}
                            style={[
                                styles.quickButton,
                                { backgroundColor: colors.button },
                            ]}
                        >
                            <Text style={[styles.quickButtonText, { color: colors.buttonText }]}>
                                Activer tout
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleDisableAll}
                            style={[
                                styles.quickButton,
                                { backgroundColor: colors.card },
                            ]}
                        >
                            <Text style={[styles.quickButtonText, { color: colors.text }]}>
                                Désactiver tout
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Task Notifications */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        Tâches
                    </Text>
                    <NotificationToggleItem
                        title="Rappels des tâches"
                        description="Recevez des rappels pour vos tâches à faire"
                        icon="notification"
                        settingKey="taskReminders"
                    />
                    <NotificationToggleItem
                        title="Tâches dues aujourd'hui"
                        description="Alertes pour les tâches ayant la date limite d'aujourd'hui"
                        icon="calendar"
                        settingKey="dueTodayNotification"
                    />
                </View>

                {/* Summary Notifications */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        Résumés
                    </Text>
                    <NotificationToggleItem
                        title="Résumé quotidien"
                        description="Reçois un résumé de ta journée chaque soir"
                        icon="dashboard"
                        settingKey="dailySummary"
                    />
                    <NotificationToggleItem
                        title="Rapport hebdomadaire"
                        description="Aperçu de votre productivité hebdomadaire"
                        icon="chart"
                        settingKey="weeklyReport"
                    />
                </View>

                {/* Celebration Notifications */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        Récompenses
                    </Text>
                    <NotificationToggleItem
                        title="Célébration d'achèvement"
                        description="Félicitations quand vous complétez une tâche"
                        icon="star"
                        settingKey="completionCelebration"
                    />
                </View>

                {/* Info Section */}
                <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
                    <Image
                        style={{ width: 24, height: 24, tintColor: colors.text }}
                        source={getImageSource('info', theme)}
                    />
                    <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                        Les paramètres de notification sont stockés localement sur votre appareil.
                    </Text>
                </View>
            </ScrollView>

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

    buttonGroup: {
        flexDirection: "row",
        gap: 12,
    },

    quickButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        height: 50,
    },

    quickButtonText: {
        fontSize: 14,
        fontWeight: "600",
        fontFamily: "Satoshi-Bold",
    },

    notificationItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderRadius: 12,
        padding: 16,
        gap: 12,
        marginBottom: 12,
    },

    itemTitle: {
        fontSize: 16,
        fontWeight: "600",
        fontFamily: "Satoshi-Bold",
        marginBottom: 4,
    },

    itemDescription: {
        fontSize: 13,
        fontFamily: "Satoshi-Regular",
    },

    infoCard: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 12,
        padding: 16,
        gap: 12,
        marginTop: 12,
    },

    infoText: {
        fontSize: 13,
        fontFamily: "Satoshi-Regular",
        flex: 1,
        lineHeight: 18,
    },
});
