import DateInput from "@/components/dateInput";
import Headline from "@/components/headline";
import PrimaryButton from "@/components/primaryButton";
import SimpleInput from "@/components/textInput";
import { useStore } from "@/store/store";
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
    const [loading, setLoading] = useState(false);
    const selectedDate = useStore((state) => state.selectedDate) || new Date();
    const setSelectedDate = useStore((state) => state.setSelectedDate);
    const { colors, theme } = useTheme();

    const handleCreateTask = async () => {
        if (!name.trim()) {
            Alert.alert("Erreur", "Le nom de la tâche est requis");
            return;
        }
        setLoading(true);
        try {
            // Récupérer l'utilisateur connecté
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                Alert.alert("Erreur", "Utilisateur non connecté");
                setLoading(false);
                return;
            }

            const { error } = await supabase.from("Tasks").insert([
                {
                    name: name.trim(),
                    description: description.trim(),
                    done: false,
                    date: selectedDate.toDateString(),
                    created_at: new Date().toDateString(),
                    user: user.id,
                },
            ]);

            if (error) {
                Alert.alert("Erreur", error.message);
                return;
            }

            Alert.alert("Succès", "Tâche créée avec succès");
            setName("");
            setDescription("");
            taskEmitter.emit("taskAdded");
            router.back();
        } catch (error) {
            Alert.alert("Erreur", "Une erreur est survenue");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDateChange = (date: Date) => {
        setSelectedDate(date);
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={[styles.container, { backgroundColor: colors.background }]}
        >
            <View style={styles.handleContainer}>
                <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>
            <Headline title="Créer" subtitle="une tâche" />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.mainView}>

                    <SimpleInput
                        name="Titre"
                        value={name}
                        onChangeText={setName}
                    />

                    <SimpleInput
                        name="Description"
                        value={description}
                        onChangeText={setDescription}
                        multiline
                    />

                    <DateInput
                        value={selectedDate}
                        onChange={handleDateChange}
                        disabled={loading}
                    />

                </View>
            </ScrollView>

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignSelf: "center", width: "100%", position: "absolute", bottom: 23 }}>
                <PrimaryButton size="XS" image="cancel" onPress={() => router.back()} />
                <PrimaryButton size="M" title="Créer la tâche" onPress={handleCreateTask} />
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