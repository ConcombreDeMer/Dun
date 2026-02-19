import { useStore } from "@/store/store";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter, useSegments } from "expo-router";
import React, { useCallback, useEffect, useMemo, } from "react";
import { Alert, Dimensions, Keyboard, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown, FadeInUp, FadeOutDown, FadeOutUp, SharedValue, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { taskEmitter } from "../lib/eventEmitter";
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/ThemeContext";
import DateInput from "./dateInput";
import SecondaryButton from "./secondaryButton";
import SimpleInput from "./textInput";

export default function Navbar() {
    const { colors } = useTheme();
    const router = useRouter();
    const segments = useSegments();
    const queryClient = useQueryClient();
    const [createOpen, setCreateOpen] = React.useState(false);
    const [navbarWidth, setNavbarWidth] = React.useState(0);
    const [descriptionOpen, setDescriptionOpen] = React.useState(false);
    const [name, setName] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [keyboardHeight, setKeyboardHeight] = React.useState(0);
    const selectedDate = useStore((state) => state.selectedDate) || new Date();
    const setSelectedDate = useStore((state) => state.setSelectedDate);
    const [numberDateIcon, setNumberDateIcon] = React.useState("1.calendar");
    const [showDateInput, setShowDateInput] = React.useState(false);
    const [windowWidth, setWindowWidth] = React.useState(Dimensions.get("window").width);


    // Reanimated shared values
    const navbarScale = useSharedValue(1);
    const addButtonScale = useSharedValue(1);
    const addButtonWidth = useSharedValue(48);
    const panelHeight = useSharedValue(0);
    const panelBottom = useSharedValue(60); // Base bottom position

    // Setup keyboard listener
    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (event) => {
            const height = event.endCoordinates.height;
            setKeyboardHeight(height);
            console.log('⌨️ Keyboard opened - Height:', height);

            // Calculate adjustment needed to keep panel above keyboard
            const screenHeight = Dimensions.get('window').height;
            const panelBottomEdge = screenHeight - 60 - panelHeight.value;
            const keyboardTopPosition = screenHeight - height;

            // If panel overlaps with keyboard, adjust its bottom position
            if (panelBottomEdge > keyboardTopPosition) {
                const adjustment = panelBottomEdge - keyboardTopPosition + 50; // 20px buffer
                panelBottom.value = withSpring(60 + adjustment);
                console.log('📈 Panel adjusted - Moving up by:', adjustment, 'px');
            }
        });

        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardHeight(0);
            console.log('⌨️ Keyboard closed');

            // Return panel to original position
            panelBottom.value = withSpring(60);
        });

        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, [panelHeight, panelBottom]);

    // Mutations for task creation
    const dayMutation = useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error("Utilisateur non connecté");
            }
            const { data: existingDay, error: fetchError } = await supabase
                .from("Days")
                .select("*")
                .eq("user_id", user.id)
                .eq("date", selectedDate.toDateString())
                .maybeSingle();

            if (fetchError) {
                console.error("Erreur lors de la récupération du jour:", fetchError);
                throw new Error(fetchError.message);
            }
            if (!existingDay) {
                const { error: insertError } = await supabase.from("Days").insert([
                    {
                        user_id: user.id,
                        date: selectedDate.toDateString(),
                        total: 1,
                        done_count: 0,
                        updated_at: new Date().toDateString(),
                    },
                ]);

                if (insertError) {
                    console.error("Erreur lors de l'insertion du jour:", insertError);
                    throw new Error(insertError.message);
                }
            } else {
                const { error: updateError } = await supabase
                    .from("Days")
                    .update({
                        total: (existingDay.total || 0) + 1,
                        updated_at: new Date().toDateString(),
                    })
                    .eq("id", existingDay.id)

                if (updateError) {
                    console.error("Erreur lors de la mise à jour du jour:", updateError);
                    throw new Error(updateError.message);
                }
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['days'] });
        },
        onError: (error: any) => {
            console.error("Erreur dans la mutation du jour:", error);
        }
    });

    const createTaskMutation = useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error("Utilisateur non connecté");
            }

            const { data: existingTasks, error: fetchError } = await supabase
                .from("Tasks")
                .select("*")
                .eq("date", selectedDate.toDateString())
                .eq("user_id", user.id);

            if (fetchError) {
                throw new Error(fetchError.message);
            }

            const newOrder = (existingTasks?.length || 0) + 1;

            const { error } = await supabase.from("Tasks").insert([
                {
                    name: name.trim(),
                    description: description.trim(),
                    done: false,
                    date: selectedDate.toDateString(),
                    created_at: new Date().toDateString(),
                    user_id: user.id,
                    order: newOrder,
                },
            ]);

            if (error) {
                throw new Error(error.message);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });

            // Alert.alert("Succès", "Tâche créée avec succès");
            setName("");
            setDescription("");
            setDescriptionOpen(false);
            taskEmitter.emit("taskAdded");
            // extendAddButton();
        },
        onError: (error: any) => {
            Alert.alert("Erreur", error.message || "Une erreur est survenue");
        }
    });

    // Heights for different sections - using Refs to avoid re-renders
    const titleInputHeightRef = React.useRef(0);
    const descriptionSectionHeightRef = React.useRef(0);
    const dateInputHeightRef = React.useRef(0);
    const buttonsHeightRef = React.useRef(0);

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

    const animateScale = useCallback((animValue: SharedValue<number>, toValue: number) => {
        animValue.value = withSpring(toValue, {
            damping: 30,
            mass: 1,
            overshootClamping: false,
        });
    }, []);

    useFocusEffect(useCallback(() => {
        // Réinitialiser la scale quand on revient à cette page
        animateScale(navbarScale, 1);
    }, [animateScale]));

    const handleNavigation = useCallback(async (tab: string) => {
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
    }, [router]);

    const handleTabPressIn = useCallback(() => {
        animateScale(navbarScale, 1.05);
    }, [animateScale]);

    const handleTabPressOut = useCallback(() => {
        animateScale(navbarScale, 1);
    }, [animateScale]);

    const handleAddPressIn = useCallback(() => {
        animateScale(navbarScale, 1.05);
        animateScale(addButtonScale, 1.10);
    }, [animateScale]);

    const handleAddPressOut = useCallback(() => {
        animateScale(navbarScale, 1);
        animateScale(addButtonScale, 1);
    }, [animateScale]);

    const extendAddButton = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (createOpen) {
            animateScale(navbarScale, 1);
            animateScale(addButtonScale, 1);
            addButtonWidth.value = withSpring(48);
            setCreateOpen(false);
            setDescriptionOpen(false);
            return;
        }
        else {
            animateScale(navbarScale, 0);
            addButtonWidth.value = withSpring(navbarWidth);

            setCreateOpen(true);
            return;
        }
    };

    const navbarAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: navbarScale.value }],
    }));

    const addButtonScaleAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: addButtonScale.value }],
    }));

    const addButtonWidthAnimatedStyle = useAnimatedStyle(() => ({
        width: addButtonWidth.value,
    }));

    useEffect(() => {
        const date = selectedDate.getDate();
        // construitre la string {date}.calendar
        const newIcon = `${date}.calendar`;
        setNumberDateIcon(newIcon);
    }, [selectedDate]);

    const handleDateChange = (date: Date) => {
        setSelectedDate(date);
    };

    const showDateInputHandler = () => {
        setShowDateInput(true);
    };

    const handleCreateTask = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (!name.trim()) {
            Alert.alert("Erreur", "Le nom de la tâche est requis");
            return;
        }
        createTaskMutation.mutate();
        dayMutation.mutate();
    };

    const handleCancel = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setName("");
        setDescription("");
        setDescriptionOpen(false);
    };

    // Function to update panel height
    const updatePanelHeight = useCallback(() => {
        let totalHeight = 34; // padding top and bottom

        if (createOpen) {
            totalHeight += titleInputHeightRef.current;
            totalHeight += 8; // gap
            totalHeight += descriptionSectionHeightRef.current;
            totalHeight += 8; // gap
            totalHeight += buttonsHeightRef.current;
        }

        panelHeight.value = withSpring(totalHeight);
    }, [createOpen, showDateInput, panelHeight]);

    // Update panel height when panel state changes
    useEffect(() => {
        updatePanelHeight();
    }, [createOpen, showDateInput, descriptionOpen, updatePanelHeight]);

    const panelAnimatedStyle = useAnimatedStyle(() => ({
        height: panelHeight.value,
        bottom: panelBottom.value,
    }));

    const getKeyboardHeight = () => {
        return keyboardHeight;
    }

    return (
        <>

            <View style={styles.background}>
                <View
                    style={styles.container}
                    onLayout={(event) => {
                        const { width } = event.nativeEvent.layout;
                        setNavbarWidth(width);
                    }}
                >
                    <Animated.View
                        style={[
                            styles.navbar,
                            {
                                backgroundColor: colors.actionButton,
                                borderColor: colors.border,
                            },
                            navbarAnimatedStyle,
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


                    {
                        createOpen && (

                            <Animated.View
                                exiting={FadeOutDown.springify()}
                                onLayout={(event) => {
                                    const { height } = event.nativeEvent.layout;
                                    // This measures the entire view, we'll measure individual sections instead
                                }}
                                style={[
                                    {
                                        position: "absolute",
                                        width: windowWidth * 0.9,
                                        backgroundColor: '#dadada',
                                        borderRadius: 30,
                                        alignItems: "center",
                                        justifyContent: "flex-start",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 12,
                                        padding: 12,
                                        zIndex: -3,
                                        left: "50%",
                                        transform: [{ translateX: -((windowWidth * 0.9) / 2) }],
                                        borderWidth: 0.5,
                                        borderColor: colors.border,
                                        boxShadow: '0px 6px 20px rgba(0, 0, 0, 0.4)',
                                        overflow: "hidden",
                                    },
                                    panelAnimatedStyle,
                                ]}
                            >
                                <View
                                    onLayout={(event) => {
                                        const { height } = event.nativeEvent.layout;
                                        if (titleInputHeightRef.current !== height) {
                                            titleInputHeightRef.current = height;
                                            updatePanelHeight();
                                        }
                                    }}
                                    style={{
                                        width: "100%",
                                        display: "flex",
                                        flexDirection: "row",
                                        gap: 8,
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                    }}
                                >
                                    <View
                                        style={{ flex: 1 }}
                                    >
                                        <SimpleInput
                                            placeholder="Créer une tâche..."
                                            borderRadius={20}
                                            scale="large"
                                            value={name}
                                            onChangeText={setName}
                                        />
                                    </View>

                                    {
                                        keyboardHeight > 0 && (


                                            <Animated.View
                                                entering={FadeInDown.springify()}
                                                exiting={FadeOutDown.springify()}
                                            >

                                                <SecondaryButton
                                                    onPress={handleCreateTask}
                                                    image="checkmark"
                                                />
                                            </Animated.View>

                                        )

                                    }
                                </View>

                                <View
                                    onLayout={(event) => {
                                        const { height } = event.nativeEvent.layout;
                                        if (descriptionSectionHeightRef.current !== height) {
                                            descriptionSectionHeightRef.current = height;
                                            updatePanelHeight();
                                        }
                                    }}
                                    style={{
                                        width: "100%",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 8,
                                        justifyContent: "center",
                                        alignItems: "center",
                                    }}
                                >
                                    {!descriptionOpen ? (
                                        <TouchableOpacity onPress={() => setDescriptionOpen(true)}>
                                            <Text
                                                style={{
                                                    color: colors.textSecondary,
                                                    fontSize: 16,
                                                    fontFamily: 'Satoshi-Regular',
                                                }}
                                            >
                                                + ajouter une description
                                            </Text>
                                        </TouchableOpacity>
                                    ) : (

                                        <Animated.View
                                            entering={FadeInDown.springify()}
                                            exiting={FadeOutDown.springify()}

                                            style={{
                                                width: "100%",
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: 8,
                                                justifyContent: "center",
                                                alignItems: "center",
                                            }}
                                        >
                                            <SimpleInput
                                                placeholder="Ajouter une description..."
                                                borderRadius={20}
                                                scale="large"
                                                multiline={true}
                                                value={description}
                                                onChangeText={setDescription}
                                            />

                                            <Pressable
                                                onPress={() => setDescriptionOpen(false)}
                                            >
                                                <Text
                                                    style={{
                                                        color: colors.textSecondary,
                                                        fontSize: 16,
                                                        fontFamily: 'Satoshi-Regular',
                                                    }}
                                                >
                                                    - retirer la description
                                                </Text>
                                            </Pressable>
                                        </Animated.View>
                                    )}


                                    {
                                        showDateInput && (

                                            <Animated.View
                                                entering={FadeInDown.springify()}
                                                onLayout={(event) => {
                                                    const { height } = event.nativeEvent.layout;
                                                    if (dateInputHeightRef.current !== height) {
                                                        dateInputHeightRef.current = height;
                                                        updatePanelHeight();
                                                    }
                                                }}
                                                style={{
                                                    width: "100%",
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: 8,
                                                }}
                                            >
                                                <DateInput
                                                    value={selectedDate}
                                                    onChange={handleDateChange}
                                                    // disabled={createTaskMutation.isPending}
                                                    bold
                                                    showTodayButton
                                                />

                                            </Animated.View>
                                        )

                                    }
                                </View>
                                <View
                                    onLayout={(event) => {
                                        const { height } = event.nativeEvent.layout;
                                        if (buttonsHeightRef.current !== height) {
                                            buttonsHeightRef.current = height;
                                            updatePanelHeight();
                                        }
                                    }}
                                    style={{
                                        flexDirection: "row",
                                        justifyContent: "space-between",
                                        width: "100%",
                                    }}
                                >

                                    <View
                                        style={{
                                            flexDirection: "row",
                                            justifyContent: "flex-start",
                                            gap: 12,
                                        }}
                                    >
                                        <SecondaryButton
                                            onPress={handleCancel}
                                            image="trash"
                                            type="danger"
                                        />

                                        <SecondaryButton
                                            onPress={() => {
                                                if (showDateInput) {
                                                    setShowDateInput(false);
                                                } else {
                                                    showDateInputHandler();
                                                }
                                            }}
                                            image={numberDateIcon as any}
                                        />
                                    </View>

                                    {
                                        keyboardHeight === 0 && (

                                            <Animated.View
                                                entering={FadeInUp.springify()}
                                                exiting={FadeOutUp.springify()}
                                            >

                                                <SecondaryButton
                                                    onPress={handleCreateTask}
                                                    image="checkmark"
                                                />
                                            </Animated.View>
                                            
                                        )
                                    }


                                </View>

                            </Animated.View>


                        )
                    }


                    <Animated.View
                        style={[
                            addButtonScaleAnimatedStyle,
                            addButtonWidthAnimatedStyle,
                            {
                                position: "absolute",
                                height: 48,
                                borderRadius: 24,
                                alignItems: "center",
                                justifyContent: "center",
                                right: 0,
                            },
                            {

                                backgroundColor: colors.actionButton,
                            }
                        ]}
                    >

                        {
                            !createOpen &&
                            <TouchableOpacity
                                style={[styles.addButton, { backgroundColor: colors.actionButton, borderColor: colors.border }]}
                                onPress={extendAddButton}
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
                        }
                        {createOpen &&
                            <TouchableOpacity
                                style={[styles.addButton, { backgroundColor: colors.actionButton, borderColor: colors.border }]}
                                onPress={extendAddButton}
                                onPressIn={handleAddPressIn}
                                onPressOut={handleAddPressOut}
                                activeOpacity={0.7}
                            >
                                <Text
                                    style={{
                                        color: "#FFFFFF",
                                        fontSize: 16,
                                        fontFamily: 'Satoshi-Regular',
                                    }}
                                >
                                    Terminé
                                </Text>
                            </TouchableOpacity>
                        }

                    </Animated.View>
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
        height: "100%",
        alignItems: "center",
        // backgroundColor: "red",
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
        width: "70%",
        justifyContent: "space-between",
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
        width: "70%",
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
        position: "absolute",
        height: 48,
        aspectRatio: 1,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        width: '100%'
    },
});
