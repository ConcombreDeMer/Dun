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
    Modal,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { StyleSheet } from "react-native";
import { Image } from "react-native";
import { taskEmitter } from "../lib/eventEmitter";
import { useTheme } from "../lib/ThemeContext";
import { getImageSource } from "../lib/imageHelper";
import PrimaryButton from "@/components/primaryButton";

export default function EditTask() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const { colors, theme } = useTheme();

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
                setSelectedDate(data.date ? new Date(data.date) : new Date());
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
                    date: selectedDate.toDateString(),
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

    const handleDateChange = (event: any, date?: Date) => {
        if (Platform.OS === "android") {
            setShowDatePicker(false);
        }
        if (date) {
            setSelectedDate(date);
        }
    };

    const handleCloseDatePicker = () => {
        setShowDatePicker(false);
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.text} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={[styles.container, { backgroundColor: colors.background }]}
        >
            <View style={styles.handleContainer}>
                <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>
            <View>
                <Text style={[styles.title, { color: colors.text }]}>
                    Modifier
                </Text>
                <Text style={[styles.subtitle, { color: colors.text }]}>
                    la tâche
                </Text>
            </View>
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
                            editable={!saving}
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
                            editable={!saving}
                        />
                    </View>

                    <View style={styles.dateContainer}>
                        <Text style={[styles.label, { color: colors.text }]}>
                            Date
                        </Text>
                        <TouchableOpacity
                            style={[styles.dateButton, { backgroundColor: colors.input, borderColor: colors.border }]}
                            onPress={() => setShowDatePicker(true)}
                            disabled={saving}
                        >
                            <Text style={[styles.dateButtonText, { color: colors.text }]}>
                                {selectedDate.toLocaleDateString("fr-FR", {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                })}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {showDatePicker && Platform.OS === "ios" && (
                        <Modal
                            transparent
                            visible={showDatePicker}
                            animationType="fade"
                            onRequestClose={handleCloseDatePicker}
                        >
                            <TouchableOpacity
                                activeOpacity={1}
                                style={styles.datePickerOverlay}
                                onPress={handleCloseDatePicker}
                            >
                                <View style={styles.datePickerContainer}>
                                    <View
                                        style={styles.datePickerContent}
                                        onTouchEnd={(e) => e.stopPropagation()}
                                    >
                                        <DateTimePicker
                                            value={selectedDate}
                                            mode="date"
                                            display="spinner"
                                            onChange={handleDateChange}
                                        />
                                        <TouchableOpacity
                                            style={[styles.datePickerCloseButton, { backgroundColor: colors.actionButton }]}
                                            onPress={handleCloseDatePicker}
                                        >
                                            <Text style={[styles.datePickerCloseText, { color: colors.buttonText }]}>
                                                Fermer
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </Modal>
                    )}

                    {showDatePicker && Platform.OS === "android" && (
                        <DateTimePicker
                            value={selectedDate}
                            mode="date"
                            display="default"
                            onChange={handleDateChange}
                        />
                    )}

                </View>
            </ScrollView>

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignSelf: "center", width: "100%", position: "absolute", bottom: 23 }}>
                <PrimaryButton
                    size="small"
                    image="cancel"
                    onPress={() => router.back()}
                    disabled={saving}
                />
                <PrimaryButton
                    size="mid"
                    title="Modifier la tâche"
                    onPress={handleUpdateTask}
                    disabled={saving}
                />
            </View>

        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingLeft: 20,
        paddingRight: 20,
        paddingTop: 20,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
    },

    handleContainer: {
        alignItems: "center",
        paddingBottom: 20,
    },

    handle: {
        width: 40,
        height: 5,
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
    datePickerOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    datePickerContainer: {
        paddingBottom: 20,
        borderRadius: 10,
        marginBottom: 10,
    },
    datePickerContent: {
        backgroundColor: "white",
        paddingBottom: 10,
        borderRadius: 10,
        marginLeft: "auto",
        marginRight: "auto",
        width: "90%",
        display: "flex",
        alignItems: "center",
    },
    datePickerCloseButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        margin: 10,
        borderRadius: 8,
        alignItems: "center",
    },
    datePickerCloseText: {
        fontSize: 16,
        fontWeight: "600",
    },
});
