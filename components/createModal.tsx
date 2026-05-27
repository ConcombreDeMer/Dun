import { FontContext } from "@/lib/FontContext";
import { createTask } from "@/lib/tasks";
import { useStore } from "@/store/store";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from 'expo-haptics';
import { router } from "expo-router";
import { SquircleView } from "expo-squircle-view";
import React, { useEffect, useRef, useState } from "react";
import { Alert, InputAccessoryView, StyleSheet, TextInput, View } from "react-native";
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
    const { fontSizes } = React.useContext(FontContext)!;
    const { t } = useAppTranslation();
    const queryClient = useQueryClient();
    const selectedDate = useStore((state) => state.selectedDate) || new Date();
    const selectedDateKey = toAppDateKey(selectedDate);
    
    
    const createTaskMutation = useMutation({
        mutationFn: async () => {
            return createTask({
                name: taskTitle,
                dateKey: selectedDateKey,
            });
        },
        onSuccess: () => {
            // Invalide la query et refetch automatiquement
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['days'] });
            setTaskTitle("");
        },
        onError: (error: any) => {
            console.error("Erreur lors de la création de la tâche:", error);
        }
    });



    useEffect(() => {
        // Focus sur le TextInput fantôme pour ouvrir le clavier
        phantomInputRef.current?.focus();

        // Après 100ms, transférer le focus au vrai TextInput
        const timer = setTimeout(() => {
            isIntentionalBlurRef.current = true;
            inputRef.current?.focus();
        }, 100);

        return () => clearTimeout(timer);
    }, []);

const handleCreateTask = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Marquer qu'on est en train de créer une tâche
        isCreatingTaskRef.current = true;

        if (!taskTitle.trim()) {
            Alert.alert(t("common.alerts.errorTitle"), t("common.alerts.requiredTaskName"));
            isCreatingTaskRef.current = false;
            return;
        }

        try {
            await createTaskMutation.mutateAsync();
        } catch (error: any) {
            Alert.alert(t("common.alerts.errorTitle"), error?.message || t("common.alerts.genericError"));
            isCreatingTaskRef.current = false;
            return;
        }


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
