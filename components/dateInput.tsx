import DateTimePicker from "@react-native-community/datetimepicker";
import { SquircleView } from "expo-squircle-view";
import React, { useEffect, useState } from "react";
import {
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useFont } from "../lib/FontContext";
import { useTheme } from "../lib/ThemeContext";
import PrimaryButton from "./primaryButton";

interface DateInputProps {
    value: Date;
    onChange: (date: Date) => void;
    disabled?: boolean;
    label?: string;
    bold?: boolean;
    showTodayButton?: boolean;
}

// Fonction utilitaire pour comparer les dates efficacement
const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
        date1.getDate() === date2.getDate() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getFullYear() === date2.getFullYear()
    );
};

export default function DateInput({ value, onChange, disabled = false, label, bold = false, showTodayButton = false }: DateInputProps) {
    const [showDatePicker, setShowDatePicker] = useState(false);
    const { colors } = useTheme();
    const { fontSizes } = useFont();

    // Animation pour la hauteur du bouton "Retour à aujourd'hui"
    const todayButtonHeightValue = useSharedValue(0);
    const todayButtonOpacityValue = useSharedValue(0);

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

    // Mettre à jour la hauteur du bouton avec animation
    useEffect(() => {
        const shouldShow = !isSameDay(value, new Date());
        todayButtonHeightValue.value = withSpring(shouldShow ? 30 : 0);
        todayButtonOpacityValue.value = withSpring(shouldShow ? 1 : 0);
    }, [value, todayButtonHeightValue, todayButtonOpacityValue]);

    // Animation de hauteur du bouton "Retour à aujourd'hui"
    const animatedTodayButtonStyle = useAnimatedStyle(() => {
        return {
            height: todayButtonHeightValue.value,
            opacity: todayButtonOpacityValue.value,
        };
    });

    return (
        <View style={styles.dateContainer}>
            {label &&
                <Text style={[styles.label, { color: colors.text, fontSize: fontSizes['2xl'] }]}>
                    {label}
                </Text>
            }
            <SquircleView
                cornerSmoothing={100} // 0-100
                preserveSmoothing={true} // false matches figma, true has more rounding
                style={{
                    width: '100%',
                    backgroundColor: colors.task,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: 15,
                    paddingVertical: 8,
                    paddingHorizontal: 8,
                }}
            >
                <TouchableOpacity
                    style={[styles.dateButton, { backgroundColor: "transparent" }]}
                    onPress={() => setShowDatePicker(true)}
                    disabled={disabled}
                >
                    <Text style={[styles.dateButtonText, { color: colors.text, fontWeight: bold ? '400' : '200', fontSize: fontSizes.lg, fontFamily: 'Satoshi-Medium' }]}>
                        {value.toLocaleDateString("fr-FR", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                        })}
                    </Text>
                </TouchableOpacity>

            </SquircleView>


            {showTodayButton &&
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => onChange(new Date())}
                >
                    <Animated.View
                        style={[
                            styles.todayButton,
                            animatedTodayButtonStyle,
                            {
                                overflow: 'hidden',
                                backgroundColor: colors.task,
                            }
                        ]}
                    >
                        <Text style={[styles.todayButtonText, { color: colors.textSecondary, fontSize: fontSizes.xs }]}>Retour à aujourd'hui</Text>
                    </Animated.View>
                </TouchableOpacity>
            }


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
                            <SquircleView
                                cornerSmoothing={100} // 0-100
                                preserveSmoothing={true} // false matches figma, true has more rounding
                                style={[styles.datePickerContent, { backgroundColor: colors.card }]}
                                onTouchEnd={(e) => e.stopPropagation()}
                            >
                                <DateTimePicker
                                    value={value}
                                    mode="date"
                                    display="spinner"
                                    onChange={handleDateChange}
                                />

                                <PrimaryButton
                                    size="S"
                                    onPress={handleCloseDatePicker}
                                    image="checkmark"
                                    height={48}
                                />
                            </SquircleView>
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
        fontFamily: "Satoshi-Regular",
        marginBottom: 5,
    },
    dateButton: {
        height: 48,
        borderRadius: 8,
        padding: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    dateButtonText: {
        fontWeight: "600",
        textTransform: "capitalize",
    },
    todayButton: {
        position: "relative",
        height: 30,
        alignSelf: "flex-end",
        paddingHorizontal: 12,
        borderRadius: 15,
        marginTop: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    todayButtonText: {
        fontWeight: "600",
        fontFamily: "Satoshi-Bold",
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
        paddingBottom: 10,
        borderRadius: 30,
        marginLeft: "auto",
        marginRight: "auto",
        width: "90%",
        display: "flex",
        alignItems: "center",
        gap: 10,
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
