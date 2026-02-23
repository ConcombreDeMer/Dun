import { FontContext } from "@/lib/FontContext";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/store/store";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from 'expo-haptics';
import { router } from "expo-router";
import { SquircleView } from "expo-squircle-view";
import React, { useEffect, useRef, useState } from "react";
import { Alert, InputAccessoryView, StyleSheet, TextInput, View } from "react-native";
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
    const queryClient = useQueryClient();
    const selectedDate = useStore((state) => state.selectedDate) || new Date();
    
    

    const dayMutation = useMutation({
        mutationFn: async () => {
            // Récupérer l'utilisateur connecté
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
            // Si le jour n'existe pas, le créer
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
            }

            // Si le jour existe déjà, incrémenter "total" et mettre à jour "updated_at"
            else {
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
            // Récupérer l'utilisateur connecté
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                throw new Error("Utilisateur non connecté");
            }

            // Récupérer le nombre de tâches existantes pour cette journée
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
                    name: taskTitle.trim(),
                    description: "",
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
            // Invalide la query et refetch automatiquement
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            setTaskTitle("");
        },
        onError: (error: any) => {
            Alert.alert("Erreur", error.message || "Une erreur est survenue");
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
            Alert.alert("Erreur", "Le nom de la tâche est requis");
            isCreatingTaskRef.current = false;
            return;
        }

        await createTaskMutation.mutateAsync();
        await dayMutation.mutateAsync();


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