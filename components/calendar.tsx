import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from "react";
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

// Constantes statiques - créées une seule fois
const MONTHS = [
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

const DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

// Fonction utilitaire pour comparer les dates efficacement
const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
        date1.getDate() === date2.getDate() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getFullYear() === date2.getFullYear()
    );
};

// Composant affichage date en mode collapsed - MEMOIZED
const CollapsedDateDisplay = memo(({ selectedDate, colors }: any) => {
    const dateStr = useMemo(() => {
        return selectedDate.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
    }, [selectedDate]);
    
    return (
        <Text style={[styles.collapsedText, { color: colors.text }]}>
            {dateStr}
        </Text>
    );
}, (prev, next) => {
    return isSameDay(prev.selectedDate, next.selectedDate) && prev.colors === next.colors;
});
CollapsedDateDisplay.displayName = 'CollapsedDateDisplay';

// Composant jour memoïzé avec comparateur personnalisé
const DayCell = memo(({ 
    dayNumber, 
    index, 
    currentMonth, 
    selectedDate, 
    colors, 
    taskMap, 
    onPress 
}: any) => {
    if (dayNumber === null) {
        return <View key={`empty-${index}`} style={styles.emptyDay} />;
    }

    const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        dayNumber
    );
    const isSelected = isSameDay(selectedDate, date);
    const isToday = isSameDay(new Date(), date);
    const dayKey = `${date.getFullYear()}-${date.getMonth()}-${dayNumber}`;
    const taskInfo = taskMap[dayKey];

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
            onPress={onPress}
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
            {taskInfo?.hasTasks && (
                <View
                    style={[
                        styles.taskIndicator,
                        {
                            backgroundColor: taskInfo.allCompleted
                                ? isSelected ? "black" : "rgba(255, 255, 255, 0.5)"
                                : isSelected ? "black" : "white",
                        },
                    ]}
                />
            )}
        </TouchableOpacity>
    );
}, (prevProps, nextProps) => {
    // Retourner true si les props sont identiques (ne pas re-render)
    return (
        prevProps.dayNumber === nextProps.dayNumber &&
        prevProps.index === nextProps.index &&
        prevProps.currentMonth === nextProps.currentMonth &&
        isSameDay(prevProps.selectedDate, nextProps.selectedDate) &&
        prevProps.colors === nextProps.colors &&
        prevProps.taskMap === nextProps.taskMap
    );
});
DayCell.displayName = 'DayCell';

// Composant jour slider memoïzé avec comparateur personnalisé
const SliderDayCell = memo(({ 
    date, 
    isSelected, 
    isToday, 
    colors, 
    taskInfo, 
    onPress, 
    getDayName 
}: any) => {
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
            onPress={onPress}
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
            {taskInfo?.hasTasks && (
                <View
                    style={[
                        styles.sliderTaskIndicator,
                        {
                            backgroundColor: taskInfo.allCompleted
                                ? isSelected ? colors.button : colors.checkboxDone
                                : isSelected ? "black" : "white",
                        },
                    ]}
                />
            )}
        </TouchableOpacity>
    );
}, (prevProps, nextProps) => {
    // Retourner true si les props sont identiques (ne pas re-render)
    return (
        isSameDay(prevProps.date, nextProps.date) &&
        prevProps.isSelected === nextProps.isSelected &&
        prevProps.isToday === nextProps.isToday &&
        prevProps.colors === nextProps.colors &&
        prevProps.taskInfo === nextProps.taskInfo
    );
});
SliderDayCell.displayName = 'SliderDayCell';

export default function CalendarComponent({
    onDateSelect,
    tasks = [],
    slider = false,
}: CalendarProps) {
    const { colors, theme } = useTheme();
    // Initialiser la date sélectionnée une seule fois
    const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
    const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
    const [isExpanded, setIsExpanded] = useState(false);
    const sliderRef = useRef<FlatList>(null);
    const panResponderRef = useRef<any>(null);
    const isExpandedRef = useRef(false);
    const calendarHeightRef = useRef(0);
    const isInitialScrollRef = useRef(true); // Track si c'est le premier scroll

    // Animation height - reanimated shared values
    const heightValue = useSharedValue(0);

    // Mettre à jour la ref quand isExpanded change
    useEffect(() => {
        isExpandedRef.current = isExpanded;
    }, [isExpanded]);

    // Setup PanResponder for drag handle - avec cleanup
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

        // Cleanup: réinitialiser la ref quand le composant unmount ou slider change
        return () => {
            panResponderRef.current = null;
        };
    }, [slider]);

    // Vérifier si un jour a des tâches - CACHED avec useMemo
    const taskMap = useMemo(() => {
        const map: Record<string, { hasTasks: boolean; allCompleted: boolean }> = {};
        
        tasks.forEach((task) => {
            if (!task.date) return;
            const taskDate = new Date(task.date);
            const key = `${taskDate.getFullYear()}-${taskDate.getMonth()}-${taskDate.getDate()}`;
            
            if (!map[key]) {
                map[key] = { hasTasks: true, allCompleted: true };
            } else {
                map[key].hasTasks = true;
            }
            
            if (!task.done) {
                map[key].allCompleted = false;
            }
        });
        
        return map;
    }, [tasks]);

    // Obtenir les jours du mois - MEMOIZED
    const getDaysInMonth = useCallback((date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    }, []);

    // Obtenir le premier jour du mois - MEMOIZED
    const getFirstDayOfMonth = useCallback((date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    }, []);

    // Naviguer vers le mois précédent
    const previousMonth = useCallback(() => {
        setCurrentMonth(
            new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
        );
    }, [currentMonth]);

    // Naviguer vers le mois suivant
    const nextMonth = useCallback(() => {
        setCurrentMonth(
            new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
        );
    }, [currentMonth]);

    // Obtenir le nom du mois - simple lookup
    const getMonthName = useCallback((date: Date) => {
        return MONTHS[date.getMonth()];
    }, []);

    // Obtenir le nom du jour de la semaine - simple lookup
    const getDayName = useCallback((index: number) => {
        return DAYS[index];
    }, []);

    // Générer la grille du calendrier - MEMOIZED
    const calendarDays = useMemo(() => {
        const daysInMonth = getDaysInMonth(currentMonth);
        const firstDayOfMonth = getFirstDayOfMonth(currentMonth);
        const days: (number | null)[] = Array(firstDayOfMonth).fill(null);

        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }

        return days;
    }, [currentMonth, getDaysInMonth, getFirstDayOfMonth]);

    // Jours de la semaine - réutiliser directement la constante
    const dayNames = DAYS;

    // Générer une liste de jours infinie - MEMOIZED et LIMITED (12 mois seulement)
    const infiniteDays = useMemo(() => {
        const baseDate = new Date(); // Date d'aujourd'hui
        const days: Date[] = [];
        
        // Générer 12 mois total (6 passé, 6 futur) pour réduire au minimum
        for (let i = -180; i < 180; i++) {
            const date = new Date(baseDate);
            date.setDate(date.getDate() + i);
            days.push(date);
        }
        return days;
    }, []);

    // Calculer le nombre de semaines du mois actuel - MEMOIZED
    const weeksInMonth = useMemo(() => {
        const daysInMonth = getDaysInMonth(currentMonth);
        const firstDayOfMonth = getFirstDayOfMonth(currentMonth);
        let weekCount = 1;

        for (let i = 1; i <= daysInMonth; i++) {
            if ((firstDayOfMonth + i - 1) % 7 === 0 && i < daysInMonth) {
                weekCount++;
            }
        }

        return weekCount;
    }, [currentMonth, getDaysInMonth, getFirstDayOfMonth]);
    
    // Hauteur: header(~26px) + weekDays(~20px) + grid(numberOfWeeks * 40px + spacing)
    const calendarHeight = 26 + 40 + (weeksInMonth * 40);

    // Mettre à jour la ref de calendarHeight
    useEffect(() => {
        calendarHeightRef.current = calendarHeight;
    }, [calendarHeight]);

    // Trouver l'index du jour sélectionné - MEMOIZED
    const getSelectedDateIndex = useCallback(() => {
        const index = infiniteDays.findIndex((d) => isSameDay(d, selectedDate));
        // Si la date n'est pas trouvée, retourner un index valide (milieu de la liste)
        return index >= 0 ? index : Math.floor(infiniteDays.length / 2);
    }, [selectedDate, infiniteDays]);

    // Scroll vers le jour sélectionné au changement - avec cleanup du timeout
    useEffect(() => {
        if (!slider || !sliderRef.current) return;

        const index = getSelectedDateIndex();
        // Vérifier que l'index est valide avant de scroller
        if (index >= 0 && index < infiniteDays.length) {
            // Au premier montage, non-animé + délai; aux sélections suivantes, animé
            const isFirstScroll = isInitialScrollRef.current;
            const timeoutId = setTimeout(() => {
                try {
                    sliderRef.current?.scrollToIndex({
                        index,
                        animated: !isFirstScroll,
                        viewPosition: 0.5,
                    });
                    // Marquer le premier scroll comme complété
                    if (isFirstScroll) {
                        isInitialScrollRef.current = false;
                    }
                } catch (e) {
                    // Ignorer les erreurs si l'index est invalide
                }
            }, isFirstScroll ? 100 : 0);

            // Cleanup: annuler le timeout quand le composant unmount ou les dépendances changent
            return () => clearTimeout(timeoutId);
        }
    }, [selectedDate, slider, infiniteDays.length, getSelectedDateIndex]);

    // Gestion de la sélection de date
    const handleDateSelect = useCallback((date: Date) => {
        setSelectedDate(new Date(date));
        onDateSelect?.(new Date(date));
    }, [onDateSelect]);

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
    const getWeeksInMonth = useCallback(() => {
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
    }, [currentMonth, getDaysInMonth, getFirstDayOfMonth]);

    // Afficher la semaine en format readable
    const getWeekDisplay = useCallback((weekIndex: number) => {
        const weeks = getWeeksInMonth();
        if (weekIndex >= weeks.length) return "";

        const week = [...weeks[weekIndex]];
        const firstDay = week.find((day) => day !== null);
        const lastDay = [...week].reverse().find((day) => day !== null);

        if (firstDay && lastDay) {
            return `${firstDay}-${lastDay} ${getMonthName(currentMonth)}`;
        }
        return "";
    }, [getWeeksInMonth, getMonthName, currentMonth]);

    // Créer les enfants de la grille des jours - MEMOIZED
    const dayGridItems = useMemo(() => {
        return calendarDays.map((day, index) => {
            if (day === null) {
                return (
                    <View 
                        key={`empty-${currentMonth.getFullYear()}-${currentMonth.getMonth()}-${index}`}
                        style={styles.emptyDay} 
                    />
                );
            }

            const date = new Date(
                currentMonth.getFullYear(),
                currentMonth.getMonth(),
                day
            );

            return (
                <DayCell
                    key={`day-${currentMonth.getFullYear()}-${currentMonth.getMonth()}-${day}`}
                    dayNumber={day}
                    index={index}
                    currentMonth={currentMonth}
                    selectedDate={selectedDate}
                    colors={colors}
                    taskMap={taskMap}
                    onPress={() => handleDateSelect(date)}
                />
            );
        });
    }, [calendarDays, currentMonth, selectedDate, colors, taskMap, handleDateSelect]);

    return (
        <View style={[styles.container]}>
            {/* Slider avec calendrier intérieur */}
            <Animated.View 
                style={[styles.sliderBackground, animatedSliderStyle]}
            >
                {slider ? (
                    <>
                        {/* FlatList des jours - optimisée */}
                        <FlatList
                            ref={sliderRef}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            data={infiniteDays}
                            keyExtractor={(item, index) => `${item.toISOString()}-${index}`}
                            renderItem={({ item: date }) => {
                                const isSelected = isSameDay(selectedDate, date);
                                const isToday = isSameDay(new Date(), date);
                                const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
                                const taskInfo = taskMap[dayKey];

                                return (
                                    <SliderDayCell
                                        date={date}
                                        isSelected={isSelected}
                                        isToday={isToday}
                                        colors={colors}
                                        taskInfo={taskInfo}
                                        onPress={() => handleDateSelect(date)}
                                        getDayName={getDayName}
                                    />
                                );
                            }}
                            scrollEventThrottle={16}
                            getItemLayout={(data, index) => ({
                                length: 68,
                                offset: 68 * index,
                                index,
                            })}
                            windowSize={10}
                            maxToRenderPerBatch={5}
                            updateCellsBatchingPeriod={50}
                            removeClippedSubviews={true}
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
                                {dayGridItems}
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
                    <CollapsedDateDisplay selectedDate={selectedDate} colors={colors} />
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
        backgroundColor: "#272727ff",
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
        backgroundColor: "#353535ff",
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
