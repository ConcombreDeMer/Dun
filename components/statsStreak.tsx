import {
  StatsDay,
  StatsPeriod,
  buildDaysBetween,
  buildDaysMap,
  normalizeDate,
} from "@/lib/calculateStats";
import { useFont } from "@/lib/FontContext";
import { useAppTranslation } from "@/lib/i18n";
import { useTheme } from "@/lib/ThemeContext";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import PagerView from "react-native-pager-view";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import Squircle from "./Squircle";

type StatsStreakProps = {
  activeSlideIndex: number;
  daysData: StatsDay[];
  onSlideIndexChange: (index: number) => void;
  period: StatsPeriod;
  value: string;
};

const ORANGE = "#FF8A2A";
const ORANGE_SOFT = "#FFE2C6";
const ORANGE_DARK = "#FF9A3D";
const ORANGE_SOFT_DARK = "#5A3A25";

type StreakSlide = {
  id: string;
  rangeEnd: Date;
  rangeStart: Date;
};

const isPerfectDay = (day: StatsDay) => {
  const total = Math.max(day.total || 0, 0);
  const done = Math.min(Math.max(day.done_count || 0, 0), total);

  return total > 0 && done === total;
};

const isCountedStreakDate = (date: Date, today: Date) => (
  normalizeDate(date).getTime() < today.getTime()
);

const getWeekStart = (date: Date) => {
  const d = normalizeDate(date);
  const dayOfWeek = d.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  d.setDate(d.getDate() - daysToMonday);
  return d;
};

const buildStreakSlides = (period: StatsPeriod, today: Date): StreakSlide[] => {
  if (period === "Par semaine") {
    const currentWeekStart = getWeekStart(today);

    return [-4, -3, -2, -1, 0].map((offset) => {
      const rangeStart = new Date(currentWeekStart);
      rangeStart.setDate(currentWeekStart.getDate() + offset * 7);
      const rangeEnd = new Date(rangeStart);
      rangeEnd.setDate(rangeStart.getDate() + 6);

      return {
        id: `week-${rangeStart.toISOString()}`,
        rangeEnd,
        rangeStart,
      };
    });
  }

  if (period === "Par mois") {
    return Array.from({ length: 13 }, (_, index) => {
      const monthOffset = index - 12;
      const rangeStart = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
      const rangeEnd = new Date(rangeStart.getFullYear(), rangeStart.getMonth() + 1, 0);

      return {
        id: `month-${rangeStart.getFullYear()}-${rangeStart.getMonth()}`,
        rangeEnd,
        rangeStart,
      };
    });
  }

  const startYear = today.getFullYear() - 1;

  return [startYear, today.getFullYear()].map((year) => ({
    id: `year-${year}`,
    rangeEnd: new Date(year, 11, 31),
    rangeStart: new Date(year, 0, 1),
  }));
};

const getGridColumns = (period: StatsPeriod, daysCount: number) => {
  if (period === "Par semaine") return 7;
  if (period === "Par mois") return Math.min(daysCount, 11);
  return 29;
};

const getGridMetrics = (period: StatsPeriod, columns: number, width: number) => {
  const preferredGap = period === "Par année" ? 3 : period === "Par mois" ? 8 : 10;
  const minimumCellSize = period === "Par année" ? 5 : period === "Par mois" ? 14 : 18;
  const safeColumns = Math.max(1, columns);
  const rawCellSize = (width - preferredGap * Math.max(0, safeColumns - 1)) / safeColumns;

  if (rawCellSize >= minimumCellSize) {
    return {
      cellSize: Math.floor(rawCellSize),
      gap: preferredGap,
    };
  }

  const cellSize = minimumCellSize;
  const gap = safeColumns > 1
    ? Math.max(2, (width - cellSize * safeColumns) / (safeColumns - 1))
    : 0;

  return {
    cellSize,
    gap,
  };
};

export default function StatsStreak({
  activeSlideIndex,
  daysData,
  onSlideIndexChange,
  period,
  value,
}: StatsStreakProps) {
  const router = useRouter();
  const pagerRef = useRef<PagerView>(null);
  const [gridWidth, setGridWidth] = useState(0);
  const animatedPagerHeight = useSharedValue(1);
  const { actualTheme, colors } = useTheme();
  const { fontSizes } = useFont();
  const { t } = useAppTranslation();
  const isDark = actualTheme === "dark";
  const perfectColor = isDark ? ORANGE_DARK : ORANGE;
  const missedColor = isDark ? ORANGE_SOFT_DARK : ORANGE_SOFT;
  const unavailableColor = colors.input;
  const daysMap = useMemo(() => buildDaysMap(daysData || []), [daysData]);
  const today = useMemo(() => normalizeDate(new Date()), []);
  const streakSlides = useMemo(() => buildStreakSlides(period, today), [period, today]);
  const safeSlideIndex = streakSlides.length > 0
    ? Math.min(Math.max(activeSlideIndex, 0), streakSlides.length - 1)
    : 0;

  const streakPages = useMemo(() => streakSlides.map((slide) => {
    const periodDays = buildDaysBetween(slide.rangeStart, slide.rangeEnd, daysMap);
    const visibleDays = periodDays.slice(0, period === "Par année" ? 366 : undefined);
    const countedStreakDays = visibleDays.filter((day) => (
      isCountedStreakDate(new Date(day.date), today)
    ));
    const perfectDaysCount = countedStreakDays.filter(isPerfectDay).length;
    const consistency = countedStreakDays.length > 0
      ? Math.round((perfectDaysCount / countedStreakDays.length) * 100)
      : 0;

    return {
      ...slide,
      consistency,
      countedStreakDaysCount: countedStreakDays.length,
      perfectDaysCount,
      visibleDays,
    };
  }), [daysMap, period, streakSlides, today]);

  const activePage = streakPages[safeSlideIndex];
  const columns = Math.max(1, getGridColumns(period, activePage?.visibleDays.length ?? 0));
  const hasMeasuredGrid = gridWidth > 0;
  const availableGridWidth = hasMeasuredGrid ? gridWidth : 1;
  const { cellSize, gap: gridGap } = getGridMetrics(period, columns, availableGridWidth);
  const rows = Math.max(1, Math.ceil((activePage?.visibleDays.length ?? 0) / columns));
  const pagerHeight = rows * cellSize + Math.max(0, rows - 1) * gridGap;
  const canGoPrevious = safeSlideIndex > 0;
  const canGoNext = safeSlideIndex < streakPages.length - 1;

  useEffect(() => {
    if (!hasMeasuredGrid) return;

    animatedPagerHeight.value = withTiming(pagerHeight, {
      duration: 680,
      easing: Easing.out(Easing.cubic),
    });
  }, [animatedPagerHeight, hasMeasuredGrid, pagerHeight]);

  useEffect(() => {
    if (!streakPages.length) return;
    pagerRef.current?.setPageWithoutAnimation(safeSlideIndex);
  }, [safeSlideIndex, streakPages.length]);

  const pagerHeightStyle = useAnimatedStyle(() => ({
    height: animatedPagerHeight.value,
    opacity: hasMeasuredGrid ? 1 : 0,
  }));

  const handleExplicationPress = () => {
    router.push("/stats/streakExplain");
  };

  const goToSlide = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= streakPages.length) return;
    pagerRef.current?.setPage(nextIndex);
    onSlideIndexChange(nextIndex);
  };

  return (
    <Squircle
      style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.header}>
        <View style={styles.streakValue}>
          <Image source={require("../assets/images/stats/streak/high.png")} style={styles.image} />
          <Text style={[styles.valueText, { color: colors.text, fontSize: fontSizes.xl }]}>
            {value}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            disabled={!canGoPrevious}
            onPress={() => goToSlide(safeSlideIndex - 1)}
            style={[styles.iconButton, { backgroundColor: colors.input, opacity: canGoPrevious ? 1 : 0.42 }]}
          >
            <SymbolView name="chevron.left" size={13} tintColor={colors.text} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={!canGoNext}
            onPress={() => goToSlide(safeSlideIndex + 1)}
            style={[styles.iconButton, { backgroundColor: colors.input, opacity: canGoNext ? 1 : 0.42 }]}
          >
            <SymbolView name="chevron.right" size={13} tintColor={colors.text} />
          </Pressable>
          <View style={[styles.scorePill, { backgroundColor: colors.input }]}>
            <Text style={[styles.scoreText, { color: colors.text, fontSize: fontSizes.sm }]}>
              {activePage?.consistency ?? 0}%
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Streak info"
            onPress={handleExplicationPress}
            style={[styles.infoButton, { backgroundColor: colors.input }]}
          >
            <SymbolView name="info.circle" size={14} tintColor={colors.text} />
          </Pressable>
        </View>
      </View>

      <View
        onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}
        style={styles.gridMeasure}
      >
        <Animated.View style={[styles.pagerClip, pagerHeightStyle]}>
          <PagerView
            ref={pagerRef}
            initialPage={safeSlideIndex}
            onPageSelected={(event) => onSlideIndexChange(event.nativeEvent.position)}
            style={styles.pager}
          >
            {streakPages.map((page) => (
              <View key={page.id} style={styles.page}>
                <View
                  style={[
                    styles.grid,
                    {
                      columnGap: gridGap,
                      rowGap: gridGap,
                      width: availableGridWidth,
                    },
                  ]}
                >
                  {page.visibleDays.map((day, index) => {
                    const dayDate = normalizeDate(new Date(day.date));
                    const isCounted = isCountedStreakDate(dayDate, today);
                    const isPerfect = isCounted && isPerfectDay(day);

                    return (
                      <View
                        key={`${day.date}-${index}`}
                        style={[
                          styles.cell,
                          {
                            backgroundColor: !isCounted ? unavailableColor : isPerfect ? perfectColor : missedColor,
                            borderRadius: period === "Par année" ? 3 : 7,
                            height: cellSize,
                            opacity: !isCounted ? 0.72 : 1,
                            width: cellSize,
                          },
                        ]}
                      />
                    );
                  })}
                </View>
              </View>
            ))}
          </PagerView>
        </Animated.View>
      </View>
      <Text style={[styles.caption, { color: colors.textSecondary, fontSize: fontSizes.xs }]}>
        {t("stats.general.cards.perfectDays")} {activePage?.perfectDaysCount ?? 0}/{activePage?.countedStreakDaysCount ?? 0}
      </Text>
    </Squircle>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "center",
    borderRadius: 20,
    borderWidth: 0.5,
    gap: 12,
    paddingHorizontal: 22,
    paddingVertical: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    width: "90%",
    boxShadow: "0px 6px 10px rgba(0, 0, 0, 0.1)",
  },
  caption: {
    fontFamily: "Satoshi-Medium",
    opacity: 0.72,
  },
  cell: {
    flexGrow: 0,
    flexShrink: 0,
  },
  grid: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  gridMeasure: {
    width: "100%",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
  },
  infoButton: {
    alignItems: "center",
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  iconButton: {
    alignItems: "center",
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  image: {
    height: 31,
    resizeMode: "contain",
    width: 31,
  },
  page: {
    alignItems: "center",
    justifyContent: "center",
  },
  pager: {
    flex: 1,
    height: "100%",
    width: "100%",
  },
  pagerClip: {
    overflow: "hidden",
    width: "100%",
  },
  scorePill: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  scoreText: {
    fontFamily: "Satoshi-Bold",
  },
  streakValue: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },
  valueText: {
    fontFamily: "Satoshi-Bold",
  },
});
