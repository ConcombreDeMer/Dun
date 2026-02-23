import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter, useSegments } from "expo-router";
import React, { useCallback, useMemo, useRef } from "react";
import { Animated, StyleSheet, TouchableOpacity, View } from "react-native";
import { useTheme } from "../lib/ThemeContext";
import CreateModal from "./createModal";

export default function Navbar() {
    const { colors } = useTheme();
    const router = useRouter();
    const segments = useSegments();
    const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);

    // Animation refs - créés une seule fois avec useRef
    const navbarScaleRef = useRef(new Animated.Value(1));
    const addButtonScaleRef = useRef(new Animated.Value(1));

    // Memoized tabs array
    const tabs = useMemo(() => [
        { name: "home", label: "Accueil", icon: "home" },
        { name: "stats", label: "Stats", icon: "stats-chart" },
        { name: "settings", label: "Paramètres", icon: "settings" },
    ], []);

    // Déterminer l'onglet actif basé sur le chemin actuel
    const getActiveTab = useCallback(() => {
        if (segments[0] === "stats") return "stats";
        if (segments[0] === "settings") return "settings";
        if (segments[0] === "create-task") return "add";
        return "home";
    }, [segments]);

    const activeTab = getActiveTab();

    const handleNavigation = useCallback(async (tab: string) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        switch (tab) {
            case "home":
                router.replace("/");
                break;
            case "stats":
                router.replace("/stats/general");
                break;
            case "settings":
                router.replace("/settings");
                break;
        }
    }, [router]);

    const animateScale = useCallback((animValue: Animated.Value, toValue: number) => {
        Animated.spring(animValue, {
            toValue,
            useNativeDriver: true,
            friction: 7,
            tension: 30,
        }).start();
    }, []);

    const handleTabPressIn = useCallback(() => {
        animateScale(navbarScaleRef.current, 1.05);
    }, [animateScale]);

    const handleTabPressOut = useCallback(() => {
        animateScale(navbarScaleRef.current, 1);
    }, [animateScale]);

    const handleAddPressIn = useCallback(() => {
        animateScale(navbarScaleRef.current, 1.05);
        animateScale(addButtonScaleRef.current, 1.10);
    }, [animateScale]);

    const handleAddPressOut = useCallback(() => {
        animateScale(navbarScaleRef.current, 1);
        animateScale(addButtonScaleRef.current, 1);
    }, [animateScale]);

    const openAddTask = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if(isCreateModalOpen) {
            setIsCreateModalOpen(false);
        } else {
            setIsCreateModalOpen(true);
        }
    };

    return (
        <>

            <View style={styles.background}>
                <View
                    style={styles.container}
                >
                    <Animated.View
                        style={[
                            styles.navbar,
                            { 
                                backgroundColor: colors.actionButton, 
                                borderColor: colors.border,
                                transform: [{ scale: navbarScaleRef.current }],
                            }
                        ]}
                    >
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.name;
                            return (
                                <TouchableOpacity
                                    key={tab.name}
                                    style={styles.tabButton}
                                    onPress={() => handleNavigation(tab.name)}
                                    onPressIn={handleTabPressIn}
                                    onPressOut={handleTabPressOut}
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
                    </Animated.View>
                    <Animated.View
                        style={{
                            transform: [{ scale: addButtonScaleRef.current }],
                        }}
                    >
                        <TouchableOpacity
                            style={[styles.addButton, { backgroundColor: colors.actionButton, borderColor: colors.border }]}
                            onPress={openAddTask}
                            onPressIn={handleAddPressIn}
                            onPressOut={handleAddPressOut}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={activeTab === "add" ? "add" : "add-outline"}
                                size={24}
                                color={activeTab === "add" ? "#FFFFFF" : colors.textSecondary}
                            />
                        </TouchableOpacity>
                    </Animated.View>
                </View>
                {
                    isCreateModalOpen && (
                        <CreateModal 
                            onClose={() => setIsCreateModalOpen(false)}
                        />
                    )

                }

            </View>

        </>
    );
}

const styles = StyleSheet.create({

    background: {
        position: 'absolute',
        bottom: 0,
        width: "100%",
        height: "100%",
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
        zIndex: 200,
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
