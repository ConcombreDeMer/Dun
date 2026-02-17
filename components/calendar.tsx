import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    FlatList,
    PanResponder,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import Animated, {
    Extrapolate,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";
import { useFont } from "../lib/FontContext";
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/ThemeContext";
import TaskIndicator from "./taskIndicator";


interface CalendarProps {
    onDateSelect?: (date: Date) => void;
    days?: any[];
    slider?: boolean;
    initialDate?: Date;
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

// Fonction utilitaire pour créer une date en UTC
const createUTCDate = (year: number, month: number, day: number): Date => {
    return new Date(Date.UTC(year, month, day));
};

// Fonction utilitaire pour obtenir la clé du jour (format YYYY-MM-DD)
const getDayKey = (date: Date): string => {
    const utcDate = new Date(date.toISOString());
    const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(utcDate.getUTCDate()).padStart(2, '0');
    return `${utcDate.getUTCFullYear()}-${month}-${day}`;
};

// Fonction utilitaire pour comparer les dates efficacement
const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
        date1.getDate() === date2.getDate() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getFullYear() === date2.getFullYear()
    );
};

// Composant affichage date en mode collapsed - MEMOIZED
const CollapsedDateDisplay = memo(({ selectedDate, colors, fontSizes }: any) => {
    const dateStr = useMemo(() => {
        return selectedDate.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
    }, [selectedDate]);

    return (
        <Text style={[styles.collapsedText, { color: colors.text, fontSize: fontSizes['4xl'] }]}>
            {dateStr}
        </Text>
    );
}, (prev, next) => {
    return isSameDay(prev.selectedDate, next.selectedDate) && prev.colors === next.colors && prev.fontSizes === next.fontSizes;
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
    onPress,
    fontSizes
}: any) => {
    if (dayNumber === null) {
        return <View key={`empty-${index}`} style={styles.emptyDay} />;
    }

    const date = createUTCDate(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        dayNumber
    );

    const isSelected = isSameDay(selectedDate, date);
    const isToday = isSameDay(new Date(), date);
    const dayKey = getDayKey(date);


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
                        fontSize: fontSizes.lg,
                    },
                ]}
            >
                {dayNumber}
            </Text>

            {/* Point indicateur si le jour a des tâches */}
            {taskMap[dayKey] && (
                <TaskIndicator
                    type={taskMap[dayKey].type}
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
        prevProps.taskMap === nextProps.taskMap &&
        prevProps.fontSizes === nextProps.fontSizes
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
    getDayName,
    fontSizes
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
            <Text style={[styles.sliderDayName, { color: colors.button, fontSize: fontSizes.sm }]}>
                {getDayName(date.getDay())}
            </Text>
            <Text
                style={[
                    styles.sliderDayNumber,
                    {
                        color: isSelected ? "black" : "white",
                        fontSize: fontSizes.xl,
                    },
                ]}
            >
                {date.getDate()}
            </Text>
            {/* Point indicateur si le jour a des tâches */}
            {taskInfo && (
                <TaskIndicator
                    type={taskInfo.type}
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
        prevProps.taskInfo === nextProps.taskInfo &&
        prevProps.fontSizes === nextProps.fontSizes
    );
});
SliderDayCell.displayName = 'SliderDayCell';

export default function CalendarComponent({
    onDateSelect,
    slider = false,
    initialDate,
}: CalendarProps) {
    const { colors, theme } = useTheme();
    const { fontSizes } = useFont();
    // Initialiser la date sélectionnée une seule fois
    const [selectedDate, setSelectedDate] = useState<Date>(() => initialDate || new Date());
    const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
    const [isExpanded, setIsExpanded] = useState(false);
    const sliderRef = useRef<FlatList>(null);
    const panResponderRef = useRef<any>(null);
    const isExpandedRef = useRef(false);
    const calendarHeightRef = useRef(0);
    const isInitialScrollRef = useRef(true); // Track si c'est le premier scroll

    // Animation pour la hauteur du bouton "Retour à aujourd'hui"
    const todayButtonHeightValue = useSharedValue(0);
    const todayButtonOpacityValue = useSharedValue(0);

    // Animation pour le calendrier entier lors du drag
    const calendarScaleRef = useSharedValue(1);



    const getDays = async () => {
        const { data, error } = await supabase
            .from("Days")
            .select("*")
            .order("date", { ascending: true });
        if (error) {
            console.error('Erreur lors de la récupération des jours:', error);
            return [];
        }
        return data;
    }

    const daysQuery = useQuery({
        queryKey: ['days'],
        queryFn: getDays,
    });


    // Vérifier si un jour a des tâches - CACHED avec useMemo
    const taskIndicatorByDay = useMemo<{ [key: string]: { type: number } }>(() => {
        // Attendre que les données soient chargées
        if (!daysQuery.data) {
            return {};
        }

        const map: { [key: string]: { type: number } } = {};
        const days = daysQuery.data;

        days.forEach((day) => {
            if (day.total === day.done_count && day.total > 0) {
                map[day.date] = { type: 3 }; // Toutes les tâches complétées
            } else if (day.total > 0) {
                map[day.date] = { type: 2 }; // Tâches en cours
            } else {
                map[day.date] = { type: 1 }; // Pas de tâches
            }
        });
        return map;

    }, [daysQuery.data]);



    // Animation height - reanimated shared values
    const heightValue = useSharedValue(0);

    // Mettre à jour la hauteur du bouton avec animation
    useEffect(() => {
        const shouldShow = !isSameDay(selectedDate, new Date());
        todayButtonHeightValue.value = withSpring(shouldShow ? 30 : 0);
        todayButtonOpacityValue.value = withSpring(shouldShow ? 1 : 0);
    }, [selectedDate, todayButtonHeightValue, todayButtonOpacityValue]);

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
                // Animer le calendrier selon la direction du drag
                // Si drag vers le bas (expand): scale à 0.98
                // Si drag vers le haut (collapse): scale à 1.02
                const scaleValue = gestureState.dy > 0 ? 0.98 : 1.02;
                calendarScaleRef.value = withSpring(scaleValue, { friction: 7, tension: 30 });

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
                // Réinitialiser la scale du calendrier
                calendarScaleRef.value = withSpring(1, { friction: 7, tension: 30 });

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

    // Animation de hauteur du bouton "Retour à aujourd'hui"
    const animatedTodayButtonStyle = useAnimatedStyle(() => {
        return {
            height: todayButtonHeightValue.value,
            opacity: todayButtonOpacityValue.value,
        };
    });

    // Animation de scale du calendrier
    const animatedCalendarScaleStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: calendarScaleRef.value }],
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

            const date = createUTCDate(
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
                    taskMap={taskIndicatorByDay}
                    fontSizes={fontSizes}
                    onPress={() => handleDateSelect(date)}
                />
            );
        });
    }, [calendarDays, currentMonth, selectedDate, colors, taskIndicatorByDay, fontSizes, handleDateSelect]);

    return (



        <View style={[styles.container]}>
            {/* Slider avec calendrier intérieur */}
            <Animated.View
                style={[styles.sliderBackground, animatedSliderStyle, animatedCalendarScaleStyle]}
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
                                const dayKey = getDayKey(date);
                                return (
                                    <SliderDayCell
                                        date={date}
                                        isSelected={isSelected}
                                        isToday={isToday}
                                        colors={colors}
                                        taskInfo={taskIndicatorByDay[dayKey]}
                                        fontSizes={fontSizes}
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
                                    <Text style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: fontSizes.xl }}>←</Text>
                                </TouchableOpacity>

                                <Text
                                    style={[
                                        styles.monthYear,
                                        {
                                            color: "white",
                                            fontSize: fontSizes.base,
                                        },
                                    ]}
                                >
                                    {getMonthName(currentMonth)} {currentMonth.getFullYear()}
                                </Text>

                                <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
                                    <Text style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: fontSizes.xl }}>→</Text>
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
                                                    fontSize: fontSizes.sm,
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
                    <CollapsedDateDisplay selectedDate={selectedDate} colors={colors} fontSizes={fontSizes} />
                )}
            </Animated.View>

            <TouchableOpacity
                activeOpacity={0.7}
                onPress={async () => {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    const today = new Date();
                    handleDateSelect(today);
                }}
            >
                <Animated.View
                    style={[
                        styles.todayButton,
                        animatedTodayButtonStyle,
                        {
                            overflow: 'hidden',
                        }
                    ]}
                >
                    <Text style={[styles.todayButtonText, { color: colors.textSecondary, fontSize: fontSizes.xs }]}>Retour à aujourd'hui</Text>
                </Animated.View>
            </TouchableOpacity>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 8,
        paddingHorizontal: 20,
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
        borderRadius: 15,
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
        borderRadius: 15,
        overflow: "hidden",
        alignSelf: "center",
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
        fontWeight: "600",
        fontFamily: "Satoshi-Medium",
        marginBottom: 2,
    },
    sliderDayNumber: {
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
        position: "relative",
        height: 30,
        alignSelf: "flex-end",
        paddingHorizontal: 12,
        borderRadius: 15,
        backgroundColor: "#272727ff",
        marginTop: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    todayButtonText: {
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
