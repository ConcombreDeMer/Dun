import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    FlatList,
    PanResponder,
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
    slider?: boolean;
}

export default function CalendarComponent({
    onDateSelect,
    tasks = [],
    slider = false,
}: CalendarProps) {
    const { colors, theme } = useTheme();
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedWeek, setSelectedWeek] = useState<number>(0);
    const sliderRef = useRef<FlatList>(null);
    const panResponderRef = useRef<any>(null);
    const isExpandedRef = useRef(false);
    const calendarHeightRef = useRef(0);

    // Animation height - reanimated shared values
    const heightValue = useSharedValue(0);

    // Mettre à jour la ref quand isExpanded change
    useEffect(() => {
        isExpandedRef.current = isExpanded;
    }, [isExpanded]);

    // Setup PanResponder for drag handle
    useEffect(() => {
        if (!slider) return;

        const panResponder = PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderMove: (event, gestureState) => {
                // Utiliser les refs pour avoir les valeurs actuelles
                const height = calendarHeightRef.current;
                if (isExpandedRef.current) {
                    // Quand on est expanded, drag vers le haut rétracts
                    const dragDistance = Math.max(0, Math.min(height, height + gestureState.dy));
                    heightValue.value = dragDistance / height;
                } else {
                    // Quand on n'est pas expanded, drag vers le bas déploie
                    const dragDistance = Math.max(0, Math.min(height, gestureState.dy));
                    heightValue.value = dragDistance / height;
                }
            },
            onPanResponderRelease: (event, gestureState) => {
                const height = calendarHeightRef.current;
                if (isExpandedRef.current) {
                    // Quand on est expanded, si on drag vers le haut de plus de 30% de la hauteur, on rétracte
                    if (gestureState.dy < -(height * 0.3)) {
                        heightValue.value = withSpring(0);
                        setIsExpanded(false);
                    } else {
                        // Sinon, on revient à expanded
                        heightValue.value = withSpring(1);
                    }
                } else {
                    // Quand on n'est pas expanded, si on drag vers le bas de plus de 30% de la hauteur, on déploie
                    if (gestureState.dy > (height * 0.3)) {
                        heightValue.value = withSpring(1);
                        setIsExpanded(true);
                    } else {
                        // Sinon, on revient à collapsed
                        heightValue.value = withSpring(0);
                    }
                }
            },
        });

        panResponderRef.current = panResponder;
    }, [slider]);

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

    // Helper pour vérifier les tâches d'une date complète
    const checkTasksForDate = (date: Date) => {
        const tasksForDate = tasks.filter((task) => {
            if (!task.date) return false;
            const taskDate = new Date(task.date);
            return (
                taskDate.getDate() === date.getDate() &&
                taskDate.getMonth() === date.getMonth() &&
                taskDate.getFullYear() === date.getFullYear()
            );
        });

        return {
            hasTasks: tasksForDate.length > 0,
            allCompleted: tasksForDate.length > 0 && tasksForDate.every((task) => task.done),
        };
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

    // Générer une liste de jours infinie (à partir d'une date d'origine)
    const getInfiniteSliderDays = () => {
        const baseDate = new Date(1990, 0, 1); // Date d'origine reculée
        const days = [];
        
        // Générer 100 ans de jours (passé et futur)
        for (let i = -15000; i < 15000; i++) {
            const date = new Date(baseDate);
            date.setDate(date.getDate() + i);
            days.push(date);
        }
        return days;
    };

    const infiniteDays = getInfiniteSliderDays();

    // Calculer le nombre de semaines du mois actuel pour adapter la hauteur
    const getWeeksInMonthLocal = () => {
        const daysInMonth = getDaysInMonth(currentMonth);
        const firstDayOfMonth = getFirstDayOfMonth(currentMonth);
        let weekCount = 1;

        for (let i = 1; i <= daysInMonth; i++) {
            if ((firstDayOfMonth + i - 1) % 7 === 0 && i < daysInMonth) {
                weekCount++;
            }
        }

        return weekCount;
    };

    const weeksInMonth = getWeeksInMonthLocal();
    // Hauteur: header(~26px) + weekDays(~20px) + grid(numberOfWeeks * 40px + spacing)
    const calendarHeight = 26 + 40 + (weeksInMonth * 40);

    // Mettre à jour la ref de calendarHeight
    useEffect(() => {
        calendarHeightRef.current = calendarHeight;
    }, [calendarHeight]);

    // Trouver l'index du jour sélectionné - avec vérification stricte
    const getSelectedDateIndex = () => {
        const index = infiniteDays.findIndex(
            (d) =>
                d.getDate() === selectedDate.getDate() &&
                d.getMonth() === selectedDate.getMonth() &&
                d.getFullYear() === selectedDate.getFullYear()
        );
        // Si la date n'est pas trouvée, retourner un index valide (milieu de la liste)
        return index >= 0 ? index : Math.floor(infiniteDays.length / 2);
    };

    // Scroll vers le jour sélectionné au changement
    useEffect(() => {
        if (slider && sliderRef.current) {
            const index = getSelectedDateIndex();
            // Vérifier que l'index est valide avant de scroller
            if (index >= 0 && index < infiniteDays.length) {
                setTimeout(() => {
                    sliderRef.current?.scrollToIndex({
                        index,
                        animated: true,
                        viewPosition: 0.5,
                    });
                }, 0);
            }
        }
    }, [selectedDate, slider, infiniteDays.length]);

    // Gestion de la rétraction
    const toggleExpanded = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsExpanded(!isExpanded);
        heightValue.value = withSpring(isExpanded ? 0 : 1);
    };

    // Animation style pour la hauteur du slider background
    const animatedSliderStyle = useAnimatedStyle(() => {
        // La hauteur varie de 96px (initial) à 96 + calendarHeight (expanded)
        const height = 96 + heightValue.value * calendarHeight;
        return {
            minHeight: height,
        };
    });

    // Animation style pour le contenu du calendrier
    const animatedContentStyle = useAnimatedStyle(() => {
        return {
            opacity: heightValue.value,
            height: heightValue.value * calendarHeight,
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

    // Obtenir les semaines du mois
    const getWeeksInMonth = () => {
        const daysInMonth = getDaysInMonth(currentMonth);
        const firstDayOfMonth = getFirstDayOfMonth(currentMonth);
        const weeks: (number | null)[][] = [];
        let currentWeek: (number | null)[] = Array(firstDayOfMonth).fill(null);

        for (let i = 1; i <= daysInMonth; i++) {
            currentWeek.push(i);
            if (currentWeek.length === 7) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
        }

        if (currentWeek.length > 0) {
            weeks.push(currentWeek);
        }

        return weeks;
    };

    // Afficher la semaine en format readable
    const getWeekDisplay = (weekIndex: number) => {
        const weeks = getWeeksInMonth();
        if (weekIndex >= weeks.length) return "";

        const week = [...weeks[weekIndex]];
        const firstDay = week.find((day) => day !== null);
        const lastDay = [...week].reverse().find((day) => day !== null);

        if (firstDay && lastDay) {
            return `${firstDay}-${lastDay} ${getMonthName(currentMonth)}`;
        }
        return "";
    };

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
                        backgroundColor: colors.button,
                        borderRadius: 8,
                    },
                    isToday && !isSelected && {
                        borderColor: "rgba(255, 255, 255, 0.5)",
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
                            color: isSelected ? "black" : "rgba(255, 255, 255, 0.8)",
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
                                    ? isSelected ? "black" : "rgba(255, 255, 255, 0.5)"
                                    : isSelected ? "black" : "white",
                            },
                        ]}
                    />
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container]}>
            {/* Slider avec calendrier intérieur */}
            <Animated.View 
                style={[styles.sliderBackground, animatedSliderStyle]}
            >
                {slider ? (
                    <>
                        {/* FlatList des jours - toujours au top */}
                        <FlatList
                            ref={sliderRef}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            data={infiniteDays}
                            keyExtractor={(item, index) => `${item.toISOString()}-${index}`}
                            renderItem={({ item: date }) => {
                                const isSelected =
                                    selectedDate.getDate() === date.getDate() &&
                                    selectedDate.getMonth() === date.getMonth() &&
                                    selectedDate.getFullYear() === date.getFullYear();

                                const isToday =
                                    new Date().getDate() === date.getDate() &&
                                    new Date().getMonth() === date.getMonth() &&
                                    new Date().getFullYear() === date.getFullYear();

                                return (
                                    <TouchableOpacity
                                        style={[
                                            styles.sliderDay,
                                            isSelected && {
                                                backgroundColor: "white",
                                                borderRadius: 12,
                                            },
                                            isToday && !isSelected && {
                                                borderColor: colors.button,
                                                borderWidth: 1,
                                            },
                                        ]}
                                        onPress={() => {
                                            setSelectedDate(new Date(date));
                                            onDateSelect?.(new Date(date));
                                        }}
                                    >
                                        <Text style={[styles.sliderDayName, { color: colors.button }]}>
                                            {getDayName(date.getDay())}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.sliderDayNumber,
                                                {
                                                    color: isSelected ? "black" : "white",
                                                },
                                            ]}
                                        >
                                            {date.getDate()}
                                        </Text>
                                        {/* Point indicateur si le jour a des tâches */}
                                        {(() => {
                                            const { hasTasks, allCompleted } = checkTasksForDate(date);
                                            return hasTasks ? (
                                                <View
                                                    style={[
                                                        styles.sliderTaskIndicator,
                                                        {
                                                            backgroundColor: allCompleted
                                                                ? isSelected ? colors.button : colors.checkboxDone
                                                                : isSelected ? "black" : "white",
                                                        },
                                                    ]}
                                                />
                                            ) : null;
                                        })()}
                                    </TouchableOpacity>
                                );
                            }}
                            scrollEventThrottle={16}
                            getItemLayout={(data, index) => ({
                                length: 68,
                                offset: 68 * index,
                                index,
                            })}
                            style={styles.flatListSlider}
                        />

                        {/* Contenu du calendrier - grossit vers le bas */}
                        <Animated.View style={[animatedContentStyle, styles.calendarContentInside]}>
                            {/* En-tête du calendrier */}
                            <View style={[styles.header, { borderBottomColor: "rgba(255, 255, 255, 0.2)" }]}>
                                <TouchableOpacity onPress={previousMonth} style={styles.navButton}>
                                    <Text style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: 24 }}>←</Text>
                                </TouchableOpacity>

                                <Text
                                    style={[
                                        styles.monthYear,
                                        {
                                            color: "white",
                                        },
                                    ]}
                                >
                                    {getMonthName(currentMonth)} {currentMonth.getFullYear()}
                                </Text>

                                <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
                                    <Text style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: 24 }}>→</Text>
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
                                                    color: "rgba(255, 255, 255, 0.6)",
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

                        {/* Handle bar wrapper draggable - au bottom */}
                        <View
                            style={styles.handleBarWrapper}
                            {...(slider ? panResponderRef.current?.panHandlers : {})}
                        >
                            <View style={styles.handleBar} />
                        </View>
                    </>
                ) : (
                    <Text style={[styles.collapsedText, { color: colors.text }]}>
                        {selectedDate.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                    </Text>
                )}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 8,
    },
    collapsedHeader: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 10,
        position: "relative",
        gap: 8,
    },
    sliderBackground: {
        backgroundColor: "black",
        borderRadius: 30,
        paddingHorizontal: 12,
        paddingTop: 12,
        flexDirection: "column",
    },
    flatListSlider: {
        height: 80,
    },
    calendarContentInside: {
        marginTop: 12,
        backgroundColor: "#1c1c1cff",
        borderRadius: 20,
        overflow: "hidden",
    },
    handleBarWrapper: {
        height: 30,
        paddingVertical: 10,
        marginTop: -20,
        alignItems: "center",
        justifyContent: "flex-end",
        width: "120%",
        alignSelf: "center",
    },
    handleBar: {
        width: 40,
        height: 4,
        backgroundColor: "rgba(255, 255, 255, 0.5)",
        borderRadius: 2,
    },
    collapsedText: {
        fontSize: 24,
        fontFamily: 'Satoshi-Regular',
        paddingHorizontal: 8,
    },
    weekSliderContainer: {
        flexGrow: 0,
        height: 80,
    },
    sliderDay: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        justifyContent: "center",
        alignItems: "center",
        marginHorizontal: 2,
        borderRadius: 12,
        width: 64,
        height: 80,
    },
    sliderDayName: {
        fontSize: 12,
        fontWeight: "600",
        fontFamily: "Satoshi-Medium",
        marginBottom: 2,
    },
    sliderDayNumber: {
        fontSize: 18,
        fontWeight: "600",
        fontFamily: "Satoshi-Bold",
    },
    sliderTaskIndicator: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        position: "absolute",
        bottom: 8,
    },
    sliderContainer: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        justifyContent: "space-between",
    },
    sliderButton: {
        padding: 8,
        borderRadius: 6,
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
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
    },
    navButton: {
        padding: 4,
        borderRadius: 6,
    },
    monthYear: {
        fontSize: 14,
        fontWeight: "600",
        fontFamily: "Satoshi-Bold",
    },
    weekDaysContainer: {
        flexDirection: "row",
        paddingHorizontal: 8,
    },
    weekDayCell: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 2,
    },
    weekDayText: {
        fontSize: 12,
        fontWeight: "600",
        fontFamily: "Satoshi-Medium",
    },
    calendarGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
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
