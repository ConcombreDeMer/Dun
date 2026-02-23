import { FontContext } from "@/lib/FontContext";
import { router } from "expo-router";
import { SquircleView } from "expo-squircle-view";
import React, { useEffect, useRef, useState } from "react";
import { InputAccessoryView, StyleSheet, TextInput, View } from "react-native";
import SecondaryButton from "./secondaryButton";

const INPUT_ACCESSORY_ID = "createTaskAccessory";

interface CreateModalProps {
    onClose?: () => void;
}

export default function CreateModal({ onClose }: CreateModalProps) {
    const [taskTitle, setTaskTitle] = useState("");
    const phantomInputRef = useRef<TextInput>(null);
    const inputRef = useRef<TextInput>(null);
    const isIntentionalBlurRef = useRef(false);
    const isCreatingTaskRef = useRef(false);
    const { fontSizes } = React.useContext(FontContext)!;



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

    const handleCreateTask = () => {
        // Marquer qu'on est en train de créer une tâche
        isCreatingTaskRef.current = true;

        // logique pour créer la tâche
        console.log("Créer tâche:", taskTitle);
        setTaskTitle("");

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

    const openPage = () => {
        console.log("Ouvrir page de création de tâche complète");
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
                inputAccessoryViewID={INPUT_ACCESSORY_ID}
            />

            <InputAccessoryView nativeID={INPUT_ACCESSORY_ID}>

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
                                nativeID={`input-${INPUT_ACCESSORY_ID}`}
                                inputAccessoryViewID={INPUT_ACCESSORY_ID}
                                placeholder="Titre de la tâche"
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