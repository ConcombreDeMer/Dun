import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter, useSegments } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useTheme } from "../lib/ThemeContext";

export default function Navbar() {
    const { colors } = useTheme();
    const router = useRouter();
    const segments = useSegments();

    // Masquer la navbar si on est sur /settings/*
    const isSettingsSubroute = segments.length > 1 && segments[0] === "settings";
    if (isSettingsSubroute) {
        return null;
    }

    // Déterminer l'onglet actif basé sur le chemin actuel
    const getActiveTab = () => {
        if (segments[0] === "stats") return "stats";
        if (segments[0] === "settings") return "settings";
        if (segments[0] === "create-task") return "add";
        return "home";
    };

    const activeTab = getActiveTab();

    const handleNavigation = async (tab: string) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        switch (tab) {
            case "home":
                router.replace("/");
                break;
            case "stats":
                router.replace("/stats/general");
                break;
            case "add":
                router.push("/create-task");
                break;
            case "settings":
                router.replace("/settings");
                break;
        }
    };

    const tabs = [
        { name: "home", label: "Accueil", icon: "home" },
        { name: "stats", label: "Stats", icon: "stats-chart" },
        { name: "settings", label: "Paramètres", icon: "settings" },
    ];

    return (
        <>

            <View style={styles.background}>
                <View
                    style={styles.container}
                >
                    <View
                        style={[
                            styles.navbar,
                            { backgroundColor: colors.actionButton, borderColor: colors.border }
                        ]}
                    >
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.name;
                            return (
                                <TouchableOpacity
                                    key={tab.name}
                                    style={styles.tabButton}
                                    onPress={() => handleNavigation(tab.name)}
                                    activeOpacity={0.7}
                                    disabled={isActive}
                                >
                                    <Ionicons
                                        name={isActive ? tab.icon : (`${tab.icon}-outline` as any)}
                                        size={24}
                                        color={isActive ? "#FFFFFF" : colors.textSecondary}
                                    />
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    <TouchableOpacity
                        style={[styles.addButton, { backgroundColor: colors.actionButton, borderColor: colors.border }]}
                        onPress={() => handleNavigation("add")}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={activeTab === "add" ? "add" : "add-outline"}
                            size={24}
                            color={activeTab === "add" ? "#FFFFFF" : colors.textSecondary}
                        />
                    </TouchableOpacity>
                </View>

            </View>

        </>
    );
}

const styles = StyleSheet.create({

    background: {
        position: 'absolute',
        bottom: 0,
        width: "100%",
        height: 100,
        alignItems: "center",
        // backgroundColor: "white",
        // shadowColor: "#ffffffff",
        // shadowOffset: { width: 0, height: -40 },
        // shadowOpacity: 1,
        // shadowRadius: 20,
        // elevation: 1,
    },

    container: {
        position: "absolute",
        bottom: 40,
        height: 48,
        width: "100%",
        backgroundColor: "transparent",
        justifyContent: "center",
        alignItems: "center",
        display: "flex",
        flexDirection: "row",
        gap: 20,
    },

    navbar: {
        position: "relative",
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        display: "flex",
        height: 48,
        width: "50%",
        alignSelf: "center",
        borderRadius: 100,
    },
    tabButton: {
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        height: 60,
    },
    addButton: {
        position: "relative",
        width: 48,
        height: 48,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
    },
});
