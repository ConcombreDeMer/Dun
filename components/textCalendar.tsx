import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Animated as RNAnimated, Easing as RNEasing, StyleSheet, Text, View } from "react-native";
import ReAnimated, {
    Easing,
    FadeInDown,
    FadeOutUp,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { useFont } from "../lib/FontContext";
import { useAppTranslation } from "../lib/i18n";
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/ThemeContext";
import Squircle from "./Squircle";

interface TextCalendarProps {
    onDateSelect?: (date: Date) => void;
    days?: any[];
    slider?: boolean;
    initialDate?: Date;
    onExpandedChange?: (isExpanded: boolean) => void;
}

type TaskIndicatorState = {
    type: 1 | 2 | 3;
};

const CALENDAR_ROW_HEIGHT = 42;
const CALENDAR_HEADER_HEIGHT = 47;
const WEEKDAYS_HEIGHT = 22;
const GRID_BOTTOM_PADDING = 10;
const EXPANDED_TOP_GAP = 12;
const EXPANDED_HEIGHT_BUFFER = 10;

const startOfDay = (date: Date) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
};

const getDayKey = (date: Date): string => {
    const normalized = startOfDay(date);
    const month = String(normalized.getMonth() + 1).padStart(2, "0");
    const day = String(normalized.getDate()).padStart(2, "0");
    return `${normalized.getFullYear()}-${month}-${day}`;
};

const isSameDay = (date1: Date, date2: Date): boolean => (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
);

const isSameMonth = (date1: Date, date2: Date): boolean => (
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
);

const getMonthStart = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1);
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const getReadableDateParts = (date: Date, locale: string) => ({
    weekday: capitalize(date.toLocaleDateString(locale, {
        weekday: "long",
    })),
    day: date.toLocaleDateString(locale, {
        day: "numeric",
    }),
    month: capitalize(date.toLocaleDateString(locale, {
        month: "long",
    })),
});

const TextCalendarDay = memo(({
    date,
    isOutsideMonth,
    isSelected,
    isToday,
    taskInfo,
    onPress,
}: {
    date: Date;
    isOutsideMonth: boolean;
    isSelected: boolean;
    isToday: boolean;
    taskInfo?: TaskIndicatorState;
    onPress: () => void;
}) => {
    const { colors } = useTheme();
    const { fontSizes } = useFont();

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.dayCell,
                isSelected && { backgroundColor: colors.checkboxDone },
                isToday && !isSelected && { borderColor: "rgba(255, 255, 255, 0.5)", borderWidth: 1 },
                pressed && styles.dayCellPressed,
            ]}
        >
            <Text
                style={[
                    styles.dayNumber,
                    {
                        color: isSelected
                            ? colors.card
                            : isOutsideMonth
                                ? "rgba(255, 255, 255, 0.35)"
                                : "rgba(255, 255, 255, 0.8)",
                        fontSize: fontSizes.sm,
                        fontWeight: isToday ? "bold" : "normal",
                    },
                ]}
            >
                {date.getDate()}
            </Text>
            {taskInfo && taskInfo.type !== 1 ? (
                <View
                    style={[
                        styles.taskDot,
                        { backgroundColor: taskInfo.type === 2 ? "#FFAB00" : "#00C851" },
                    ]}
                />
            ) : null}
        </Pressable>
    );
}, (previous, next) => (
    isSameDay(previous.date, next.date) &&
    previous.isOutsideMonth === next.isOutsideMonth &&
    previous.isSelected === next.isSelected &&
    previous.isToday === next.isToday &&
    previous.taskInfo?.type === next.taskInfo?.type
));
TextCalendarDay.displayName = "TextCalendarDay";

export default function TextCalendarComponent({
    onDateSelect,
    initialDate,
    onExpandedChange,
}: TextCalendarProps) {
    const { colors, actualTheme } = useTheme();
    const { fontSizes } = useFont();
    const { t, language } = useAppTranslation();
    const locale = language === "en" ? "en-US" : "fr-FR";
    const [selectedDate, setSelectedDate] = useState<Date>(() => startOfDay(initialDate || new Date()));
    const [currentMonth, setCurrentMonth] = useState<Date>(() => getMonthStart(initialDate || new Date()));
    const [isExpanded, setIsExpanded] = useState(false);
    const layoutHeight = useRef(new RNAnimated.Value(0)).current;
    const onExpandedChangeRef = useRef(onExpandedChange);
    const didStartLayoutAnimationRef = useRef(false);
    const didStartDateAnimationRef = useRef(false);
    const expandedProgress = useSharedValue(0);
    const todayProgress = useSharedValue(0);
    const pressProgress = useSharedValue(0);
    const dateChangeProgress = useSharedValue(1);

    const getDays = async () => {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return [];
        }

        const { data, error } = await supabase
            .from("Days")
            .select("*")
            .eq("user_id", user.id)
            .order("date", { ascending: true });

        if (error) {
            console.error("Erreur lors de la récupération des jours:", error);
            return [];
        }

        return data;
    };

    const daysQuery = useQuery({
        queryKey: ["days"],
        queryFn: getDays,
        gcTime: 1000 * 60 * 5,
        staleTime: 1000 * 60,
    });

    useEffect(() => {
        if (initialDate && !isSameDay(initialDate, selectedDate)) {
            const nextDate = startOfDay(initialDate);
            setSelectedDate(nextDate);
            setCurrentMonth(getMonthStart(nextDate));
        }
    }, [initialDate, selectedDate]);

    useEffect(() => {
        onExpandedChangeRef.current = onExpandedChange;
    }, [onExpandedChange]);

    useEffect(() => {
        expandedProgress.value = withSpring(isExpanded ? 1 : 0, {
            damping: 18,
            stiffness: 180,
            mass: 0.9,
        });
    }, [expandedProgress, isExpanded]);

    useEffect(() => {
        todayProgress.value = withTiming(isSameDay(selectedDate, new Date()) ? 0 : 1, {
            duration: 220,
            easing: Easing.out(Easing.quad),
        });
    }, [selectedDate, todayProgress]);

    const taskIndicatorByDay = useMemo<Record<string, TaskIndicatorState>>(() => {
        if (!daysQuery.data) {
            return {};
        }

        return daysQuery.data.reduce((map: Record<string, TaskIndicatorState>, day: any) => {
            if (day.total === day.done_count && day.total > 0) {
                map[day.date] = { type: 3 };
            } else if (day.total > 0) {
                map[day.date] = { type: 2 };
            } else {
                map[day.date] = { type: 1 };
            }

            return map;
        }, {});
    }, [daysQuery.data]);

    const weekDays = useMemo(() => {
        return Array.from({ length: 7 }, (_, index) => {
            const referenceDate = new Date(Date.UTC(2024, 0, 1 + index));
            return capitalize(referenceDate.toLocaleDateString(locale, { weekday: "narrow" }));
        });
    }, [locale]);

    const calendarDays = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDayOfMonth = (new Date(year, month, 1).getDay() + 6) % 7;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const previousMonthDays = new Date(year, month, 0).getDate();
        const days: { date: Date; isOutsideMonth: boolean }[] = [];

        for (let i = firstDayOfMonth - 1; i >= 0; i--) {
            days.push({
                date: new Date(year, month - 1, previousMonthDays - i),
                isOutsideMonth: true,
            });
        }

        for (let day = 1; day <= daysInMonth; day++) {
            days.push({
                date: new Date(year, month, day),
                isOutsideMonth: false,
            });
        }

        const remainingDays = (7 - (days.length % 7)) % 7;
        for (let day = 1; day <= remainingDays; day++) {
            days.push({
                date: new Date(year, month + 1, day),
                isOutsideMonth: true,
            });
        }

        return days;
    }, [currentMonth]);

    const calendarWeeks = useMemo(() => {
        const weeks: { date: Date; isOutsideMonth: boolean }[][] = [];

        for (let index = 0; index < calendarDays.length; index += 7) {
            weeks.push(calendarDays.slice(index, index + 7));
        }

        return weeks;
    }, [calendarDays]);

    const expandedHeight = useMemo(() => {
        return EXPANDED_TOP_GAP + CALENDAR_HEADER_HEIGHT + WEEKDAYS_HEIGHT + calendarWeeks.length * CALENDAR_ROW_HEIGHT + GRID_BOTTOM_PADDING + EXPANDED_HEIGHT_BUFFER;
    }, [calendarWeeks.length]);

    useEffect(() => {
        const shouldNotifyExpandedChange = didStartLayoutAnimationRef.current;
        didStartLayoutAnimationRef.current = true;

        const animation = RNAnimated.timing(layoutHeight, {
            toValue: isExpanded ? expandedHeight : 0,
            duration: isExpanded ? 380 : 280,
            easing: isExpanded
                ? RNEasing.out(RNEasing.cubic)
                : RNEasing.inOut(RNEasing.cubic),
            useNativeDriver: false,
        });

        animation.start(({ finished }) => {
            if (finished && shouldNotifyExpandedChange) {
                onExpandedChangeRef.current?.(isExpanded);
            }
        });
        return () => layoutHeight.stopAnimation();
    }, [expandedHeight, isExpanded, layoutHeight]);

    const monthTitle = useMemo(() => {
        const month = currentMonth.toLocaleDateString(locale, { month: "long" });
        return `${capitalize(month)} ${currentMonth.getFullYear()}`;
    }, [currentMonth, locale]);

    const selectedDateParts = useMemo(() => getReadableDateParts(selectedDate, locale), [locale, selectedDate]);
    const selectedDateKey = useMemo(() => getDayKey(selectedDate), [selectedDate]);

    useEffect(() => {
        if (!didStartDateAnimationRef.current) {
            didStartDateAnimationRef.current = true;
            dateChangeProgress.value = 1;
            return;
        }

        dateChangeProgress.value = 0;
        dateChangeProgress.value = withTiming(1, {
            duration: 220,
            easing: Easing.out(Easing.cubic),
        });
    }, [dateChangeProgress, selectedDateKey]);

    const handleDateSelect = useCallback(async (date: Date) => {
        await Haptics.selectionAsync();
        const nextDate = startOfDay(date);
        setSelectedDate(nextDate);
        setCurrentMonth((previousMonth) => isSameMonth(previousMonth, nextDate) ? previousMonth : getMonthStart(nextDate));
        setIsExpanded(false);
        onDateSelect?.(nextDate);
    }, [onDateSelect]);

    const toggleExpanded = useCallback(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsExpanded((current) => !current);
    }, []);

    const goToToday = useCallback(async () => {
        await handleDateSelect(new Date());
    }, [handleDateSelect]);

    const previousMonth = useCallback(async () => {
        await Haptics.selectionAsync();
        setCurrentMonth((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1));
    }, []);

    const nextMonth = useCallback(async () => {
        await Haptics.selectionAsync();
        setCurrentMonth((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1));
    }, []);

    const contentAnimatedStyle = useAnimatedStyle(() => ({
        opacity: interpolate(expandedProgress.value, [0, 0.3, 1], [0, 0.4, 1]),
        transform: [
            { translateY: interpolate(expandedProgress.value, [0, 1], [-8, 0]) },
            { scale: interpolate(expandedProgress.value, [0, 1], [0.98, 1]) },
        ],
    }));

    const chevronAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${interpolate(expandedProgress.value, [0, 1], [0, 180])}deg` }],
    }));

    const chevronDateAnimatedStyle = useAnimatedStyle(() => ({
        opacity: interpolate(dateChangeProgress.value, [0, 1], [0, 1]),
        transform: [
            { translateY: interpolate(dateChangeProgress.value, [0, 1], [8, 0]) },
            { scale: interpolate(dateChangeProgress.value, [0, 1], [0.96, 1]) },
        ],
    }));

    const todayAnimatedStyle = useAnimatedStyle(() => ({
        width: todayProgress.value * 38,
        opacity: todayProgress.value,
        transform: [{ scale: interpolate(todayProgress.value, [0, 1], [0.9, 1]) }],
    }));

    const titlePressAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(pressProgress.value, [0, 1], [1, 0.985]) }],
    }));

    const isDark = actualTheme === "dark";
    const panelColor = "#353535ff";
    const todayButtonSurface = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.045)";
    const expandedButtonSurface = "transparent";
    const expandedTextColor = "white";
    const expandedMutedTextColor = "rgba(255, 255, 255, 0.6)";
    const expandedIconColor = "rgba(255, 255, 255, 0.7)";

    return (
        <View style={styles.container}>
            <View style={styles.topRow}>
                <Pressable
                    onPress={toggleExpanded}
                    onPressIn={() => {
                        pressProgress.value = withTiming(1, { duration: 120 });
                    }}
                    onPressOut={() => {
                        pressProgress.value = withTiming(0, { duration: 180 });
                    }}
                    style={styles.titlePressable}
                >
                    <ReAnimated.View style={[styles.titleRow, titlePressAnimatedStyle]}>
                        <View style={styles.dateTitle}>
                            <ReAnimated.Text
                                key={`weekday-${selectedDateKey}`}
                                entering={FadeInDown.delay(70).duration(220).easing(Easing.out(Easing.cubic))}
                                exiting={FadeOutUp.duration(140).easing(Easing.in(Easing.quad))}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                style={[styles.title, styles.titleWeekday, { color: colors.text, fontSize: fontSizes["3xl"] }]}
                            >
                                {selectedDateParts.weekday}
                            </ReAnimated.Text>
                            <ReAnimated.Text
                                key={`day-${selectedDateKey}`}
                                entering={FadeInDown.delay(70).duration(220).easing(Easing.out(Easing.cubic))}
                                exiting={FadeOutUp.duration(140).easing(Easing.in(Easing.quad))}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                style={[styles.title, styles.titleDay, { color: colors.text, fontSize: fontSizes["3xl"] }]}
                            >
                                {selectedDateParts.day}
                            </ReAnimated.Text>
                            <ReAnimated.Text
                                key={`month-${selectedDateKey}`}
                                entering={FadeInDown.delay(70).duration(220).easing(Easing.out(Easing.cubic))}
                                exiting={FadeOutUp.duration(140).easing(Easing.in(Easing.quad))}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                style={[styles.title, styles.titleMonth, { color: colors.text, fontSize: fontSizes["3xl"] }]}
                            >
                                {selectedDateParts.month}
                            </ReAnimated.Text>
                        </View>
                        <ReAnimated.View style={[styles.chevron, chevronDateAnimatedStyle]}>
                            <ReAnimated.View style={[styles.chevronIcon, chevronAnimatedStyle]}>
                                <Feather name="chevron-down" size={22} color={colors.textSecondary} strokeWidth={2.4} />
                            </ReAnimated.View>
                        </ReAnimated.View>
                    </ReAnimated.View>
                </Pressable>

                <ReAnimated.View style={[styles.todayClip, todayAnimatedStyle]}>
                    <Pressable
                        accessibilityLabel={t("calendar.backToToday")}
                        onPress={goToToday}
                        style={({ pressed }) => [
                            styles.todayIconButton,
                            { backgroundColor: todayButtonSurface },
                            pressed && styles.todayPillPressed,
                        ]}
                    >
                        <Feather name="rotate-ccw" size={16} color={colors.textSecondary} strokeWidth={2.4} />
                    </Pressable>
                </ReAnimated.View>
            </View>

            <RNAnimated.View
                pointerEvents={isExpanded ? "auto" : "none"}
                style={[styles.expandedClip, { height: layoutHeight }]}
            >
                <ReAnimated.View style={contentAnimatedStyle}>
                    <Squircle style={[styles.panel, { backgroundColor: panelColor, borderColor: "rgba(255, 255, 255, 0.2)" }]}>
                        <View style={[styles.monthHeader, { borderBottomColor: "rgba(255, 255, 255, 0.2)" }]}>
                            <Pressable
                                onPress={previousMonth}
                                style={({ pressed }) => [styles.monthButton, { backgroundColor: expandedButtonSurface }, pressed && styles.monthButtonPressed]}
                            >
                                <Feather name="chevron-left" size={18} color={expandedIconColor} strokeWidth={2.3} />
                            </Pressable>
                            <Text style={[styles.monthTitle, { color: expandedTextColor, fontSize: fontSizes.base }]}>
                                {monthTitle}
                            </Text>
                            <Pressable
                                onPress={nextMonth}
                                style={({ pressed }) => [styles.monthButton, { backgroundColor: expandedButtonSurface }, pressed && styles.monthButtonPressed]}
                            >
                                <Feather name="chevron-right" size={18} color={expandedIconColor} strokeWidth={2.3} />
                            </Pressable>
                        </View>

                        <View style={styles.weekdays}>
                            {weekDays.map((day, index) => (
                                <Text
                                    key={`${day}-${index}`}
                                    style={[styles.weekdayText, { color: expandedMutedTextColor, fontSize: fontSizes.xs }]}
                                >
                                    {day}
                                </Text>
                            ))}
                        </View>

                        <View style={styles.daysGrid}>
                            {calendarWeeks.map((week, weekIndex) => (
                                <View key={`week-${weekIndex}`} style={styles.weekRow}>
                                    {week.map(({ date, isOutsideMonth }) => {
                                        const dayKey = getDayKey(date);
                                        return (
                                            <TextCalendarDay
                                                key={dayKey}
                                                date={date}
                                                isOutsideMonth={isOutsideMonth}
                                                isSelected={isSameDay(date, selectedDate)}
                                                isToday={isSameDay(date, new Date())}
                                                taskInfo={taskIndicatorByDay[dayKey]}
                                                onPress={() => handleDateSelect(date)}
                                            />
                                        );
                                    })}
                                </View>
                            ))}
                        </View>
                    </Squircle>
                </ReAnimated.View>
            </RNAnimated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 24,
    },
    topRow: {
        alignItems: "center",
        flexDirection: "row",
        gap: 10,
        justifyContent: "space-between",
        minHeight: 42,
    },
    titlePressable: {
        flex: 1,
        minWidth: 0,
    },
    titleRow: {
        alignItems: "center",
        alignSelf: "flex-start",
        flexDirection: "row",
        gap: 6,
        maxWidth: "100%",
        minHeight: 42,
    },
    dateTitle: {
        alignItems: "center",
        flexDirection: "row",
        flexShrink: 1,
        gap: 6,
        minWidth: 0,
    },
    title: {
        flexShrink: 1,
        letterSpacing: 0,
    },
    titleWeekday: {
        fontFamily: 'Satoshi-Bold'
    },
    titleDay: {
        fontFamily: 'Satoshi-Bold'
    },
    titleMonth: {
        fontFamily: 'Satoshi-Bold'
    },
    chevron: {
        alignItems: "center",
        height: 28,
        justifyContent: "center",
        width: 28,
    },
    chevronIcon: {
        alignItems: "center",
        height: 28,
        justifyContent: "center",
        width: 28,
    },
    todayClip: {
        height: 34,
        overflow: "hidden",
    },
    todayIconButton: {
        alignItems: "center",
        borderRadius: 999,
        height: 34,
        justifyContent: "center",
        width: 34,
    },
    todayPillPressed: {
        opacity: 0.72,
    },
    expandedClip: {
        borderRadius: 22,
        overflow: "hidden",
    },
    panel: {
        borderRadius: 20,
        borderWidth: StyleSheet.hairlineWidth,
        marginTop: EXPANDED_TOP_GAP,
        overflow: "hidden",
        paddingBottom: GRID_BOTTOM_PADDING,
        paddingHorizontal: 12,
        paddingTop : 6,
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
    },
    monthHeader: {
        alignItems: "center",
        borderBottomWidth: 1,
        flexDirection: "row",
        height: CALENDAR_HEADER_HEIGHT,
        justifyContent: "space-between",
    },
    monthButton: {
        alignItems: "center",
        borderRadius: 999,
        height: 34,
        justifyContent: "center",
        width: 34,
    },
    monthButtonPressed: {
        opacity: 0.72,
        transform: [{ scale: 0.96 }],
    },
    monthTitle: {
        fontFamily: "Satoshi-Bold",
    },
    weekdays: {
        alignItems: "center",
        flexDirection: "row",
        height: WEEKDAYS_HEIGHT,
    },
    weekdayText: {
        flex: 1,
        fontFamily: "Satoshi-Bold",
        textAlign: "center",
        textTransform: "uppercase",
    },
    daysGrid: {
        paddingBottom: 4,
    },
    weekRow: {
        flexDirection: "row",
        height: CALENDAR_ROW_HEIGHT,
    },
    dayCell: {
        alignItems: "center",
        borderColor: "transparent",
        borderRadius: 13,
        flex: 1,
        height: CALENDAR_ROW_HEIGHT - 4,
        justifyContent: "center",
        marginVertical: 2,
    },
    dayCellPressed: {
        opacity: 0.7,
        transform: [{ scale: 0.96 }],
    },
    dayNumber: {
        fontFamily: "Satoshi-Bold",
        lineHeight: 18,
    },
    taskDot: {
        borderRadius: 2.5,
        bottom: 5,
        height: 5,
        position: "absolute",
        width: 5,
    },
});
