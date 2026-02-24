import DateInput from "@/components/dateInput";
import Headline from "@/components/headline";
import PrimaryButton from "@/components/primaryButton";
import SimpleInput from "@/components/textInput";
import { useStore } from "@/store/store";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    View
} from "react-native";
import { taskEmitter } from "../lib/eventEmitter";
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/ThemeContext";

export default function CreateTask() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const selectedDate = useStore((state) => state.selectedDate) || new Date();
    const setSelectedDate = useStore((state) => state.setSelectedDate);
    const { colors, theme } = useTheme();
    const queryClient = useQueryClient();

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

            // Si le jour existe déjà, incréementer "count" et mettre à jour "updated_at"
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
            // Invalide la query et refetch automatiquement
            queryClient.invalidateQueries({ queryKey: ['tasks'] });

            Alert.alert("Succès", "Tâche créée avec succès");
            setName("");
            setDescription("");
            taskEmitter.emit("taskAdded");
            router.back();
        },
        onError: (error: any) => {
            Alert.alert("Erreur", error.message || "Une erreur est survenue");
        }
    });

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
        router.back();
    }

    const handleDateChange = (date: Date) => {
        setSelectedDate(date);
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={[styles.container, { backgroundColor: colors.background }]}
        >
            <View style={styles.handleContainer}>
                <View style={[styles.handle, { backgroundColor: colors.textSecondary }]} />
            </View>
            <Headline title="Créer" subtitle="une tâche" />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.mainView}>

                    <SimpleInput
                        name="Titre"
                        value={name}
                        onChangeText={setName}
                        bold
                    />

                    <SimpleInput
                        name="Description"
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        bold
                    />

                    <DateInput
                        value={selectedDate}
                        onChange={handleDateChange}
                        disabled={createTaskMutation.isPending}
                        bold
                        showTodayButton
                    />

                </View>
            </ScrollView>

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignSelf: "center", width: "100%", position: "absolute", bottom: 23 }}>
                <PrimaryButton size="XS" image="xmark" onPress={handleCancel} />
                <PrimaryButton size="M" title="Valider" onPress={handleCreateTask} />
            </View>

        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 23,
        paddingBottom: 23,
        paddingTop: 20,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
    },

    handleContainer: {
        alignItems: "center",
        paddingBottom: 20,
    },

    handle: {
        width: 40,
        height: 5,
        backgroundColor: "#ddd",
        borderRadius: 2.5,
    },

    title: {
        fontSize: 55,
        fontFamily: 'Satoshi-Black',
    },

    subtitle: {
        fontSize: 26,
        marginLeft: 5,
        marginTop: -10,
        fontFamily: 'Satoshi-Regular',
        opacity: 0.7,
    },

    scrollContent: {
        marginTop: 50,
    },

    mainView: {
        display: "flex",
        flexDirection: "column",
        gap: 20,
    },

    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 8,
    },
    descriptionContainer: {
        marginBottom: 30,
    },
    optionalText: {
        fontStyle: "italic",
    },
    descriptionInput: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        minHeight: 100,
        textAlignVertical: "top",
    },
    createButton: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        height: 70,
        width: "70%",
        borderRadius: 100,
        position: "absolute",
        bottom: 30,
        right: 30,
    },
    createButtonDisabled: {
        opacity: 0.5,
    },
    createButtonText: {
        fontSize: 20,
        fontWeight: "600",
        fontFamily: "Satoshi-Bold",
    },
    backButton: {
        alignItems: "center",
        justifyContent: "center",
        height: 70,
        width: 70,
        borderRadius: 100,
        position: "absolute",
        bottom: 30,
        left: 30,
    },
    dateContainer: {
        marginBottom: 30,
    },
    dateButton: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    dateButtonText: {
        fontSize: 16,
        fontWeight: "500",
        textTransform: "capitalize",
    },

});