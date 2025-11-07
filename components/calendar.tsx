import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    interpolate,
    Extrapolate,
} from "react-native-reanimated";
import { useTheme } from "../lib/ThemeContext";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "react-native";
import { getImageSource } from "@/lib/imageHelper";


interface CalendarProps {
    onDateSelect?: (date: Date) => void;
    tasks?: any[];
}

export default function CalendarComponent({
    onDateSelect,
    tasks = [],
}: CalendarProps) {
    const { colors, theme } = useTheme();
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const [isExpanded, setIsExpanded] = useState(true);

    // Animation height
    const heightValue = useSharedValue(1);

    // Vérifier si un jour a des tâches
    const dayHasTasks = (dayNumber: number) => {
        const date = new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth(),
            dayNumber
        );

        return tasks.some((task) => {
            if (!task.date) return false;
            const taskDate = new Date(task.date);
            return (
                taskDate.getDate() === date.getDate() &&
                taskDate.getMonth() === date.getMonth() &&
                taskDate.getFullYear() === date.getFullYear()
            );
        });
    };

    // Vérifier si toutes les tâches d'un jour sont complétées
    const allTasksCompletedForDay = (dayNumber: number) => {
        const date = new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth(),
            dayNumber
        );

        const dayTasks = tasks.filter((task) => {
            if (!task.date) return false;
            const taskDate = new Date(task.date);
            return (
                taskDate.getDate() === date.getDate() &&
                taskDate.getMonth() === date.getMonth() &&
                taskDate.getFullYear() === date.getFullYear()
            );
        });

        return dayTasks.length > 0 && dayTasks.every((task) => task.done);
    };

    // Obtenir les jours du mois
    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    // Obtenir le premier jour du mois
    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    // Naviguer vers le mois précédent
    const previousMonth = () => {
        setCurrentMonth(
            new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
        );
    };

    // Naviguer vers le mois suivant
    const nextMonth = () => {
        setCurrentMonth(
            new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
        );
    };

    // Obtenir le nom du mois
    const getMonthName = (date: Date) => {
        const months = [
            "Janvier",
            "Février",
            "Mars",
            "Avril",
            "Mai",
            "Juin",
            "Juillet",
            "Août",
            "Septembre",
            "Octobre",
            "Novembre",
            "Décembre",
        ];
        return months[date.getMonth()];
    };

    // Obtenir le nom du jour de la semaine
    const getDayName = (index: number) => {
        const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
        return days[index];
    };

    // Générer la grille du calendrier
    const generateCalendarDays = () => {
        const daysInMonth = getDaysInMonth(currentMonth);
        const firstDayOfMonth = getFirstDayOfMonth(currentMonth);
        const days: (number | null)[] = Array(firstDayOfMonth).fill(null);

        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }

        return days;
    };

    const calendarDays = generateCalendarDays();
    const dayNames = Array.from({ length: 7 }, (_, i) => getDayName(i));

    // Gestion de la rétraction
    const toggleExpanded = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsExpanded(!isExpanded);
        heightValue.value = withSpring(isExpanded ? 0 : 1);
    };

    // Animation style pour le contenu du calendrier
    const animatedContentStyle = useAnimatedStyle(() => {
        return {
            opacity: heightValue.value,
            maxHeight: heightValue.value * 400,
        };
    });

    // Animation de rotation du chevron
    const animatedChevronStyle = useAnimatedStyle(() => {
        const rotation = interpolate(
            heightValue.value,
            [0, 1],
            [0, 180],
            Extrapolate.CLAMP
        );
        return {
            transform: [{ rotate: `${rotation}deg` }],
        };
    });

    // Rendu d'un jour
    const renderDay = (dayNumber: number | null, index: number) => {
        if (dayNumber === null) {
            return (
                <View key={`empty-${index}`} style={styles.emptyDay} />
            );
        }

        const date = new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth(),
            dayNumber
        );
        const isSelected =
            selectedDate.getDate() === dayNumber &&
            selectedDate.getMonth() === currentMonth.getMonth() &&
            selectedDate.getFullYear() === currentMonth.getFullYear();
        const isToday =
            new Date().getDate() === dayNumber &&
            new Date().getMonth() === currentMonth.getMonth() &&
            new Date().getFullYear() === currentMonth.getFullYear();

        return (
            <TouchableOpacity
                key={`day-${dayNumber}`}
                style={[
                    styles.day,
                    isSelected && {
                        backgroundColor: "black",
                        borderRadius: 8,
                    },
                    isToday && !isSelected && {
                        borderColor: colors.button,
                        borderWidth: 1,
                    },
                ]}
                onPress={() => {
                    setSelectedDate(date);
                    onDateSelect?.(date);
                }}
            >
                <Text
                    style={[
                        styles.dayText,
                        {
                            color: isSelected ? "white" : colors.text,
                            fontWeight: isToday ? "bold" : "normal",
                        },
                    ]}
                >
                    {dayNumber}
                </Text>

                {/* Point indicateur si le jour a des tâches */}
                {dayHasTasks(dayNumber) && (
                    <View
                        style={[
                            styles.taskIndicator,
                            {
                                backgroundColor: allTasksCompletedForDay(dayNumber)
                                    ? isSelected ? colors.doneSecondary : colors.checkboxDone
                                    : isSelected ? "white" : colors.button,
                            },
                        ]}
                    />
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container]}>
            {/* Barre compressée/en-tête rétractable */}
            <View style={[styles.collapsedHeader]}>
                {/* <MaterialIcons name="calendar-today" size={20} color={colors.button} /> */}
                <Text style={[styles.collapsedText, { color: colors.text }]}>
                    {selectedDate.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                </Text>

                <View style={{ flexDirection: "row", alignItems: "center", position: "relative" }}>
                    {selectedDate.toDateString() !== new Date().toDateString() && (
                        <TouchableOpacity
                            onPress={() => {
                                const today = new Date();
                                setSelectedDate(today);
                                setCurrentMonth(today);
                                onDateSelect?.(today);
                            }}
                            style={styles.todayButton}
                        >
                            <Image
                                style={[
                                    {
                                        width: '100%',
                                        height: '100%',
                                        tintColor: colors.text,
                                    },
                                ]}
                                source={getImageSource('today', theme)}>
                            </Image>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        onPress={toggleExpanded}
                        style={styles.toggleButton}
                    >
                        <Animated.Image
                            source={getImageSource('chevron', theme)}
                            style={[
                                {
                                    width: '100%',
                                    height: '100%',
                                    tintColor: colors.text,
                                },
                                animatedChevronStyle,
                            ]}
                        />
                    </TouchableOpacity>
                </View>
                {/* Bouton "Aujourd'hui" */}
            </View>

            {/* Contenu du calendrier animé */}
            <Animated.View style={[animatedContentStyle, { overflow: "hidden", backgroundColor: colors.card, borderRadius: 8 }]}>
                {/* En-tête du calendrier */}
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={previousMonth} style={styles.navButton}>
                        <Text style={{ color: colors.textSecondary, fontSize: 24 }}>←</Text>
                    </TouchableOpacity>

                    <Text
                        style={[
                            styles.monthYear,
                            {
                                color: colors.text,
                            },
                        ]}
                    >
                        {getMonthName(currentMonth)} {currentMonth.getFullYear()}
                    </Text>

                    <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
                        <Text style={{ color: colors.textSecondary, fontSize: 24 }}>→</Text>
                    </TouchableOpacity>
                </View>

                {/* Jours de la semaine */}
                <View style={styles.weekDaysContainer}>
                    {dayNames.map((day) => (
                        <View key={day} style={styles.weekDayCell}>
                            <Text
                                style={[
                                    styles.weekDayText,
                                    {
                                        color: colors.textSecondary,
                                    },
                                ]}
                            >
                                {day}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Grille des jours */}
                <View style={styles.calendarGrid}>
                    {calendarDays.map((day, index) => renderDay(day, index))}
                </View>
            </Animated.View>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 8,
        marginTop: 8,
    },
    collapsedHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        position: "relative",
    },
    collapsedText: {
        fontSize: 38,
        fontFamily: 'Satoshi-Regular',
        paddingHorizontal: 8,
    },
    todayButton: {
        height: 30,
        width: 30,
        alignItems: "center",
        justifyContent: "center",
    },
    todayButtonText: {
        fontSize: 11,
        fontWeight: "600",
        fontFamily: "Satoshi-Bold",
    },
    toggleButton: {
        height: 44,
        width: 44,
        alignItems: "center",
        justifyContent: "center",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        marginBottom: 8,
    },
    navButton: {
        padding: 6,
        borderRadius: 6,
    },
    monthYear: {
        fontSize: 14,
        fontWeight: "600",
        fontFamily: "Satoshi-Bold",
    },
    weekDaysContainer: {
        flexDirection: "row",
        marginBottom: 6,
    },
    weekDayCell: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 4,
    },
    weekDayText: {
        fontSize: 14,
        fontWeight: "600",
        fontFamily: "Satoshi-Medium",
    },
    calendarGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginBottom: -60,
        paddingHorizontal: 8,
    },
    day: {
        width: "14.28%",
        aspectRatio: 1,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 6,
        position: "relative",
        marginBottom: 2,
    },
    emptyDay: {
        width: "14.28%",
        aspectRatio: 1,
    },
    dayText: {
        fontSize: 16,
        fontWeight: "500",
        fontFamily: "Satoshi-Medium",
    },
    taskIndicator: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        position: "absolute",
        bottom: 2,
    },
});
