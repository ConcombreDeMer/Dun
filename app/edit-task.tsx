import { useRouter, useLocalSearchParams } from "expo-router";
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
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { StyleSheet } from "react-native";
import { Image } from "react-native";
import { taskEmitter } from "../lib/eventEmitter";

export default function EditTask() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchTask = async () => {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from("Tasks")
                    .select("*")
                    .eq("id", id)
                    .single();

                if (error) {
                    Alert.alert("Erreur", "Impossible de charger la tâche");
                    router.back();
                    return;
                }

                setName(data.name);
                setDescription(data.description || "");
            } catch (error) {
                Alert.alert("Erreur", "Une erreur est survenue");
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchTask();
        }
    }, [id]);

    const handleUpdateTask = async () => {
        if (!name.trim()) {
            Alert.alert("Erreur", "Le nom de la tâche est requis");
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase
                .from("Tasks")
                .update({
                    name: name.trim(),
                    description: description.trim(),
                })
                .eq("id", id);

            if (error) {
                Alert.alert("Erreur", error.message);
                return;
            }

            Alert.alert("Succès", "Tâche modifiée avec succès");
            taskEmitter.emit("taskUpdated");
            router.back();
        } catch (error) {
            Alert.alert("Erreur", "Une erreur est survenue");
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#000" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <Text style={styles.title}>
                Modifier la tâche
            </Text>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.mainView}>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>
                            Nom
                        </Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Entrez le nom de la tâche"
                            value={name}
                            onChangeText={setName}
                            editable={!saving}
                        />
                    </View>

                    <View style={styles.descriptionContainer}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                            <Text style={styles.label}>
                                Description
                            </Text>
                            <Text style={{ fontStyle: "italic", opacity: 0.3 }} >(facultatif)</Text>
                        </View>
                        <TextInput
                            style={styles.descriptionInput}
                            placeholder="Entrez la description de la tâche"
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            editable={!saving}
                        />
                    </View>

                </View>
            </ScrollView>
            <TouchableOpacity
                onPress={handleUpdateTask}
                disabled={saving}
                style={[styles.createButton, saving && styles.createButtonDisabled]}
            >
                {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                ) : (
                    <Text style={styles.createButtonText}>
                        Modifier la tâche
                    </Text>
                )}
            </TouchableOpacity>
            <TouchableOpacity
                onPress={() => router.back()}
                disabled={saving}
                style={styles.backButton}
            >
                <Image
                    style={{ width: 34, height: 34 }}
                    source={require('../assets/images/cancel.png')}
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
        borderColor: "#ccc",
        backgroundColor: "#ebebebff",
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    descriptionContainer: {
        marginBottom: 30,
    },
    descriptionInput: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        minHeight: 100,
        textAlignVertical: "top",
        backgroundColor: "#ebebebff",
    },
    createButton: {
        backgroundColor: "#000000ff",
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
        backgroundColor: "#ccc",
    },
    createButtonText: {
        color: "#fff",
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
        backgroundColor: "#000000ff",
        position: "absolute",
        bottom: 30,
        left: 30,
    },
});
