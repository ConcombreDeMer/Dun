import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import {
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useTheme } from "../lib/ThemeContext";

interface DateInputProps {
    value: Date;
    onChange: (date: Date) => void;
    disabled?: boolean;
    label?: string;
    bold?: boolean;
}

export default function DateInput({ value, onChange, disabled = false, label, bold = false}: DateInputProps) {
    const [showDatePicker, setShowDatePicker] = useState(false);
    const { colors } = useTheme();

    const handleDateChange = (event: any, date?: Date) => {
        if (Platform.OS === "android") {
            setShowDatePicker(false);
        }
        if (date) {
            onChange(date);
        }
    };

    const handleCloseDatePicker = () => {
        setShowDatePicker(false);
    };

    return (
        <View style={styles.dateContainer}>
            {label &&
                <Text style={[styles.label, { color: colors.text }]}>
                    {label}
                </Text>
            }
            <TouchableOpacity
                style={[styles.dateButton, { backgroundColor: colors.input, borderColor: colors.border }]}
                onPress={() => setShowDatePicker(true)}
                disabled={disabled}
            >
                <Text style={[styles.dateButtonText, { color: colors.text, fontWeight: bold ? '400' : '200' }]}>
                    {value.toLocaleDateString("fr-FR", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                    })}
                </Text>
            </TouchableOpacity>

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
                                    value={value}
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
                    value={value}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    dateContainer: {
    },
    label: {
        fontSize: 20,
        fontFamily: "Satoshi-Regular",
        marginBottom: 5,
    },
    dateButton: {
        height: 48,
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    dateButtonText: {
        fontSize: 16,
        fontWeight: "600",
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
