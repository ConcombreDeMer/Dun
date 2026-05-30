import { FontContext } from "@/lib/FontContext";
import { useOptimisticTaskMutations } from "@/lib/useOptimisticTaskMutations";
import { useStore } from "@/store/store";
import { BlurView } from "expo-blur";
import * as Haptics from 'expo-haptics';
import { router } from "expo-router";
import { SquircleView } from "expo-squircle-view";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Animated, Easing, InputAccessoryView, Keyboard, Pressable, StyleSheet, TextInput, View } from "react-native";
import { toAppDateKey } from "../lib/date";
import { useAppTranslation } from "../lib/i18n";
import SecondaryButton from "./secondaryButton";

interface CreateModalProps {
    accessoryId?: string;
    onClose?: () => void;
}

export default function CreateModal({ accessoryId = "createTaskAccessory", onClose }: CreateModalProps) {
    const [taskTitle, setTaskTitle] = useState("");
    const phantomInputRef = useRef<TextInput>(null);
    const inputRef = useRef<TextInput>(null);
    const isIntentionalBlurRef = useRef(false);
    const isCreatingTaskRef = useRef(false);
    const [backdropOpacity] = useState(() => new Animated.Value(0));
    const { fontSizes } = React.useContext(FontContext)!;
    const { t } = useAppTranslation();
    const { createTaskOptimistically } = useOptimisticTaskMutations();
    const selectedDate = useStore((state) => state.selectedDate) || new Date();
    const selectedDateKey = toAppDateKey(selectedDate);


    useEffect(() => {
        Animated.timing(backdropOpacity, {
            toValue: 1,
            duration: 1500,
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            useNativeDriver: true,
        }).start();

        // Focus sur le TextInput fantôme pour ouvrir le clavier
        phantomInputRef.current?.focus();

        // Après 100ms, transférer le focus au vrai TextInput
        const timer = setTimeout(() => {
            isIntentionalBlurRef.current = true;
            inputRef.current?.focus();
        }, 100);

        return () => clearTimeout(timer);
    }, [backdropOpacity]);

    const handleCreateTask = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Marquer qu'on est en train de créer une tâche
        isCreatingTaskRef.current = true;

        if (!taskTitle.trim()) {
            Alert.alert(t("common.alerts.errorTitle"), t("common.alerts.requiredTaskName"));
            isCreatingTaskRef.current = false;
            return;
        }

        const nextTitle = taskTitle;
        setTaskTitle("");

        void createTaskOptimistically({
            name: nextTitle,
            dateKey: selectedDateKey,
        }).catch((error: any) => {
            console.error("Erreur lors de la création de la tâche:", error);
            setTaskTitle((current) => current.trim() ? current : nextTitle);
            Alert.alert(t("common.alerts.errorTitle"), error?.message || t("common.alerts.genericError"));
        });


        // Rétablir le focus après un court délai
        setTimeout(() => {
            inputRef.current?.focus();
            isCreatingTaskRef.current = false;
        }, 50);
    };

    const handleBlur = () => {
        // Ignorer le blur s'il est intentionnel (changement de focus) ou si on crée une tâche
        if (!isIntentionalBlurRef.current && !isCreatingTaskRef.current) {
            onClose?.();
        }
        isIntentionalBlurRef.current = false;
    };

    const openPage = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push("/create-task");
        onClose?.();
    }


    return (
        <>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("common.actions.cancel")}
                onPress={Keyboard.dismiss}
                style={styles.backdrop}
            >
                <Animated.View style={[styles.backdropVisual, { opacity: backdropOpacity }]}>
                    <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={styles.backdropShade} />
                    <View style={styles.backdropDim} />
                </Animated.View>
            </Pressable>

            {/* TextInput fantôme pour ouvrir le clavier */}
            <TextInput
                ref={phantomInputRef}
                style={styles.phantomInput}
                onBlur={handleBlur}
                inputAccessoryViewID={accessoryId}
            />

            <InputAccessoryView nativeID={accessoryId}>

                <SquircleView
                    cornerSmoothing={100}
                    preserveSmoothing={true}
                    style={styles.accessoryContainer}
                >
                    <View
                        style={{
                            flex: 1,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 10,
                        }}
                    >
                        <SquircleView
                            cornerSmoothing={100}
                            preserveSmoothing={true}
                            style={styles.inputContainer}
                        >
                            <TextInput
                                ref={inputRef}
                                nativeID={`input-${accessoryId}`}
                                inputAccessoryViewID={accessoryId}
                                placeholder={t("createModal.titlePlaceholder")}
                                value={taskTitle}
                                onChangeText={setTaskTitle}
                                onBlur={handleBlur}
                                style={[styles.accessoryInput, { fontSize: fontSizes['xl'] }]}
                                placeholderTextColor="rgba(0, 0, 0, 0.5)"
                            />


                        </SquircleView>

                        <SecondaryButton
                            onPress={openPage}
                            image="text.page"
                        />

                        <SecondaryButton
                            onPress={handleCreateTask}
                            image="plus"
                            backgroundColor="#424242"
                            imageColor="white"
                        />
                    </View>



                </SquircleView>
            </InputAccessoryView>
        </>
    );
}

const styles = StyleSheet.create({
    phantomInput: {
        position: "absolute",
        opacity: 0,
        height: 0,
        width: 0,
    },
    backdrop: {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 20,
        elevation: 20,
    },
    backdropVisual: {
        ...StyleSheet.absoluteFill,
    },
    backdropShade: {
        ...StyleSheet.absoluteFill,
        backgroundColor: "rgba(0, 0, 0, 0.34)",
    },
    backdropDim: {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        backgroundColor: "rgba(0, 0, 0, 0.22)",
    },
    accessoryContainer: {
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 8,
        paddingVertical: 8,
        backgroundColor: "#e2e2e2",
        borderWidth: 1,
        borderColor: "rgb(218, 218, 218)",
        borderRadius: 23,
        marginBottom: 8,
        width: "95%",
        alignSelf: "center",
        display: "flex",
        justifyContent: "space-between",
    },
    inputContainer: {
        flex: 1,
        borderRadius: 15,
        backgroundColor: "white",
    },
    accessoryInput: {
        flex: 1,
        height: 64,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontFamily: 'Satoshi-Regular',
        width: "100%",
    },
});
