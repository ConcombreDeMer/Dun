import { useRouter } from "expo-router";
import {
    Text,
    View,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from "react-native";
import { useState } from "react";
import { supabase } from "../lib/supabase";
import { StyleSheet } from "react-native";
import { Image } from "react-native";
import { taskEmitter } from "../lib/eventEmitter";
import { useTheme } from "../lib/ThemeContext";
import { getImageSource } from "../lib/imageHelper";

export default function CreateTask() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const { colors, theme } = useTheme();

    const handleCreateTask = async () => {
        if (!name.trim()) {
            Alert.alert("Erreur", "Le nom de la tâche est requis");
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.from("Tasks").insert([
                {
                    name: name.trim(),
                    description: description.trim(),
                    done: false,
                    date: new Date().toISOString().split("T")[0],
                    created_at: new Date().toISOString(),
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

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={[styles.container, { backgroundColor: colors.background }]}
        >
            <Text style={[styles.title, { color: colors.text }]}>
                Créer une tâche
            </Text>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.mainView}>

                    <View style={styles.inputContainer}>
                        <Text style={[styles.label, { color: colors.text }]}>
                            Nom
                        </Text>
                        <TextInput
                            style={[styles.textInput, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
                            placeholder="Entrez le nom de la tâche"
                            placeholderTextColor={colors.inputPlaceholder}
                            value={name}
                            onChangeText={setName}
                            editable={!loading}
                        />
                    </View>

                    <View style={styles.descriptionContainer}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                            <Text style={[styles.label, { color: colors.text }]}>
                                Description
                            </Text>
                            <Text style={[styles.optionalText, { color: colors.textSecondary }]} >(facultatif)</Text>
                        </View>
                        <TextInput
                            style={[styles.descriptionInput, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
                            placeholder="Entrez la description de la tâche"
                            placeholderTextColor={colors.inputPlaceholder}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            editable={!loading}
                        />
                    </View>

                    {/* ici */}


                </View>
            </ScrollView>
            <TouchableOpacity
                onPress={handleCreateTask}
                disabled={loading}
                style={[styles.createButton, loading && styles.createButtonDisabled, { backgroundColor: colors.button }]}
            >
                {loading ? (
                    <ActivityIndicator color={colors.buttonText} size="small" />
                ) : (
                    <Text style={[styles.createButtonText, { color: colors.buttonText }]}>
                        Créer la tâche
                    </Text>
                )}
            </TouchableOpacity>
            <TouchableOpacity
                onPress={() => router.back()}
                disabled={loading}
                style={[styles.backButton, { backgroundColor: colors.button }]}
            >
                <Image
                    style={{ width: 34, height: 34 }}
                    source={getImageSource('cancel', theme)}
                ></Image>
            </TouchableOpacity>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingLeft: 20,
        paddingRight: 20,
        paddingTop: 60,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
    },

    title: {
        fontSize: 55,
        fontFamily: 'Satoshi-Black',
    },

    scrollContent: {
        marginTop: 50,
    },

    mainView: {
    },

    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 8,
    },
    textInput: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
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
});